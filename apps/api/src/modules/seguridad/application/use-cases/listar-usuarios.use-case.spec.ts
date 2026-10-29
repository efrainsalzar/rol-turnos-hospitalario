import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { ListarUsuariosUseCase } from './listar-usuarios.use-case';

describe('ListarUsuariosUseCase', () => {
  it('should return mapped usuarios without secret fields', async () => {
    const repository: UsuarioRepository = {
      listar: jest.fn().mockResolvedValue([
        {
          id: 1,
          idPersonal: 2,
          codigoPersonal: 'PER-002',
          nombreCompleto: 'Luis Fernando Perez Gutierrez',
          idRolSeguridad: 4,
          rolCodigo: 'JEFE_SERVICIO',
          rolNombre: 'Jefe de servicio',
          tipoUsuario: 'PERSONAL',
          proveedorAutenticacion: 'LOCAL',
          sujetoAutenticacion: 'luis.perez',
          username: 'luis.perez',
          identidadLocalHabilitada: true,
          activo: true,
        },
      ]),
      obtenerPorId: jest.fn(),
      obtenerSesionPorId: jest.fn(),
      obtenerSesionPorUsername: jest.fn(),
      obtenerSesionAutenticablePorUsername: jest.fn(),
      crearSesionActiva: jest.fn(),
      obtenerSesionPorToken: jest.fn(),
      revocarSesionPorToken: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
      obtenerPorPersonal: jest.fn(),
      contarAdministradoresSistemaActivos: jest.fn(),
      actualizarPassword: jest.fn(),
    };

    const useCase = new ListarUsuariosUseCase(repository);

    await expect(useCase.execute()).resolves.toEqual([
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
    ]);
  });
});
