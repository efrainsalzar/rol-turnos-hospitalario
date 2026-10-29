import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { Usuario } from '../../../seguridad/domain/entities/usuario';
import type { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import type { AsignacionConsulta } from '../../domain/entities/asignacion-consulta';
import type { PersonalRepository } from '../../domain/repositories/personal.repository';
import { MoverAsignacionDto } from '../dto/mover-asignacion.dto';
import type { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';
import { MoverAsignacionUseCase } from './mover-asignacion.use-case';

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
  overrides: Partial<MoverAsignacionDto> = {},
): MoverAsignacionDto {
  return {
    idServicio: 20,
    idRolFuncional: 2,
    idTipoContrato: 1,
    idCargaHoraria: 1,
    motivo: 'Reasignacion operativa por necesidad del servicio.',
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
    anterior?: AsignacionConsulta | null;
    movida?: AsignacionConsulta;
    usuario?: Usuario | null;
  } = {},
) {
  const assertPuedeModificar = jest.fn().mockResolvedValue(undefined);
  const obtenerAsignacionPorId = jest
    .fn()
    .mockResolvedValue(
      overrides.anterior === undefined ? buildAsignacion() : overrides.anterior,
    );
  const moverAsignacion = jest
    .fn()
    .mockResolvedValue(overrides.movida ?? buildAsignacion({ idServicio: 20 }));
  const obtenerPorPersonal = jest
    .fn()
    .mockResolvedValue(
      overrides.usuario === undefined ? null : overrides.usuario,
    );
  const activarUsuario = jest.fn().mockResolvedValue(undefined);
  const desactivarUsuario = jest.fn().mockResolvedValue(undefined);

  const personalRepository = {
    obtenerAsignacionPorId,
    moverAsignacion,
  } as unknown as PersonalRepository;

  const accessPolicy = {
    assertPuedeModificar,
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
    assertPuedeModificar,
    obtenerAsignacionPorId,
    moverAsignacion,
    obtenerPorPersonal,
    activarUsuario,
    desactivarUsuario,
  };
}

describe('MoverAsignacionUseCase', () => {
  it('valida permisos con el mismo policy que editar (assertPuedeModificar), no con el de cerrar', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      assertPuedeModificar,
      moverAsignacion,
    } = buildDependencias();
    const useCase = new MoverAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(assertPuedeModificar).toHaveBeenCalledWith(
      buildActor(),
      900,
      buildInput(),
    );
    expect(moverAsignacion).toHaveBeenCalled();
  });

  it('pasa idUsuarioOperacion del actor y el motivo recibido al repositorio', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      moverAsignacion,
    } = buildDependencias();
    const useCase = new MoverAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor({ id: 7 }), 900, buildInput());

    expect(moverAsignacion).toHaveBeenCalledWith(
      900,
      expect.objectContaining({
        idUsuarioOperacion: 7,
        motivo: 'Reasignacion operativa por necesidad del servicio.',
      }),
    );
  });

  it('reactiva el usuario cuando el movimiento deja a la persona como jefatura', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      activarUsuario,
    } = buildDependencias({
      anterior: buildAsignacion({ esJefaturaRolFuncional: false }),
      movida: buildAsignacion({
        idServicio: 20,
        esJefaturaRolFuncional: true,
        codigoRolFuncional: 'JEFE_SERVICIO',
      }),
      usuario: buildUsuario({ id: 50, activo: false }),
    });
    const useCase = new MoverAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(activarUsuario).toHaveBeenCalledWith(50);
  });

  it('desactiva el usuario cuando el movimiento retira a la persona de la jefatura', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      desactivarUsuario,
    } = buildDependencias({
      anterior: buildAsignacion({ esJefaturaRolFuncional: true }),
      movida: buildAsignacion({
        idServicio: 20,
        esJefaturaRolFuncional: false,
        codigoRolFuncional: 'ASISTENCIAL',
      }),
      usuario: buildUsuario({ id: 50, activo: true }),
    });
    const useCase = new MoverAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(desactivarUsuario).toHaveBeenCalledWith(50);
  });

  it('no toca el usuario si el estatus de jefatura no cambia', async () => {
    const {
      personalRepository,
      accessPolicy,
      usuarioRepository,
      activarUsuario,
      desactivarUsuario,
      obtenerPorPersonal,
    } = buildDependencias({
      anterior: buildAsignacion({ esJefaturaRolFuncional: false }),
      movida: buildAsignacion({
        idServicio: 20,
        esJefaturaRolFuncional: false,
      }),
    });
    const useCase = new MoverAsignacionUseCase(
      personalRepository,
      accessPolicy,
      usuarioRepository,
    );

    await useCase.execute(buildActor(), 900, buildInput());

    expect(activarUsuario).not.toHaveBeenCalled();
    expect(desactivarUsuario).not.toHaveBeenCalled();
    expect(obtenerPorPersonal).not.toHaveBeenCalled();
  });
});
