import { Test, TestingModule } from '@nestjs/testing';
import { ActorContextGuard } from '../../../seguridad/presentation/guards/actor-context.guard';
import { ObtenerSesionActualUseCase } from '../../../seguridad/application/use-cases/obtener-sesion-actual.use-case';
import { ActualizarIncidenciaPersonalUseCase } from '../../application/use-cases/actualizar-incidencia-personal.use-case';
import { CrearIncidenciaPersonalUseCase } from '../../application/use-cases/crear-incidencia-personal.use-case';
import { DesactivarIncidenciaPersonalUseCase } from '../../application/use-cases/desactivar-incidencia-personal.use-case';
import { ListarIncidenciasPersonalesUseCase } from '../../application/use-cases/listar-incidencias-personales.use-case';
import { ObtenerImpactoUsoIncidenciaPersonalUseCase } from '../../application/use-cases/obtener-impacto-uso-incidencia-personal.use-case';
import { IncidenciaPersonalController } from './incidencia-personal.controller';

describe('IncidenciaPersonalController', () => {
  let controller: IncidenciaPersonalController;

  const listarIncidenciasPersonalesUseCaseMock = {
    execute: jest.fn().mockResolvedValue([
      {
        id: 1,
        codigo: 'DESCANSO',
        nombre: 'Descanso',
        descripcion: 'Dia no laborable',
        alcance: 'PERSONAL',
        esLaborable: false,
        generaHorasTrabajadas: false,
        computaParaMetaHoras: false,
        requiereRespaldo: false,
        activo: true,
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidenciaPersonalController],
      providers: [
        {
          provide: ListarIncidenciasPersonalesUseCase,
          useValue: listarIncidenciasPersonalesUseCaseMock,
        },
        {
          provide: CrearIncidenciaPersonalUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ActualizarIncidenciaPersonalUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DesactivarIncidenciaPersonalUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ObtenerImpactoUsoIncidenciaPersonalUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ActorContextGuard, useValue: { canActivate: jest.fn() } },
        {
          provide: ObtenerSesionActualUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<IncidenciaPersonalController>(
      IncidenciaPersonalController,
    );
  });

  it('should return a collection wrapper for tipos de dia', async () => {
    await expect(controller.listar({})).resolves.toEqual({
      data: [
        {
          id: 1,
          codigo: 'DESCANSO',
          nombre: 'Descanso',
          descripcion: 'Dia no laborable',
          alcance: 'PERSONAL',
          esLaborable: false,
          generaHorasTrabajadas: false,
          computaParaMetaHoras: false,
          requiereRespaldo: false,
          activo: true,
        },
      ],
      meta: {
        total: 1,
      },
    });
  });
});
