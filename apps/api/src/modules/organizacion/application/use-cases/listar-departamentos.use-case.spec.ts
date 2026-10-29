import { DepartamentoRepository } from '../../domain/repositories/departamento.repository';
import { ListarDepartamentosUseCase } from './listar-departamentos.use-case';

describe('ListarDepartamentosUseCase', () => {
  it('should return mapped departamentos', async () => {
    const repository: DepartamentoRepository = {
      listar: jest.fn().mockResolvedValue([
        {
          id: 1,
          codigo: 'DEP-01',
          nombre: 'Emergencias',
          descripcion: 'Atencion de urgencias',
          activo: true,
          cantidadPersonalActivo: 3,
        },
      ]),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new ListarDepartamentosUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: 1,
        codigo: 'DEP-01',
        nombre: 'Emergencias',
        descripcion: 'Atencion de urgencias',
        activo: true,
        cantidadPersonalActivo: 3,
      },
    ]);
  });
});
