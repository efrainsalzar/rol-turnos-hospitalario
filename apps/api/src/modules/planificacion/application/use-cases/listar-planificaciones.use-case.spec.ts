import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { ListarPlanificacionesUseCase } from './listar-planificaciones.use-case';

describe('ListarPlanificacionesUseCase', () => {
  it('should list planificaciones and map dates to iso strings', async () => {
    const listar = jest.fn().mockResolvedValue([
      {
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
      },
    ]);

    const planificacionRepository: PlanificacionRepository = {
      listar,
      contar: jest.fn().mockResolvedValue(1),
      obtenerPorId: jest.fn(),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const useCase = new ListarPlanificacionesUseCase(planificacionRepository);

    const filtro = {
      idServicio: 2,
      anio: 2026,
      mes: 5,
      estado: 'BORRADOR' as const,
    };

    await expect(useCase.execute(filtro)).resolves.toMatchObject({
      data: [
        {
          id: 10,
          idServicio: 2,
          idDepartamento: undefined,
          codigoDepartamento: undefined,
          nombreDepartamento: undefined,
          codigoServicio: 'SRV-URG',
          nombreServicio: 'Urgencias',
          anio: 2026,
          mes: 5,
          version: 1,
          estado: 'BORRADOR',
          cantidadPersonalPlanificable: undefined,
          activo: undefined,
          fechaInicio: '2026-05-01T00:00:00.000Z',
          fechaFin: '2026-05-31T00:00:00.000Z',
          fechaPublicacion: null,
          fechaCierre: null,
          createdAt: '2026-04-30T12:00:00.000Z',
          updatedAt: '2026-04-30T12:00:00.000Z',
        },
      ],
      meta: {
        total: 1,
      },
    });

    expect(listar).toHaveBeenCalledWith({
      idServicio: 2,
      anio: 2026,
      mes: 5,
      estado: 'BORRADOR',
    });
  });

  it('delega la paginacion real al repositorio (page/pageSize llegan tal cual, sin recorte en memoria)', async () => {
    const listar = jest.fn().mockResolvedValue([]);
    const contar = jest.fn().mockResolvedValue(25);
    const planificacionRepository: PlanificacionRepository = {
      listar,
      contar,
      obtenerPorId: jest.fn(),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const useCase = new ListarPlanificacionesUseCase(planificacionRepository);
    const filtro = { page: 2, pageSize: 10 };

    const response = await useCase.execute(filtro);

    expect(listar).toHaveBeenCalledWith(filtro);
    expect(contar).toHaveBeenCalledWith(filtro);
    expect(response.meta).toMatchObject({
      total: 25,
      page: 2,
      pageSize: 10,
      totalPages: 3,
      hasMore: true,
    });
  });
});
