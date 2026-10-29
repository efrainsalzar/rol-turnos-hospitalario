import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ActorContextGuard } from '../../../seguridad/presentation/guards/actor-context.guard';
import { ObtenerSesionActualUseCase } from '../../../seguridad/application/use-cases/obtener-sesion-actual.use-case';
import { ListarTurnosQueryDto } from '../../application/dto/listar-turnos-query.dto';
import { ActualizarTurnoUseCase } from '../../application/use-cases/actualizar-turno.use-case';
import { ActivarTurnoUseCase } from '../../application/use-cases/activar-turno.use-case';
import { CrearTurnoUseCase } from '../../application/use-cases/crear-turno.use-case';
import { DesactivarTurnoUseCase } from '../../application/use-cases/desactivar-turno.use-case';
import { ListarTurnosUseCase } from '../../application/use-cases/listar-turnos.use-case';
import { ObtenerTurnoPorIdUseCase } from '../../application/use-cases/obtener-turno-por-id.use-case';
import { ObtenerImpactoUsoTurnoUseCase } from '../../application/use-cases/obtener-impacto-uso-turno.use-case';
import { TurnoController } from './turno.controller';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'actor.test',
    tipoUsuario: 'INTERNO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: null,
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 2,
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
      puedeVerAsignaciones: false,
      puedeGestionarAsignaciones: false,
      puedeVerSeguridad: false,
      puedeGestionarUsuarios: false,
      puedeVerOperacion: true,
      puedeVerPlanificacion: true,
      puedeVerReportes: false,
      puedeEditarPlanificacion: true,
      puedeAprobarPlanificacion: false,
    },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

describe('TurnoController', () => {
  let controller: TurnoController;

  const listarTurnosUseCaseMock = {
    execute: jest.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          idServicio: 2,
          codigoServicio: 'SRV-URG',
          nombreServicio: 'Urgencias',
          idTipoTurno: 3,
          codigoTipoTurno: 'N',
          nombreTipoTurno: 'Noche',
          codigo: 'TUR-URG-N',
          nombre: 'Urgencias noche',
          horaInicio: '20:00',
          horaFin: '08:00',
          cruzaMedianoche: true,
          duracionHoras: 12,
          vigenciaDesde: '2026-01-01T00:00:00.000Z',
          vigenciaHasta: null,
          activo: true,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        hasMore: false,
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurnoController],
      providers: [
        {
          provide: ListarTurnosUseCase,
          useValue: listarTurnosUseCaseMock,
        },
        {
          provide: ObtenerTurnoPorIdUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: CrearTurnoUseCase, useValue: { execute: jest.fn() } },
        { provide: ActualizarTurnoUseCase, useValue: { execute: jest.fn() } },
        { provide: ActivarTurnoUseCase, useValue: { execute: jest.fn() } },
        { provide: DesactivarTurnoUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ObtenerImpactoUsoTurnoUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ActorContextGuard, useValue: { canActivate: jest.fn() } },
        {
          provide: ObtenerSesionActualUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TurnoController>(TurnoController);
  });

  afterEach(() => {
    listarTurnosUseCaseMock.execute.mockClear();
  });

  function lastQuery(): ListarTurnosQueryDto {
    return (
      listarTurnosUseCaseMock.execute.mock
        .calls as unknown as ListarTurnosQueryDto[][]
    )[0][0];
  }

  it('should return a collection wrapper for turnos', async () => {
    const actor = buildActor({
      rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
      alcancePlanificacion: 'SISTEMA',
      puedeGestionarTodo: true,
    });
    const query = new ListarTurnosQueryDto();

    await expect(controller.listar(actor, query)).resolves.toEqual({
      data: [
        {
          id: 1,
          idServicio: 2,
          codigoServicio: 'SRV-URG',
          nombreServicio: 'Urgencias',
          idTipoTurno: 3,
          codigoTipoTurno: 'N',
          nombreTipoTurno: 'Noche',
          codigo: 'TUR-URG-N',
          nombre: 'Urgencias noche',
          horaInicio: '20:00',
          horaFin: '08:00',
          cruzaMedianoche: true,
          duracionHoras: 12,
          vigenciaDesde: '2026-01-01T00:00:00.000Z',
          vigenciaHasta: null,
          activo: true,
        },
      ],
      meta: {
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        hasMore: false,
      },
    });
  });

  it('no acota la query para un actor de alcance SISTEMA', async () => {
    const actor = buildActor({
      rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
      alcancePlanificacion: 'SISTEMA',
      puedeGestionarTodo: true,
    });
    const query = new ListarTurnosQueryDto();
    query.id_departamento = 999;

    await controller.listar(actor, query);

    expect(lastQuery()).toBe(query);
  });

  it('fuerza su unico servicio para un jefe de servicio sin filtro elegido', async () => {
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
    const query = new ListarTurnosQueryDto();

    await controller.listar(actor, query);

    expect(lastQuery().id_servicio).toBe(10);
    expect(lastQuery().id_departamento).toBeUndefined();
  });

  it('rechaza a un jefe de servicio que pide un servicio fuera de su alcance', async () => {
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
    const query = new ListarTurnosQueryDto();
    query.id_servicio = 999;

    await expect(controller.listar(actor, query)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('muestra todo el departamento (no solo el primer servicio) para un jefe de departamento sin filtro elegido', async () => {
    const actor = buildActor({
      rolSeguridad: {
        id: 3,
        codigo: 'JEFE_DEPARTAMENTO',
        nombre: 'Jefe de departamento',
      },
      alcancePlanificacion: 'DEPARTAMENTO',
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
      serviciosGestionables: [
        {
          id: 10,
          idDepartamento: 5,
          codigo: 'URG',
          nombre: 'Urgencias',
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
        },
        {
          id: 11,
          idDepartamento: 5,
          codigo: 'CIR',
          nombre: 'Cirugia',
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
        },
      ],
    });
    const query = new ListarTurnosQueryDto();

    await controller.listar(actor, query);

    expect(lastQuery().id_departamento).toBe(5);
    expect(lastQuery().id_servicio).toBeUndefined();
  });

  it('permite a un jefe de departamento acotar a un servicio puntual de su departamento', async () => {
    const actor = buildActor({
      rolSeguridad: {
        id: 3,
        codigo: 'JEFE_DEPARTAMENTO',
        nombre: 'Jefe de departamento',
      },
      alcancePlanificacion: 'DEPARTAMENTO',
      departamentosGestionables: [
        { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
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
    const query = new ListarTurnosQueryDto();
    query.id_servicio = 10;

    await controller.listar(actor, query);

    expect(lastQuery().id_servicio).toBe(10);
    expect(lastQuery().id_departamento).toBeUndefined();
  });

  it('no expone todos los turnos si el actor no tiene departamentos ni servicios gestionables', async () => {
    const actor = buildActor({ serviciosGestionables: [] });
    const query = new ListarTurnosQueryDto();

    await controller.listar(actor, query);

    expect(lastQuery().id_servicio).toBe(-1);
  });
});
