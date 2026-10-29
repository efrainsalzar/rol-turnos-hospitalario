import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import type { Usuario } from '../../../seguridad/domain/entities/usuario';
import type { PersonalDetalle } from '../../domain/entities/personal-detalle';
import type { AsignacionConsulta } from '../../domain/entities/asignacion-consulta';
import type { PersonalRepository } from '../../domain/repositories/personal.repository';
import { DesactivarPersonalUseCase } from './desactivar-personal.use-case';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto> = {},
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'rrhh.sistema',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'rrhh.sistema',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: { id: 1, codigo: 'RRHH', nombre: 'Recursos humanos' },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SISTEMA',
    puedeGestionarPlanificacion: false,
    puedeGestionarTodo: true,
    permisos: {
      puedeVerOrganizacion: true,
      puedeVerPersonal: true,
      puedeGestionarPersonal: true,
      puedeVerAsignaciones: true,
      puedeGestionarAsignaciones: true,
      puedeVerSeguridad: false,
      puedeGestionarUsuarios: false,
      puedeVerOperacion: false,
      puedeVerPlanificacion: false,
      puedeEditarPlanificacion: false,
      puedeAprobarPlanificacion: false,
      puedeVerReportes: false,
    },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildAsignacion(overrides: Partial<AsignacionConsulta> = {}) {
  return { id: 900, ...overrides } as AsignacionConsulta;
}

function buildDetalle(
  asignacionesVigentes: AsignacionConsulta[] = [],
): PersonalDetalle {
  return { asignacionesVigentes } as PersonalDetalle;
}

function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 50,
    username: 'ana.rojas',
    activo: true,
    ...overrides,
  } as Usuario;
}

function buildRepositorios(
  overrides: {
    detalle?: PersonalDetalle | null;
    usuario?: Usuario | null;
  } = {},
) {
  const obtenerDetalle = jest
    .fn()
    .mockResolvedValue(
      overrides.detalle === undefined ? buildDetalle() : overrides.detalle,
    );
  const cerrarAsignacion = jest.fn().mockResolvedValue(buildAsignacion());
  const desactivarPersonal = jest.fn().mockResolvedValue(undefined);
  const obtenerPorPersonal = jest
    .fn()
    .mockResolvedValue(
      overrides.usuario === undefined ? null : overrides.usuario,
    );
  const desactivarUsuario = jest.fn().mockResolvedValue(undefined);

  const personalRepository = {
    obtenerDetalle,
    cerrarAsignacion,
    desactivarPersonal,
  } as unknown as PersonalRepository;

  const usuarioRepository = {
    obtenerPorPersonal,
    desactivar: desactivarUsuario,
  } as unknown as UsuarioRepository;

  return {
    personalRepository,
    usuarioRepository,
    obtenerDetalle,
    cerrarAsignacion,
    desactivarPersonal,
    obtenerPorPersonal,
    desactivarUsuario,
  };
}

describe('DesactivarPersonalUseCase', () => {
  it('rechaza a un actor sin permiso de gestionar personal', async () => {
    const { personalRepository, usuarioRepository, obtenerDetalle } =
      buildRepositorios();
    const useCase = new DesactivarPersonalUseCase(
      personalRepository,
      usuarioRepository,
    );
    const actor = buildActor({
      permisos: { ...buildActor().permisos, puedeGestionarPersonal: false },
    });

    await expect(useCase.execute(actor, 1)).rejects.toThrow(ForbiddenException);
    expect(obtenerDetalle).not.toHaveBeenCalled();
  });

  it('lanza NotFoundException si el personal no existe', async () => {
    const { personalRepository, usuarioRepository } = buildRepositorios({
      detalle: null,
    });
    const useCase = new DesactivarPersonalUseCase(
      personalRepository,
      usuarioRepository,
    );

    await expect(useCase.execute(buildActor(), 999)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sin asignaciones vigentes ni usuario vinculado, solo desactiva el personal', async () => {
    const {
      personalRepository,
      usuarioRepository,
      cerrarAsignacion,
      desactivarPersonal,
      desactivarUsuario,
    } = buildRepositorios({ detalle: buildDetalle([]), usuario: null });
    const useCase = new DesactivarPersonalUseCase(
      personalRepository,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 1);

    expect(cerrarAsignacion).not.toHaveBeenCalled();
    expect(desactivarPersonal).toHaveBeenCalledWith(1);
    expect(desactivarUsuario).not.toHaveBeenCalled();
  });

  it('REGRESION: cierra en cascada cada asignacion vigente en vez de bloquear la baja', async () => {
    // Antes del fix, DesactivarPersonalUseCase lanzaba ConflictException si
    // detalle.asignacionesVigentes.length > 0 y exigia cerrarlas a mano antes.
    const asignacionUrgencias = buildAsignacion({ id: 900 });
    const asignacionSecundaria = buildAsignacion({ id: 901 });
    const {
      personalRepository,
      usuarioRepository,
      cerrarAsignacion,
      desactivarPersonal,
    } = buildRepositorios({
      detalle: buildDetalle([asignacionUrgencias, asignacionSecundaria]),
      usuario: null,
    });
    const useCase = new DesactivarPersonalUseCase(
      personalRepository,
      usuarioRepository,
    );

    await useCase.execute(buildActor({ id: 7 }), 1);

    expect(cerrarAsignacion).toHaveBeenCalledTimes(2);
    expect(cerrarAsignacion).toHaveBeenNthCalledWith(
      1,
      900,
      expect.objectContaining({
        regularizarPlanificacionesAbiertas: true,
        idUsuarioOperacion: 7,
      }),
    );
    expect(cerrarAsignacion).toHaveBeenNthCalledWith(
      2,
      901,
      expect.objectContaining({
        regularizarPlanificacionesAbiertas: true,
        idUsuarioOperacion: 7,
      }),
    );
    expect(desactivarPersonal).toHaveBeenCalledWith(1);
  });

  it('desactiva el usuario vinculado si existe y esta activo, sin importar si la asignacion era jefatura', async () => {
    const { personalRepository, usuarioRepository, desactivarUsuario } =
      buildRepositorios({
        detalle: buildDetalle([]),
        usuario: buildUsuario({ id: 50, activo: true }),
      });
    const useCase = new DesactivarPersonalUseCase(
      personalRepository,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 1);

    expect(desactivarUsuario).toHaveBeenCalledWith(50);
  });

  it('no vuelve a desactivar un usuario que ya estaba inactivo (evita escritura innecesaria)', async () => {
    const { personalRepository, usuarioRepository, desactivarUsuario } =
      buildRepositorios({
        detalle: buildDetalle([]),
        usuario: buildUsuario({ id: 50, activo: false }),
      });
    const useCase = new DesactivarPersonalUseCase(
      personalRepository,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 1);

    expect(desactivarUsuario).not.toHaveBeenCalled();
  });
});
