import { Test, TestingModule } from '@nestjs/testing';
import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import { ActivarUsuarioUseCase } from '../../application/use-cases/activar-usuario.use-case';
import { ActualizarUsuarioUseCase } from '../../application/use-cases/actualizar-usuario.use-case';
import { CambiarMiPasswordUseCase } from '../../application/use-cases/cambiar-mi-password.use-case';
import { CrearUsuarioUseCase } from '../../application/use-cases/crear-usuario.use-case';
import { DesactivarUsuarioUseCase } from '../../application/use-cases/desactivar-usuario.use-case';
import { ListarUsuariosUseCase } from '../../application/use-cases/listar-usuarios.use-case';
import { ActorContextGuard } from '../guards/actor-context.guard';
import { UsuarioController } from './usuario.controller';

describe('UsuarioController', () => {
  let controller: UsuarioController;

  const listarUsuariosUseCaseMock = {
    execute: jest.fn().mockResolvedValue([
      {
        id: 1,
        username: 'luis.perez',
        tipoUsuario: 'PERSONAL',
        proveedorAutenticacion: 'LOCAL',
        sujetoAutenticacion: 'luis.perez',
        identidadLocalHabilitada: true,
        activo: true,
        rolSeguridad: {
          id: 4,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        personal: {
          id: 2,
          codigoPersonal: 'PER-002',
          nombreCompleto: 'Luis Fernando Perez Gutierrez',
        },
      },
    ]),
  };
  const crearUsuarioUseCaseMock = { execute: jest.fn() };
  const actualizarUsuarioUseCaseMock = { execute: jest.fn() };
  const cambiarMiPasswordUseCaseMock = { execute: jest.fn() };
  const activarUsuarioUseCaseMock = { execute: jest.fn() };
  const desactivarUsuarioUseCaseMock = { execute: jest.fn() };
  const obtenerSesionActualUseCaseMock = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioController],
      providers: [
        {
          provide: ListarUsuariosUseCase,
          useValue: listarUsuariosUseCaseMock,
        },
        {
          provide: CrearUsuarioUseCase,
          useValue: crearUsuarioUseCaseMock,
        },
        {
          provide: ActualizarUsuarioUseCase,
          useValue: actualizarUsuarioUseCaseMock,
        },
        {
          provide: CambiarMiPasswordUseCase,
          useValue: cambiarMiPasswordUseCaseMock,
        },
        {
          provide: ActivarUsuarioUseCase,
          useValue: activarUsuarioUseCaseMock,
        },
        {
          provide: DesactivarUsuarioUseCase,
          useValue: desactivarUsuarioUseCaseMock,
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

    controller = module.get<UsuarioController>(UsuarioController);
  });

  it('should return a collection wrapper without secret fields', async () => {
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
          username: 'luis.perez',
          tipoUsuario: 'PERSONAL',
          proveedorAutenticacion: 'LOCAL',
          sujetoAutenticacion: 'luis.perez',
          identidadLocalHabilitada: true,
          activo: true,
          rolSeguridad: {
            id: 4,
            codigo: 'JEFE_SERVICIO',
            nombre: 'Jefe de servicio',
          },
          personal: {
            id: 2,
            codigoPersonal: 'PER-002',
            nombreCompleto: 'Luis Fernando Perez Gutierrez',
          },
        },
      ],
      meta: {
        total: 1,
      },
    });
  });
});
