import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { UsuarioSesionResponseDto } from '../../modules/seguridad/application/dto/usuario-sesion-response.dto';
import { ObtenerSesionActualUseCase } from '../../modules/seguridad/application/use-cases/obtener-sesion-actual.use-case';
import { ActorContextGuard } from '../../modules/seguridad/presentation/guards/actor-context.guard';
import { DatabaseHealthController } from './database-health.controller';
import {
  DatabaseHealthResponse,
  DatabaseReadinessResponse,
  DatabaseService,
} from './database.service';

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

describe('DatabaseHealthController', () => {
  let controller: DatabaseHealthController;

  const databaseHealthResponse: DatabaseHealthResponse = {
    status: 'ok',
    server: 'localhost\\SQLEXPRESS',
    database: 'roles_turnos_demo',
    dialect: 'mssql',
    details: {
      sqlServerVersion: 'SQL Server',
      currentDatabase: 'roles_turnos_demo',
      systemUser: 'usuario_prueba',
      currentUser: 'dbo',
    },
  };

  const databaseReadinessResponse: DatabaseReadinessResponse = {
    status: 'ok',
    server: 'localhost\\SQLEXPRESS',
    database: 'roles_turnos_demo',
    dialect: 'mssql',
    details: {
      currentDatabase: 'roles_turnos_demo',
      hasSchemaMigrationTable: true,
      appliedMigrations: 8,
      baselineTableCount: 26,
    },
  };

  const databaseServiceMock = {
    getHealthSnapshot: jest.fn<Promise<DatabaseHealthResponse>, []>(),
    getReadinessSnapshot: jest.fn<Promise<DatabaseReadinessResponse>, []>(),
  };

  beforeEach(async () => {
    databaseServiceMock.getHealthSnapshot.mockResolvedValue(
      databaseHealthResponse,
    );
    databaseServiceMock.getReadinessSnapshot.mockResolvedValue(
      databaseReadinessResponse,
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseHealthController],
      providers: [
        {
          provide: DatabaseService,
          useValue: databaseServiceMock,
        },
        {
          provide: ObtenerSesionActualUseCase,
          useValue: { execute: jest.fn() },
        },
        ActorContextGuard,
      ],
    }).compile();

    controller = module.get<DatabaseHealthController>(DatabaseHealthController);
  });

  it('should return a live response without hitting the database', () => {
    const result = controller.getLiveStatus();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('roles-turnos-api');
    expect(result.timestamp).toBeDefined();
  });

  it('should return app status', () => {
    const result = controller.getAppStatus();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('roles-turnos-api');
    expect(result.environment).toBeDefined();
    expect(result.timestamp).toBeDefined();
  });

  it('should delegate readiness validation to DatabaseService for an actor that can manage users', async () => {
    const actor = buildActor({});

    await expect(controller.getReadinessStatus(actor)).resolves.toEqual(
      databaseReadinessResponse,
    );
    expect(databaseServiceMock.getReadinessSnapshot).toHaveBeenCalledTimes(1);
  });

  it('should delegate database health to DatabaseService for an actor that can manage users', async () => {
    const actor = buildActor({});

    await expect(controller.getDatabaseHealth(actor)).resolves.toEqual(
      databaseHealthResponse,
    );
    expect(databaseServiceMock.getHealthSnapshot).toHaveBeenCalledTimes(1);
  });

  it('REGRESION: rechaza el detalle tecnico de readiness a un actor sin puedeGestionarUsuarios', () => {
    // /health/ready y /health/database no tenian ningun guard: cualquiera sin
    // sesion podia consultar version de SQL Server, usuarios del sistema y
    // nombre de servidor. Ahora requieren el mismo permiso que ya gateaba el
    // item de menu "Health" en el frontend.
    const actor = buildActor({
      permisos: {
        puedeGestionarUsuarios: false,
      } as UsuarioSesionResponseDto['permisos'],
    });

    expect(() => controller.getReadinessStatus(actor)).toThrow(
      ForbiddenException,
    );
  });

  it('REGRESION: rechaza el detalle tecnico de la base de datos a un actor sin puedeGestionarUsuarios', () => {
    const actor = buildActor({
      permisos: {
        puedeGestionarUsuarios: false,
      } as UsuarioSesionResponseDto['permisos'],
    });

    expect(() => controller.getDatabaseHealth(actor)).toThrow(
      ForbiddenException,
    );
  });
});
