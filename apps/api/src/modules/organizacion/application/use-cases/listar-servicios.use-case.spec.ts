import { ListarServiciosQueryDto } from '../dto/listar-servicios-query.dto';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';
import { ListarServiciosUseCase } from './listar-servicios.use-case';

describe('ListarServiciosUseCase', () => {
  it('should return mapped servicios', async () => {
    const repository: ServicioRepository = {
      listar: jest.fn().mockResolvedValue([
        {
          id: 10,
          idDepartamento: 1,
          codigoDepartamento: 'ENF',
          nombreDepartamento: 'Enfermeria',
          codigo: 'SRV-01',
          nombre: 'Urgencias',
          descripcion: 'Atencion de urgencias 24h',
          cantidadPersonalActivo: 4,
          activo: true,
        },
      ]),
      obtenerPorId: jest.fn(),
      obtenerDetalle: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new ListarServiciosUseCase(repository);
    const query = new ListarServiciosQueryDto();

    await expect(useCase.execute(query)).resolves.toEqual([
      {
        id: 10,
        idDepartamento: 1,
        codigoDepartamento: 'ENF',
        nombreDepartamento: 'Enfermeria',
        codigo: 'SRV-01',
        nombre: 'Urgencias',
        descripcion: 'Atencion de urgencias 24h',
        cantidadPersonalActivo: 4,
        activo: true,
      },
    ]);
  });

  it('should push idDepartamento and filtroAlcance down to the repository query', async () => {
    const listarMock = jest.fn().mockResolvedValue([]);
    const repository: ServicioRepository = {
      listar: listarMock,
      obtenerPorId: jest.fn(),
      obtenerDetalle: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new ListarServiciosUseCase(repository);
    const query = new ListarServiciosQueryDto();
    query.idDepartamento = 1;

    await useCase.execute(query, {
      idsServicioPermitidos: [10, 11],
      soloActivos: true,
    });

    expect(listarMock).toHaveBeenCalledWith({
      idDepartamento: 1,
      idsDepartamentoPermitidos: undefined,
      idsServicioPermitidos: [10, 11],
      soloActivos: true,
    });
  });
});
