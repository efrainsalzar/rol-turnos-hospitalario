import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { normalizeCapacidadesOperativas } from '../../../seguridad/domain/entities/usuario-capacidades';
import { ObtenerSesionActualUseCase } from '../../../seguridad/application/use-cases/obtener-sesion-actual.use-case';
import { ActorContextGuard } from '../../../seguridad/presentation/guards/actor-context.guard';
import { GuardarServicioDto } from '../../application/dto/guardar-servicio.dto';
import { ListarServiciosQueryDto } from '../../application/dto/listar-servicios-query.dto';
import { ObtenerServicioDetalleUseCase } from '../../application/use-cases/obtener-servicio-detalle.use-case';
import { ListarServiciosUseCase } from '../../application/use-cases/listar-servicios.use-case';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';
import { ServicioController } from './servicio.controller';

describe('ServicioController', () => {
  let controller: ServicioController;

  const listarServiciosUseCaseMock = {
    execute: jest.fn().mockResolvedValue([
      {
        id: 10,
        idDepartamento: 1,
        codigoDepartamento: 'ENF',
        nombreDepartamento: 'Enfermeria',
        codigo: 'SRV-01',
        nombre: 'Urgencias',
        cantidadPersonalActivo: 4,
        activo: true,
      },
    ]),
  };

  const obtenerServicioDetalleUseCaseMock = {
    execute: jest.fn(),
  };

  const servicioRepositoryMock = {
    crear: jest.fn(),
    actualizar: jest.fn(),
    activar: jest.fn(),
    desactivar: jest.fn(),
    obtenerPorId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicioController],
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
          provide: ListarServiciosUseCase,
          useValue: listarServiciosUseCaseMock,
        },
        {
          provide: ObtenerServicioDetalleUseCase,
          useValue: obtenerServicioDetalleUseCaseMock,
        },
        {
          provide: ServicioRepository,
          useValue: servicioRepositoryMock,
        },
      ],
    }).compile();

    controller = module.get<ServicioController>(ServicioController);
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
    const query = new ListarServiciosQueryDto();

    await expect(controller.listar(actor, query)).resolves.toEqual({
      data: [
        {
          id: 10,
          idDepartamento: 1,
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
          codigo: 'SRV-01',
          nombre: 'Urgencias',
          cantidadPersonalActivo: 4,
          activo: true,
        },
      ],
      meta: {
        total: 1,
      },
    });
  });

  describe('alcance por departamento en crear/actualizar/desactivar/activar', () => {
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

    const bodyEnDepartamentoPropio: GuardarServicioDto = {
      idDepartamento: 1,
      codigo: 'SRV-02',
      nombre: 'Cuidados intensivos',
      tipoServicio: 'SERVICIO',
    };

    const bodyEnOtroDepartamento: GuardarServicioDto = {
      idDepartamento: 99,
      codigo: 'SRV-99',
      nombre: 'Servicio ajeno',
      tipoServicio: 'SERVICIO',
    };

    beforeEach(() => {
      servicioRepositoryMock.crear.mockReset();
      servicioRepositoryMock.actualizar.mockReset();
      servicioRepositoryMock.activar.mockReset();
      servicioRepositoryMock.desactivar.mockReset();
      servicioRepositoryMock.obtenerPorId.mockReset();
    });

    it('permite crear un servicio dentro del departamento gestionable', async () => {
      servicioRepositoryMock.crear.mockResolvedValue({ id: 20 });

      await controller.crear(jefeDepartamentoActor, bodyEnDepartamentoPropio);

      expect(servicioRepositoryMock.crear).toHaveBeenCalledWith(
        bodyEnDepartamentoPropio,
      );
    });

    it('rechaza crear un servicio en un departamento fuera de alcance', async () => {
      await expect(
        controller.crear(jefeDepartamentoActor, bodyEnOtroDepartamento),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(servicioRepositoryMock.crear).not.toHaveBeenCalled();
    });

    it('rechaza actualizar un servicio existente que pertenece a otro departamento', async () => {
      servicioRepositoryMock.obtenerPorId.mockResolvedValue({
        id: 30,
        idDepartamento: 99,
      });

      await expect(
        controller.actualizar(
          jefeDepartamentoActor,
          30,
          bodyEnDepartamentoPropio,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(servicioRepositoryMock.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza actualizar un servicio propio si el nuevo departamento esta fuera de alcance', async () => {
      servicioRepositoryMock.obtenerPorId.mockResolvedValue({
        id: 30,
        idDepartamento: 1,
      });

      await expect(
        controller.actualizar(
          jefeDepartamentoActor,
          30,
          bodyEnOtroDepartamento,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(servicioRepositoryMock.actualizar).not.toHaveBeenCalled();
    });

    it('rechaza desactivar/activar un servicio que pertenece a otro departamento', async () => {
      servicioRepositoryMock.obtenerPorId.mockResolvedValue({
        id: 40,
        idDepartamento: 99,
      });

      await expect(
        controller.desactivar(jefeDepartamentoActor, 40),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        controller.activar(jefeDepartamentoActor, 40),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(servicioRepositoryMock.desactivar).not.toHaveBeenCalled();
      expect(servicioRepositoryMock.activar).not.toHaveBeenCalled();
    });
  });

  describe('alcance de listar() empujado a la consulta', () => {
    beforeEach(() => {
      listarServiciosUseCaseMock.execute.mockClear();
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
      const query = new ListarServiciosQueryDto();

      await controller.listar(actorSistema, query);

      expect(listarServiciosUseCaseMock.execute).toHaveBeenCalledWith(
        query,
        {},
      );
    });

    it('pasa los departamentos gestionables y soloActivos=true cuando el actor tiene alcance de departamento', async () => {
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
      const query = new ListarServiciosQueryDto();

      await controller.listar(actorJefeDepartamento, query);

      expect(listarServiciosUseCaseMock.execute).toHaveBeenCalledWith(query, {
        idsDepartamentoPermitidos: [1],
        soloActivos: true,
      });
    });

    it('pasa los servicios gestionables y soloActivos=true cuando el actor tiene alcance de servicio', async () => {
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
          puedeVerReportes: false,
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
      const query = new ListarServiciosQueryDto();

      await controller.listar(actorJefeServicio, query);

      expect(listarServiciosUseCaseMock.execute).toHaveBeenCalledWith(query, {
        idsServicioPermitidos: [10],
        soloActivos: true,
      });
    });

    it('pasa una restriccion imposible (lista vacia) cuando el actor no tiene ningun alcance', async () => {
      const actorSinAlcance: UsuarioSesionResponseDto = {
        id: 4,
        username: 'sin.alcance',
        tipoUsuario: 'INTERNO',
        proveedorAutenticacion: 'LOCAL',
        sujetoAutenticacion: null,
        identidadLocalHabilitada: true,
        activo: true,
        rolSeguridad: {
          id: 4,
          codigo: 'SIN_ALCANCE',
          nombre: 'Sin alcance',
        },
        personal: { id: null, codigoPersonal: null, nombreCompleto: null },
        alcancePlanificacion: 'LECTURA',
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
          puedeVerOperacion: false,
          puedeVerPlanificacion: false,
          puedeEditarPlanificacion: false,
          puedeAprobarPlanificacion: false,
          puedeVerReportes: false,
        },
        departamentosGestionables: [],
        serviciosGestionables: [],
      };
      const query = new ListarServiciosQueryDto();

      await controller.listar(actorSinAlcance, query);

      expect(listarServiciosUseCaseMock.execute).toHaveBeenCalledWith(query, {
        idsServicioPermitidos: [],
      });
    });
  });
});
