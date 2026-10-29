import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { Usuario } from '../../../seguridad/domain/entities/usuario';
import type { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import type { AsignacionConsulta } from '../../domain/entities/asignacion-consulta';
import type { PersonalRepository } from '../../domain/repositories/personal.repository';
import { CerrarAsignacionDto } from '../dto/cerrar-asignacion.dto';
import type { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';
import { CerrarAsignacionUseCase } from './cerrar-asignacion.use-case';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto> = {},
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'admin.sistema',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'admin.sistema',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 1,
      codigo: 'ADMIN_SISTEMA',
      nombre: 'Administrador del sistema',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SISTEMA',
    puedeGestionarPlanificacion: true,
    puedeGestionarTodo: true,
    permisos: {
      puedeVerOrganizacion: true,
      puedeVerPersonal: true,
      puedeGestionarPersonal: true,
      puedeVerAsignaciones: true,
      puedeGestionarAsignaciones: true,
      puedeVerSeguridad: true,
      puedeGestionarUsuarios: true,
      puedeVerOperacion: true,
      puedeVerPlanificacion: true,
      puedeEditarPlanificacion: true,
      puedeAprobarPlanificacion: true,
      puedeVerReportes: true,
    },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<CerrarAsignacionDto> = {},
): CerrarAsignacionDto {
  return {
    motivo: 'Retiro de prueba unitaria.',
    ...overrides,
  };
}

function buildAsignacion(
  overrides: Partial<AsignacionConsulta> = {},
): AsignacionConsulta {
  return {
    id: 900,
    idPersonal: 100,
    codigoPersonal: 'ENF-002',
    ci: '1234567',
    apellidoPaterno: 'Perez',
    apellidoMaterno: null,
    nombres: 'Ana',
    nombreCompleto: 'Ana Perez',
    idServicio: 10,
    codigoServicio: 'URG',
    nombreServicio: 'Urgencias',
    idDepartamento: 5,
    codigoDepartamento: 'ENF',
    nombreDepartamento: 'Enfermeria',
    nombreNivelCargo: null,
    idTipoContrato: 1,
    codigoTipoContrato: null,
    nombreTipoContrato: null,
    idRolFuncional: 2,
    codigoRolFuncional: 'ASISTENCIAL',
    nombreRolFuncional: 'Asistencial',
    esJefaturaRolFuncional: false,
    codigoFuenteItem: null,
    idCargaHoraria: null,
    codigoCargaHoraria: null,
    nombreCargaHoraria: null,
    nroItem: null,
    tipoAsignacion: 'PRINCIPAL',
    fechaInicio: new Date('2026-01-01'),
    fechaFin: new Date('2026-07-12'),
    activo: false,
    tieneUsuario: false,
    ...overrides,
  };
}

function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 50,
    username: 'ana.rojas',
    activo: true,
    ...overrides,
  } as Usuario;
}

function buildDependencias(
  overrides: {
    cerrada?: AsignacionConsulta;
    usuario?: Usuario | null;
  } = {},
) {
  const assertPuedeCerrar = jest.fn();
  const cerrarAsignacion = jest
    .fn()
    .mockResolvedValue(overrides.cerrada ?? buildAsignacion());
  const obtenerPorPersonal = jest
    .fn()
    .mockResolvedValue(
      overrides.usuario === undefined ? null : overrides.usuario,
    );
  const desactivarUsuario = jest.fn().mockResolvedValue(undefined);

  const personalRepository = {
    cerrarAsignacion,
  } as unknown as PersonalRepository;

  const accessPolicy = {
    assertPuedeCerrar,
  } as unknown as AsignacionAccessPolicyService;

  const usuarioRepository = {
    obtenerPorPersonal,
    desactivar: desactivarUsuario,
  } as unknown as UsuarioRepository;

  return {
    personalRepository,
    accessPolicy,
    usuarioRepository,
    assertPuedeCerrar,
    cerrarAsignacion,
    obtenerPorPersonal,
    desactivarUsuario,
  };
}

describe('CerrarAsignacionUseCase', () => {
  it('valida permisos con assertPuedeCerrar antes de cerrar', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      assertPuedeCerrar,
      cerrarAsignacion,
    } = buildDependencias();
    const useCase = new CerrarAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(assertPuedeCerrar).toHaveBeenCalledWith(buildActor());
    expect(cerrarAsignacion).toHaveBeenCalled();
  });

  it('desactiva el usuario vinculado cuando la asignacion cerrada era jefatura', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      desactivarUsuario,
      obtenerPorPersonal,
    } = buildDependencias({
      cerrada: buildAsignacion({
        esJefaturaRolFuncional: true,
        codigoRolFuncional: 'JEFE_SERVICIO',
      }),
      usuario: buildUsuario({ id: 50, activo: true }),
    });
    const useCase = new CerrarAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(obtenerPorPersonal).toHaveBeenCalledWith(100);
    expect(desactivarUsuario).toHaveBeenCalledWith(50);
  });

  it('no toca el usuario si la asignacion cerrada no era jefatura', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      desactivarUsuario,
      obtenerPorPersonal,
    } = buildDependencias({
      cerrada: buildAsignacion({ esJefaturaRolFuncional: false }),
    });
    const useCase = new CerrarAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(obtenerPorPersonal).not.toHaveBeenCalled();
    expect(desactivarUsuario).not.toHaveBeenCalled();
  });

  it('no intenta desactivar si el usuario vinculado ya estaba inactivo', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      desactivarUsuario,
    } = buildDependencias({
      cerrada: buildAsignacion({ esJefaturaRolFuncional: true }),
      usuario: buildUsuario({ id: 50, activo: false }),
    });
    const useCase = new CerrarAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(desactivarUsuario).not.toHaveBeenCalled();
  });

  it('pasa idUsuarioOperacion del actor y regulariza segun el flag recibido', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      cerrarAsignacion,
    } = buildDependencias();
    const useCase = new CerrarAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(
      buildActor({ id: 7 }),
      900,
      buildInput({ regularizarPlanificacionesAbiertas: true }),
    );

    expect(cerrarAsignacion).toHaveBeenCalledWith(
      900,
      expect.objectContaining({
        idUsuarioOperacion: 7,
        regularizarPlanificacionesAbiertas: true,
      }),
    );
  });
});
