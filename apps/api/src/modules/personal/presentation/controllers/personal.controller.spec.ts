import { Test, TestingModule } from '@nestjs/testing';
import { ObtenerSesionActualUseCase } from '../../../seguridad/application/use-cases/obtener-sesion-actual.use-case';
import { ActorContextGuard } from '../../../seguridad/presentation/guards/actor-context.guard';
import { ListarPersonalQueryDto } from '../../application/dto/listar-personal-query.dto';
import { ActivarPersonalUseCase } from '../../application/use-cases/activar-personal.use-case';
import { ActualizarPersonalUseCase } from '../../application/use-cases/actualizar-personal.use-case';
import { CrearPersonalUseCase } from '../../application/use-cases/crear-personal.use-case';
import { DesactivarPersonalUseCase } from '../../application/use-cases/desactivar-personal.use-case';
import { ListarPersonalUseCase } from '../../application/use-cases/listar-personal.use-case';
import { ListarPersonalVinculableUsuarioUseCase } from '../../application/use-cases/listar-personal-vinculable-usuario.use-case';
import { ObtenerPersonalDetalleUseCase } from '../../application/use-cases/obtener-personal-detalle.use-case';
import { PersonalAccessPolicyService } from '../../application/use-cases/helpers/personal-access-policy.service';
import { PersonalController } from './personal.controller';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';

describe('PersonalController', () => {
  let controller: PersonalController;
  const actorMock = {
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
  } as UsuarioSesionResponseDto;

  const listarPersonalUseCaseMock = {
    execute: jest.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          codigoPersonal: 'PER-001',
          nombres: 'Ana Maria',
          apellidoPaterno: 'Rojas',
          apellidoMaterno: 'Lopez',
          documentoIdentidad: '1000001',
          idNivelCargo: 10,
          codigoNivelCargo: 'ENF-LIC',
          nombreNivelCargo: 'Licenciada en enfermeria',
          tieneAsignacionActiva: true,
          activo: true,
          nombreCompleto: 'Ana Maria Rojas Lopez',
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

  const listarPersonalVinculableUsuarioUseCaseMock = {
    execute: jest.fn(),
  };
  const obtenerPersonalDetalleUseCaseMock = {
    execute: jest.fn(),
  };
  const crearPersonalUseCaseMock = { execute: jest.fn() };
  const actualizarPersonalUseCaseMock = { execute: jest.fn() };
  const activarPersonalUseCaseMock = { execute: jest.fn() };
  const desactivarPersonalUseCaseMock = { execute: jest.fn() };
  const obtenerSesionActualUseCaseMock = { execute: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonalController],
      providers: [
        {
          provide: ListarPersonalUseCase,
          useValue: listarPersonalUseCaseMock,
        },
        {
          provide: ListarPersonalVinculableUsuarioUseCase,
          useValue: listarPersonalVinculableUsuarioUseCaseMock,
        },
        {
          provide: ObtenerPersonalDetalleUseCase,
          useValue: obtenerPersonalDetalleUseCaseMock,
        },
        {
          provide: CrearPersonalUseCase,
          useValue: crearPersonalUseCaseMock,
        },
        {
          provide: ActualizarPersonalUseCase,
          useValue: actualizarPersonalUseCaseMock,
        },
        {
          provide: ActivarPersonalUseCase,
          useValue: activarPersonalUseCaseMock,
        },
        {
          provide: DesactivarPersonalUseCase,
          useValue: desactivarPersonalUseCaseMock,
        },
        {
          provide: ObtenerSesionActualUseCase,
          useValue: obtenerSesionActualUseCaseMock,
        },
        PersonalAccessPolicyService,
        ActorContextGuard,
      ],
    }).compile();

    controller = module.get<PersonalController>(PersonalController);
  });

  it('should return a collection wrapper with meta total', async () => {
    const query = new ListarPersonalQueryDto();

    await expect(controller.listar(actorMock, query)).resolves.toEqual({
      data: [
        {
          id: 1,
          codigoPersonal: 'PER-001',
          nombres: 'Ana Maria',
          apellidoPaterno: 'Rojas',
          apellidoMaterno: 'Lopez',
          documentoIdentidad: '1000001',
          idNivelCargo: 10,
          codigoNivelCargo: 'ENF-LIC',
          nombreNivelCargo: 'Licenciada en enfermeria',
          tieneAsignacionActiva: true,
          activo: true,
          nombreCompleto: 'Ana Maria Rojas Lopez',
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
});
