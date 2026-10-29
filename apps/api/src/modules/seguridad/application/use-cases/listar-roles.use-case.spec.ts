import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { ListarRolesUseCase } from './listar-roles.use-case';

describe('ListarRolesUseCase', () => {
  it('should return mapped roles', async () => {
    const repository: RolSeguridadRepository = {
      listar: jest.fn().mockResolvedValue([
        {
          id: 1,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador del sistema',
          activo: true,
        },
      ]),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new ListarRolesUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: 1,
        codigo: 'ADMIN_SISTEMA',
        nombre: 'Administrador del sistema',
        activo: true,
      },
    ]);
  });
});
