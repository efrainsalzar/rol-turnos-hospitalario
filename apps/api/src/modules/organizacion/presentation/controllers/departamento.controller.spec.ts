import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { normalizeCapacidadesOperativas } from '../../../seguridad/domain/entities/usuario-capacidades';
import { ObtenerSesionActualUseCase } from '../../../seguridad/application/use-cases/obtener-sesion-actual.use-case';
import { ActorContextGuard } from '../../../seguridad/presentation/guards/actor-context.guard';
import { GuardarDepartamentoDto } from '../../application/dto/guardar-departamento.dto';
import { ListarDepartamentosUseCase } from '../../application/use-cases/listar-departamentos.use-case';
import { ListarServiciosPorDepartamentoUseCase } from '../../application/use-cases/listar-servicios-por-departamento.use-case';
import { DepartamentoRepository } from '../../domain/repositories/departamento.repository';
import { DepartamentoController } from './departamento.controller';

describe('DepartamentoController', () => {
  let controller: DepartamentoController;

  const listarDepartamentosUseCaseMock = {
    execute: jest.fn().mockResolvedValue([
      {
        id: 1,
        codigo: 'DEP-01',
        nombre: 'Emergencias',
        activo: true,
      },
    ]),
  };

  const listarServiciosPorDepartamentoUseCaseMock = {
    execute: jest.fn(),
  };

  const departamentoRepositoryMock = {
    crear: jest.fn(),
    actualizar: jest.fn(),
    activar: jest.fn(),
    desactivar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartamentoController],
      providers: [
        {
          provide: ActorContextGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: ObtenerSesionActualUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ListarDepartamentosUseCase,
          useValue: listarDepartamentosUseCaseMock,
        },
        {
          provide: ListarServiciosPorDepartamentoUseCase,
          useValue: listarServiciosPorDepartamentoUseCaseMock,
        },
        {
          provide: DepartamentoRepository,
          useValue: departamentoRepositoryMock,
        },
      ],
    }).compile();

    controller = module.get<DepartamentoController>(DepartamentoController);
  });

  it('should return a collection wrapper with meta total', async () => {
    const actor: UsuarioSesionResponseDto = {
      id: 1,
      username: 'admin.sistema',
      tipoUsuario: 'INTERNO',
      proveedorAutenticacion: 'LOCAL',
      sujetoAutenticacion: null,
      identidadLocalHabilitada: true,
      activo: true,
      rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
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
    };

    await expect(controller.listar(actor)).resolves.toEqual({
      data: [
        {
          id: 1,
          codigo: 'DEP-01',
          nombre: 'Emergencias',
          activo: true,
        },
      ],
      meta: {
        total: 1,
      },
    });
  });

  describe('alcance de listar() empujado a la consulta', () => {
    beforeEach(() => {
      listarDepartamentosUseCaseMock.execute.mockClear();
    });

    it('no pasa restriccion cuando el actor tiene alcance de sistema', async () => {
      const actorSistema: UsuarioSesionResponseDto = {
        id: 1,
        username: 'admin.sistema',
        tipoUsuario: 'INTERNO',
        proveedorAutenticacion: 'LOCAL',
        sujetoAutenticacion: null,
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
      };

      await controller.listar(actorSistema);

      expect(listarDepartamentosUseCaseMock.execute).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('pasa los ids gestionables cuando el actor tiene alcance de departamento', async () => {
      const actorJefeDepartamento: UsuarioSesionResponseDto = {
        id: 2,
        username: 'jefe.enfermeria',
        tipoUsuario: 'INTERNO',
        proveedorAutenticacion: 'LOCAL',
        sujetoAutenticacion: null,
        identidadLocalHabilitada: true,
        activo: true,
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_DEPARTAMENTO',
          nombre: 'Jefe de Departamento',
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
          puedeVerOperacion: true,
          puedeVerPlanificacion: true,
          puedeEditarPlanificacion: false,
          puedeAprobarPlanificacion: true,
          puedeVerReportes: true,
        },
        departamentosGestionables: [
          { id: 1, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [],
      };

      await controller.listar(actorJefeDepartamento);

      expect(listarDepartamentosUseCaseMock.execute).toHaveBeenCalledWith([1]);
    });

    it('pasa los departamentos derivados de los servicios gestionables cuando el actor tiene alcance de servicio', async () => {
      const actorJefeServicio: UsuarioSesionResponseDto = {
        id: 3,
        username: 'jefe.urgencias',
        tipoUsuario: 'INTERNO',
        proveedorAutenticacion: 'LOCAL',
        sujetoAutenticacion: null,
        identidadLocalHabilitada: true,
        activo: true,
        rolSeguridad: {
          id: 3,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de Servicio',
        },
        personal: { id: null, codigoPersonal: null, nombreCompleto: null },
        alcancePlanificacion: 'SERVICIO',
        puedeGestionarPlanificacion: false,
        puedeGestionarTodo: false,
        permisos: {
          puedeVerOrganizacion: true,
          puedeVerPersonal: true,
          puedeGestionarPersonal: false,
          puedeVerAsignaciones: true,
          puedeGestionarAsignaciones: false,
          puedeVerSeguridad: false,
          puedeGestionarUsuarios: false,
          puedeVerOperacion: true,
          puedeVerPlanificacion: true,
          puedeEditarPlanificacion: false,
          puedeAprobarPlanificacion: false,
          puedeVerReportes: true,
        },
        departamentosGestionables: [],
        serviciosGestionables: [
          {
            id: 10,
            idDepartamento: 1,
            codigo: 'URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'ENF',
            nombreDepartamento: 'Enfermeria',
          },
        ],
      };

      await controller.listar(actorJefeServicio);

      expect(listarDepartamentosUseCaseMock.execute).toHaveBeenCalledWith([1]);
    });
  });

  describe('alcance por departamento en actualizar/desactivar/activar', () => {
    const jefeDepartamentoActor: UsuarioSesionResponseDto = {
      id: 2,
      username: 'jefe.enfermeria',
      tipoUsuario: 'INTERNO',
      proveedorAutenticacion: 'LOCAL',
      sujetoAutenticacion: null,
      identidadLocalHabilitada: true,
      activo: true,
      rolSeguridad: {
        id: 2,
        codigo: 'JEFE_DEPARTAMENTO',
        nombre: 'Jefe de Departamento',
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
        puedeVerOperacion: true,
        puedeVerPlanificacion: true,
        puedeEditarPlanificacion: false,
        puedeAprobarPlanificacion: true,
        puedeVerReportes: true,
      },
      capacidades: normalizeCapacidadesOperativas({ gestionarServicios: true }),
      departamentosGestionables: [
        { id: 1, codigo: 'ENF', nombre: 'Enfermeria' },
      ],
      serviciosGestionables: [],
    };

    const body: GuardarDepartamentoDto = {
      codigo: 'ENF',
      nombre: 'Enfermeria actualizada',
    };

    beforeEach(() => {
      departamentoRepositoryMock.actualizar.mockReset();
      departamentoRepositoryMock.activar.mockReset();
      departamentoRepositoryMock.desactivar.mockReset();
    });

    it('permite actualizar un departamento dentro del alcance gestionable', async () => {
      await controller.actualizar(jefeDepartamentoActor, 1, body);

      expect(departamentoRepositoryMock.actualizar).toHaveBeenCalledWith(
        1,
        body,
      );
    });

    it('rechaza actualizar/desactivar/activar un departamento fuera de alcance', async () => {
      await expect(
        controller.actualizar(jefeDepartamentoActor, 99, body),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        controller.desactivar(jefeDepartamentoActor, 99),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        controller.activar(jefeDepartamentoActor, 99),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(departamentoRepositoryMock.actualizar).not.toHaveBeenCalled();
      expect(departamentoRepositoryMock.desactivar).not.toHaveBeenCalled();
      expect(departamentoRepositoryMock.activar).not.toHaveBeenCalled();
    });
  });
});
