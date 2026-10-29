import { Test, TestingModule } from '@nestjs/testing';
import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import { ListarRolesUseCase } from '../../application/use-cases/listar-roles.use-case';
import { CrearRolSeguridadUseCase } from '../../application/use-cases/crear-rol-seguridad.use-case';
import { ActualizarRolSeguridadUseCase } from '../../application/use-cases/actualizar-rol-seguridad.use-case';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { ActorContextGuard } from '../guards/actor-context.guard';
import { RolSeguridadController } from './rol-seguridad.controller';

describe('RolSeguridadController', () => {
  let controller: RolSeguridadController;

  const listarRolesUseCaseMock = {
    execute: jest.fn().mockResolvedValue([
      {
        id: 1,
        codigo: 'ADMIN_SISTEMA',
        nombre: 'Administrador del sistema',
        activo: true,
      },
    ]),
  };
  const obtenerSesionActualUseCaseMock = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolSeguridadController],
      providers: [
        {
          provide: ListarRolesUseCase,
          useValue: listarRolesUseCaseMock,
        },
        {
          provide: CrearRolSeguridadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ActualizarRolSeguridadUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: RolSeguridadRepository,
          useValue: {
            crear: jest.fn(),
            actualizar: jest.fn(),
            activar: jest.fn(),
            desactivar: jest.fn(),
            listar: jest.fn(),
          },
        },
        {
          provide: ObtenerSesionActualUseCase,
          useValue: obtenerSesionActualUseCaseMock,
        },
        {
          provide: ActorContextGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<RolSeguridadController>(RolSeguridadController);
  });

  it('should return a collection wrapper with meta total', async () => {
    await expect(
      controller.listar({
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
          nombre: 'Administrador',
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
      }),
    ).resolves.toEqual({
      data: [
        {
          id: 1,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador del sistema',
          activo: true,
        },
      ],
      meta: {
        total: 1,
      },
    });
  });
});
