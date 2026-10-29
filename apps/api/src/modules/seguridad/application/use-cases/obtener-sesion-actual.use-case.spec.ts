import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { ObtenerSesionActualUseCase } from './obtener-sesion-actual.use-case';

describe('ObtenerSesionActualUseCase', () => {
  it('should return the active session by token', async () => {
    const repository: UsuarioRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerSesionPorId: jest.fn().mockResolvedValue({
        id: 3,
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
        alcancePlanificacion: 'SERVICIO',
        puedeGestionarPlanificacion: true,
        puedeGestionarTodo: false,
        departamentosGestionables: [
          {
            id: 1,
            codigo: 'DEP-EMR',
            nombre: 'Emergencias',
          },
        ],
        serviciosGestionables: [
          {
            id: 2,
            idDepartamento: 1,
            codigo: 'SRV-URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'DEP-EMR',
            nombreDepartamento: 'Emergencias',
          },
        ],
      }),
      obtenerSesionPorToken: jest.fn().mockResolvedValue({
        id: 3,
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
        alcancePlanificacion: 'SERVICIO',
        puedeGestionarPlanificacion: true,
        puedeGestionarTodo: false,
        departamentosGestionables: [
          {
            id: 1,
            codigo: 'DEP-EMR',
            nombre: 'Emergencias',
          },
        ],
        serviciosGestionables: [
          {
            id: 2,
            idDepartamento: 1,
            codigo: 'SRV-URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'DEP-EMR',
            nombreDepartamento: 'Emergencias',
          },
        ],
      }),
      obtenerSesionPorUsername: jest.fn(),
      obtenerSesionAutenticablePorUsername: jest.fn(),
      crearSesionActiva: jest.fn(),
      revocarSesionPorToken: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
      obtenerPorPersonal: jest.fn(),
      contarAdministradoresSistemaActivos: jest.fn(),
      actualizarPassword: jest.fn(),
    };

    const useCase = new ObtenerSesionActualUseCase(repository);

    await expect(useCase.execute('token-demo')).resolves.toMatchObject({
      id: 3,
      username: 'luis.perez',
      alcancePlanificacion: 'SERVICIO',
    });
  });
});
