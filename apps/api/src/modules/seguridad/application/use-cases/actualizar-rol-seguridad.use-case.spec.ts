import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import type { GuardarRolSeguridadDto } from '../dto/guardar-rol-seguridad.dto';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { ActualizarRolSeguridadUseCase } from './actualizar-rol-seguridad.use-case';

const permisosFalse = {
  puedeVerOrganizacion: false,
  puedeVerPersonal: false,
  puedeGestionarPersonal: false,
  puedeVerAsignaciones: false,
  puedeGestionarAsignaciones: false,
  puedeVerSeguridad: false,
  puedeGestionarUsuarios: false,
  puedeVerOperacion: false,
  puedeVerPlanificacion: false,
  puedeEditarPlanificacion: false,
  puedeAprobarPlanificacion: false,
  puedeVerReportes: false,
};

const capacidadesFalse = {
  verCalendarios: false,
  gestionarCalendarios: false,
  verIncidenciasPersonales: false,
  gestionarIncidenciasPersonales: false,
  gestionarTiposFeriado: false,
  verCargasHorarias: false,
  gestionarCargasHorarias: false,
  verTurnos: false,
  crearPlanificacion: false,
  editarPlanificacion: false,
  enviarRevisionPlanificacion: false,
  volverBorradorPlanificacion: false,
  aprobarPlanificacion: false,
  cerrarPlanificacion: false,
  exportarPlanificacion: false,
  exportarPlanificacionLote: false,
  gestionarCodigosOperativos: false,
  gestionarTurnos: false,
  gestionarServicios: false,
};

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'admin.sistema',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'admin.sistema',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SISTEMA',
    puedeGestionarPlanificacion: true,
    puedeGestionarTodo: true,
    permisos: { ...permisosFalse, puedeGestionarUsuarios: true },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<GuardarRolSeguridadDto> = {},
): GuardarRolSeguridadDto {
  return {
    codigo: 'ROL_EXISTENTE',
    nombre: 'RolSeguridad existente',
    alcancePlanificacion: 'SERVICIO',
    permisos: permisosFalse,
    capacidades: capacidadesFalse,
    ...overrides,
  };
}

describe('ActualizarRolSeguridadUseCase', () => {
  it('permite a ADMIN_SISTEMA actualizar un rolSeguridad de cualquier alcance', async () => {
    const rolSeguridadRepository = {
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 5,
        codigo: 'JEFE_SERVICIO',
        alcancePlanificacion: 'SERVICIO',
      }),
      actualizar: jest.fn().mockResolvedValue({ id: 5 }),
    } as unknown as RolSeguridadRepository;
    const useCase = new ActualizarRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({});

    await expect(
      useCase.execute(actor, 5, buildInput()),
    ).resolves.toBeDefined();
  });

  it('lanza NotFoundException si el rolSeguridad no existe', async () => {
    const rolSeguridadRepository = {
      obtenerPorId: jest.fn().mockResolvedValue(null),
    } as unknown as RolSeguridadRepository;
    const useCase = new ActualizarRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({});

    await expect(
      useCase.execute(actor, 999, buildInput()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('REGRESION: rechaza a un actor sin puedeGestionarUsuarios', async () => {
    const obtenerPorIdMock = jest.fn();
    const rolSeguridadRepository = {
      obtenerPorId: obtenerPorIdMock,
      actualizar: jest.fn(),
    } as unknown as RolSeguridadRepository;
    const useCase = new ActualizarRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({
      rolSeguridad: { id: 3, codigo: 'JEFE_DEPARTAMENTO', nombre: 'Jefe' },
      alcancePlanificacion: 'DEPARTAMENTO',
      permisos: permisosFalse,
    });

    await expect(
      useCase.execute(actor, 5, buildInput()),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(obtenerPorIdMock).not.toHaveBeenCalled();
  });

  it('REGRESION: rechaza tocar un rolSeguridad cuyo alcance actual esta por encima del alcance del actor', async () => {
    const actualizarMock = jest.fn();
    const rolSeguridadRepository = {
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 2,
        codigo: 'ADMIN_SISTEMA',
        alcancePlanificacion: 'SISTEMA',
      }),
      actualizar: actualizarMock,
    } as unknown as RolSeguridadRepository;
    const useCase = new ActualizarRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({
      rolSeguridad: { id: 3, codigo: 'JEFE_DEPARTAMENTO', nombre: 'Jefe' },
      alcancePlanificacion: 'DEPARTAMENTO',
      permisos: { ...permisosFalse, puedeGestionarUsuarios: true },
    });

    await expect(
      useCase.execute(
        actor,
        2,
        buildInput({ alcancePlanificacion: 'SERVICIO' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(actualizarMock).not.toHaveBeenCalled();
  });

  it('REGRESION: rechaza escalar el alcance de un rolSeguridad por encima del propio alcance del actor', async () => {
    const actualizarMock = jest.fn();
    const rolSeguridadRepository = {
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 5,
        codigo: 'JEFE_SERVICIO',
        alcancePlanificacion: 'SERVICIO',
      }),
      actualizar: actualizarMock,
    } as unknown as RolSeguridadRepository;
    const useCase = new ActualizarRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({
      rolSeguridad: { id: 3, codigo: 'JEFE_DEPARTAMENTO', nombre: 'Jefe' },
      alcancePlanificacion: 'DEPARTAMENTO',
      permisos: { ...permisosFalse, puedeGestionarUsuarios: true },
    });

    await expect(
      useCase.execute(
        actor,
        5,
        buildInput({ alcancePlanificacion: 'DEPARTAMENTO' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(actualizarMock).not.toHaveBeenCalled();
  });
});
