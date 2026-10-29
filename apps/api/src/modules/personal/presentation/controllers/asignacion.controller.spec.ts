import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ListarAsignacionesQueryDto } from '../../application/dto/listar-asignaciones-query.dto';
import { AsignacionController } from './asignacion.controller';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'actor.test',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'actor.test',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 1,
      codigo: 'JEFE_SERVICIO',
      nombre: 'Jefe de servicio',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SERVICIO',
    puedeGestionarPlanificacion: false,
    puedeGestionarTodo: false,
    permisos: {
      puedeVerOrganizacion: false,
      puedeVerPersonal: false,
      puedeGestionarPersonal: false,
      puedeVerAsignaciones: true,
      puedeGestionarAsignaciones: false,
      puedeVerSeguridad: false,
      puedeGestionarUsuarios: false,
      puedeVerOperacion: true,
      puedeVerPlanificacion: true,
      puedeEditarPlanificacion: true,
      puedeAprobarPlanificacion: false,
      puedeVerReportes: false,
    },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

describe('AsignacionController', () => {
  const listarAsignacionesUseCaseMock = {
    execute: jest.fn().mockResolvedValue({ data: [], meta: { total: 0 } }),
  };
  const crearAsignacionUseCaseMock = { execute: jest.fn() };
  const actualizarAsignacionUseCaseMock = { execute: jest.fn() };
  const moverAsignacionUseCaseMock = { execute: jest.fn() };
  const cerrarAsignacionUseCaseMock = { execute: jest.fn() };
  const obtenerConflictoPlanificacionAsignacionUseCaseMock = {
    execute: jest.fn(),
  };

  const controller = new AsignacionController(
    listarAsignacionesUseCaseMock as never,
    crearAsignacionUseCaseMock as never,
    actualizarAsignacionUseCaseMock as never,
    moverAsignacionUseCaseMock as never,
    cerrarAsignacionUseCaseMock as never,
    obtenerConflictoPlanificacionAsignacionUseCaseMock as never,
  );

  beforeEach(() => {
    listarAsignacionesUseCaseMock.execute.mockClear();
  });

  it('no acota la query para un actor de alcance SISTEMA', async () => {
    const actor = buildActor({
      rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
      alcancePlanificacion: 'SISTEMA',
      puedeGestionarTodo: true,
    });
    const query = new ListarAsignacionesQueryDto();
    query.activo = false;

    await controller.listar(actor, query);

    expect(listarAsignacionesUseCaseMock.execute).toHaveBeenCalledWith(query);
  });

  it('fuerza el servicio del actor y activo=true para un jefe de servicio, ignorando otros parametros', async () => {
    const actor = buildActor({
      serviciosGestionables: [
        {
          id: 10,
          idDepartamento: 5,
          codigo: 'URG',
          nombre: 'Urgencias',
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
        },
      ],
    });
    const query = new ListarAsignacionesQueryDto();
    query.idServicio = 999;
    query.idDepartamento = 5;
    query.activo = false;

    await controller.listar(actor, query);

    const queryPasada = (
      listarAsignacionesUseCaseMock.execute.mock
        .calls as unknown as ListarAsignacionesQueryDto[][]
    )[0][0];
    expect(queryPasada.idServicioNormalizado).toBe(10);
    expect(queryPasada.idDepartamentoNormalizado).toBeUndefined();
    expect(queryPasada.activo).toBe(true);
  });

  it('fuerza el departamento del actor y activo=true para un jefe de departamento', async () => {
    const actor = buildActor({
      rolSeguridad: {
        id: 2,
        codigo: 'JEFE_DEPARTAMENTO',
        nombre: 'Jefe de departamento',
      },
      alcancePlanificacion: 'DEPARTAMENTO',
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
    });
    const query = new ListarAsignacionesQueryDto();
    query.idDepartamento = 999;
    query.activo = false;

    await controller.listar(actor, query);

    const queryPasada = (
      listarAsignacionesUseCaseMock.execute.mock
        .calls as unknown as ListarAsignacionesQueryDto[][]
    )[0][0];
    expect(queryPasada.idDepartamentoNormalizado).toBe(5);
    expect(queryPasada.activo).toBe(true);
  });

  it('no expone todas las asignaciones si el actor no tiene departamentos ni servicios gestionables', async () => {
    const actor = buildActor({ serviciosGestionables: [] });
    const query = new ListarAsignacionesQueryDto();

    await controller.listar(actor, query);

    const queryPasada = (
      listarAsignacionesUseCaseMock.execute.mock
        .calls as unknown as ListarAsignacionesQueryDto[][]
    )[0][0];
    expect(queryPasada.idServicioNormalizado).toBe(-1);
  });
});
