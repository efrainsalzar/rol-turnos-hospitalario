import { ListarPersonalQueryDto } from '../dto/listar-personal-query.dto';
import { ListarPersonalUseCase } from './listar-personal.use-case';
import { PersonalRepository } from '../../domain/repositories/personal.repository';

describe('ListarPersonalUseCase', () => {
  it('should return mapped personal', async () => {
    const repository: PersonalRepository = {
      listar: jest.fn().mockResolvedValue([
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
        },
      ]),
      obtenerPorId: jest.fn(),
      listarVinculablesUsuario: jest.fn(),
      obtenerDetalle: jest.fn(),
      obtenerAsignacionPorId: jest.fn(),
      listarAsignaciones: jest.fn(),
      crearPersonal: jest.fn(),
      actualizarPersonal: jest.fn(),
      activarPersonal: jest.fn(),
      desactivarPersonal: jest.fn(),

      listarNivelesCargo: jest.fn(),
      crearNivelCargo: jest.fn(),
      actualizarNivelCargo: jest.fn(),
      activarNivelCargo: jest.fn(),
      desactivarNivelCargo: jest.fn(),
      listarCargasHorarias: jest.fn(),
      crearCargaHoraria: jest.fn(),
      actualizarCargaHoraria: jest.fn(),
      activarCargaHoraria: jest.fn(),
      desactivarCargaHoraria: jest.fn(),
      listarTiposContrato: jest.fn(),
      listarRolesFuncionales: jest.fn(),
      obtenerRolFuncionalPorId: jest.fn(),
      existePlanificacionAbiertaParaAsignacion: jest.fn(),
      obtenerConflictoPlanificacionAbiertaParaAsignacion: jest.fn(),
    obtenerPlanificacionAprobadaPorUnidadYFecha: jest.fn(),
      crearAsignacion: jest.fn(),
      actualizarAsignacion: jest.fn(),
      moverAsignacion: jest.fn(),
      cerrarAsignacion: jest.fn(),
      obtenerJefaturaActivaEnUnidad: jest.fn(),
    };

    const useCase = new ListarPersonalUseCase(repository);
    const query = new ListarPersonalQueryDto();

    await expect(useCase.execute(query)).resolves.toEqual({
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
      },
    });
  });
});
