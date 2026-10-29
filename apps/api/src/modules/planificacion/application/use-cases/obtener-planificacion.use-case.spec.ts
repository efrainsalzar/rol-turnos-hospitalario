import { NotFoundException } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { ObtenerPlanificacionUseCase } from './obtener-planificacion.use-case';

describe('ObtenerPlanificacionUseCase', () => {
  it('should return a planificacion by id', async () => {
    const planificacionRepository: PlanificacionRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 10,
        idServicio: 2,
        codigoServicio: 'SRV-URG',
        nombreServicio: 'Urgencias',
        anio: 2026,
        mes: 5,
        version: 1,
        estado: 'BORRADOR',
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-05-31T00:00:00.000Z'),
        fechaPublicacion: null,
        fechaCierre: null,
        createdAt: new Date('2026-04-30T12:00:00.000Z'),
        updatedAt: new Date('2026-04-30T12:00:00.000Z'),
      }),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const useCase = new ObtenerPlanificacionUseCase(planificacionRepository);

    await expect(useCase.execute(10)).resolves.toEqual({
      id: 10,
      idServicio: 2,
      codigoServicio: 'SRV-URG',
      nombreServicio: 'Urgencias',
      anio: 2026,
      mes: 5,
      version: 1,
      estado: 'BORRADOR',
      fechaInicio: '2026-05-01T00:00:00.000Z',
      fechaFin: '2026-05-31T00:00:00.000Z',
      fechaPublicacion: null,
      fechaCierre: null,
      createdAt: '2026-04-30T12:00:00.000Z',
      updatedAt: '2026-04-30T12:00:00.000Z',
    });
  });

  it('should throw when planificacion does not exist', async () => {
    const planificacionRepository: PlanificacionRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue(null),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const useCase = new ObtenerPlanificacionUseCase(planificacionRepository);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
