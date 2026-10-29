import { ConflictException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { Usuario } from '../../../seguridad/domain/entities/usuario';
import type { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import type { AsignacionConsulta } from '../../domain/entities/asignacion-consulta';
import type { Personal } from '../../domain/entities/personal';
import type { PersonalRepository } from '../../domain/repositories/personal.repository';
import { CrearAsignacionDto } from '../dto/crear-asignacion.dto';
import type { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';
import { CrearAsignacionUseCase } from './crear-asignacion.use-case';

function buildPersonal(overrides: Partial<Personal> = {}): Personal {
  return {
    id: 100,
    codigoPersonal: 'ENF-002',
    nombres: 'Ana',
    apellidoPaterno: 'Perez',
    apellidoMaterno: null,
    documentoIdentidad: '1234567',
    idNivelCargo: 1,
    codigoNivelCargo: null,
    nombreNivelCargo: null,
    tieneAsignacionActiva: false,
    activo: true,
    ...overrides,
  };
}

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto> = {},
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'jefe.departamento.enfermeria',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'jefe.departamento.enfermeria',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 1,
      codigo: 'JEFE_DEPARTAMENTO',
      nombre: 'Jefe de departamento',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'DEPARTAMENTO',
    puedeGestionarPlanificacion: false,
    puedeGestionarTodo: false,
    permisos: {
      puedeVerOrganizacion: true,
      puedeVerPersonal: true,
      puedeGestionarPersonal: false,
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
    departamentosGestionables: [{ id: 5, codigo: 'ENF', nombre: 'Enfermeria' }],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<CrearAsignacionDto> = {},
): CrearAsignacionDto {
  return {
    idPersonal: 100,
    idTipoContrato: 1,
    idCargaHoraria: 1,
    idRolFuncional: 2,
    tipoAsignacion: 'SECUNDARIA',
    fechaInicio: '2026-07-01',
    ...overrides,
  };
}

function buildAsignacionCreada(
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
    tipoAsignacion: 'SECUNDARIA',
    fechaInicio: new Date('2026-07-01'),
    fechaFin: null,
    activo: true,
    tieneUsuario: false,
    ...overrides,
  };
}

function buildUsuario(overrides: Partial<Usuario> = {}): Usuario {
  return {
    id: 50,
    username: 'ana.rojas',
    activo: false,
    ...overrides,
  } as Usuario;
}

function buildDependencias(
  overrides: {
    asignacionCreada?: AsignacionConsulta;
    usuario?: Usuario | null;
    personal?: Personal | null;
  } = {},
) {
  const assertPuedeCrear = jest.fn().mockResolvedValue(undefined);
  const crearAsignacion = jest
    .fn()
    .mockResolvedValue(overrides.asignacionCreada ?? buildAsignacionCreada());
  const obtenerJefaturaActivaEnUnidad = jest.fn().mockResolvedValue(null);
  const cerrarAsignacion = jest.fn().mockResolvedValue(undefined);
  const obtenerPorPersonal = jest
    .fn()
    .mockResolvedValue(
      overrides.usuario === undefined ? null : overrides.usuario,
    );
  const activarUsuario = jest.fn().mockResolvedValue(undefined);
  const desactivarUsuario = jest.fn().mockResolvedValue(undefined);
  const obtenerPorId = jest
    .fn()
    .mockResolvedValue(
      overrides.personal === undefined ? buildPersonal() : overrides.personal,
    );

  const personalRepository = {
    crearAsignacion,
    obtenerJefaturaActivaEnUnidad,
    cerrarAsignacion,
    obtenerPorId,
  } as unknown as PersonalRepository;

  const accessPolicy = {
    assertPuedeCrear,
  } as unknown as AsignacionAccessPolicyService;

  const usuarioRepository = {
    obtenerPorPersonal,
    activar: activarUsuario,
    desactivar: desactivarUsuario,
  } as unknown as UsuarioRepository;

  return {
    personalRepository,
    accessPolicy,
    usuarioRepository,
    crearAsignacion,
    obtenerPorPersonal,
    obtenerPorId,
    activarUsuario,
    desactivarUsuario,
  };
}

describe('CrearAsignacionUseCase — reactivacion de usuario ligada a jefatura', () => {
  it('reactiva el usuario inactivo cuando la nueva asignacion es de jefatura', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      activarUsuario,
    } = buildDependencias({
      asignacionCreada: buildAsignacionCreada({
        esJefaturaRolFuncional: true,
        codigoRolFuncional: 'JEFE_SERVICIO',
      }),
      usuario: buildUsuario({ id: 50, activo: false }),
    });
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), buildInput({ idRolFuncional: 2 }));

    expect(activarUsuario).toHaveBeenCalledWith(50);
  });

  it('no reactiva un usuario que ya estaba activo (evita escritura innecesaria)', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      activarUsuario,
    } = buildDependencias({
      asignacionCreada: buildAsignacionCreada({ esJefaturaRolFuncional: true }),
      usuario: buildUsuario({ id: 50, activo: true }),
    });
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), buildInput());

    expect(activarUsuario).not.toHaveBeenCalled();
  });

  it('no falla si la persona no tiene ningun usuario vinculado', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      activarUsuario,
    } = buildDependencias({
      asignacionCreada: buildAsignacionCreada({ esJefaturaRolFuncional: true }),
      usuario: null,
    });
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await expect(
      useCase.execute(buildActor(), buildInput()),
    ).resolves.toBeDefined();
    expect(activarUsuario).not.toHaveBeenCalled();
  });

  it('REGRESION (comportamiento esperado, no un bug): NO reactiva el usuario cuando la nueva asignacion es asistencial, aunque la persona ya tenga un usuario inactivo — el usuario solo se activa automaticamente para jefaturas', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      activarUsuario,
      obtenerPorPersonal,
    } = buildDependencias({
      asignacionCreada: buildAsignacionCreada({
        esJefaturaRolFuncional: false,
        codigoRolFuncional: 'ASISTENCIAL',
      }),
      usuario: buildUsuario({ id: 50, activo: false }),
    });
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), buildInput({ idRolFuncional: 1 }));

    expect(activarUsuario).not.toHaveBeenCalled();
    // Ni siquiera se consulta el usuario cuando la asignacion no es jefatura.
    expect(obtenerPorPersonal).not.toHaveBeenCalled();
  });
});

describe('CrearAsignacionUseCase — sin atajo de reemplazo automatico de jefatura', () => {
  it('REGRESION: nombrar jefatura en una unidad con jefe activo nunca cierra la jefatura existente desde este use case, ni para Administracion del sistema — el flujo correcto es siempre en dos pasos manuales separados (docs/database/decisiones-tecnicas.md seccion 55)', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      crearAsignacion,
    } = buildDependencias();
    const obtenerJefaturaActivaEnUnidad = jest.fn();
    const cerrarAsignacion = jest.fn();
    (
      personalRepository as unknown as {
        obtenerJefaturaActivaEnUnidad: typeof obtenerJefaturaActivaEnUnidad;
        cerrarAsignacion: typeof cerrarAsignacion;
      }
    ).obtenerJefaturaActivaEnUnidad = obtenerJefaturaActivaEnUnidad;
    (
      personalRepository as unknown as {
        cerrarAsignacion: typeof cerrarAsignacion;
      }
    ).cerrarAsignacion = cerrarAsignacion;
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    const actorSistema = buildActor({
      alcancePlanificacion: 'SISTEMA',
      puedeGestionarTodo: true,
    });

    await useCase.execute(actorSistema, buildInput({ idServicio: 10 }));

    expect(obtenerJefaturaActivaEnUnidad).not.toHaveBeenCalled();
    expect(cerrarAsignacion).not.toHaveBeenCalled();
    // El flujo normal de creacion sigue adelante: si el servicio ya tiene
    // jefe, es assertCanPersistAssignment (en el repositorio) quien lo
    // bloquea con el 409 estandar, no este use case.
    expect(crearAsignacion).toHaveBeenCalled();
  });
});

describe('CrearAsignacionUseCase — rechaza asignaciones a personal dado de baja', () => {
  it('lanza ConflictException y no crea la asignacion cuando el personal esta inactivo', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      crearAsignacion,
    } = buildDependencias({
      personal: buildPersonal({
        activo: false,
        nombres: 'Ana',
        apellidoPaterno: 'Perez',
        apellidoMaterno: null,
      }),
    });
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await expect(
      useCase.execute(buildActor(), buildInput()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(crearAsignacion).not.toHaveBeenCalled();
  });

  it('permite crear la asignacion cuando el personal esta activo', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      crearAsignacion,
    } = buildDependencias({
      personal: buildPersonal({ activo: true }),
    });
    const useCase = new CrearAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), buildInput());

    expect(crearAsignacion).toHaveBeenCalled();
  });
});
