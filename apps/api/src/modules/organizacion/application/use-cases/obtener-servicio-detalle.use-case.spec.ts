import { NotFoundException } from '@nestjs/common';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';
import { ObtenerServicioDetalleUseCase } from './obtener-servicio-detalle.use-case';

describe('ObtenerServicioDetalleUseCase', () => {
  it('should return a detailed servicio response', async () => {
    const repository: ServicioRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerDetalle: jest.fn().mockResolvedValue({
        id: 2,
        codigo: 'NEURO',
        nombre: 'Neurocirugia',
        descripcion: 'Servicio de neurocirugia',
        activo: true,
        departamento: {
          id: 1,
          codigo: 'ENF',
          nombre: 'Enfermeria',
        },
        cantidadPersonalActivo: 5,
        jefaServicio: {
          idPersonal: 3,
          codigoPersonal: 'NEU-001',
          nombreCompleto: 'Paola Rios Vargas',
          codigoRolFuncional: 'JEFE_SERVICIO',
          nombreRolFuncional: 'Jefa de Servicio',
        },
        turnos: [],
      }),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new ObtenerServicioDetalleUseCase(repository);

    await expect(useCase.execute(2)).resolves.toMatchObject({
      id: 2,
      codigo: 'NEURO',
      descripcion: 'Servicio de neurocirugia',
      cantidadPersonalActivo: 5,
      jefaServicio: {
        codigoRolFuncional: 'JEFE_SERVICIO',
      },
    });
  });

  it('should throw when servicio is missing', async () => {
    const repository: ServicioRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerDetalle: jest.fn().mockResolvedValue(null),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new ObtenerServicioDetalleUseCase(repository);

    await expect(useCase.execute(99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
