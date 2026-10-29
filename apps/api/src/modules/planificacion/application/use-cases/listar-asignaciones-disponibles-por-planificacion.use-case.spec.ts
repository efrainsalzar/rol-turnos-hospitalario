import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarAsignacionesDisponiblesPorPlanificacionUseCase } from './listar-asignaciones-disponibles-por-planificacion.use-case';

describe('ListarAsignacionesDisponiblesPorPlanificacionUseCase', () => {
  it('should resolve planificacion and list active asignaciones for its service', async () => {
    const obtenerPorId = jest.fn().mockResolvedValue({
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
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    const listarAsignacionesDisponiblesPorServicio = jest
      .fn()
      .mockResolvedValue([
        {
          idAsignacionPersonal: 25,
          idPersonal: 7,
          codigoPersonal: 'PER-007',
          nombreCompleto: 'Maria Salazar Flores',
          esPrincipal: true,
        },
      ]);

    const planificacionRepository: PlanificacionRepository = {
      listar: jest.fn(),
      obtenerPorId,
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio,
      obtenerPorIdEnPlanificacion: jest.fn(),
      contarPorPlanificacion: jest.fn(),
      existeAsignacionPersonalEnServicio: jest.fn(),
      existeAsignacionPersonalEnDepartamento: jest.fn(),
      listarAsignacionesDisponiblesPorDepartamento: jest.fn(),
      existeCalendarioEnRango: jest.fn(),
      obtenerTurnoValidacion: jest.fn(),
      obtenerIncidenciaPersonalValidacion: jest.fn(),
      existeIncidenciaPersonal: jest.fn(),
      existeConflictoSecuencia: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      obtenerEstadoCeldaMatriz: jest.fn(),
      aplicarCeldaMatrizRapida: jest.fn(),
      eliminar: jest.fn(),
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
    };

    const useCase = new ListarAsignacionesDisponiblesPorPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(useCase.execute(10)).resolves.toEqual([
      {
        idAsignacionPersonal: 25,
        idPersonal: 7,
        codigoPersonal: 'PER-007',
        nombreCompleto: 'Maria Salazar Flores',
        esPrincipal: true,
      },
    ]);

    expect(obtenerPorId).toHaveBeenCalledWith(10);
    expect(listarAsignacionesDisponiblesPorServicio).toHaveBeenCalledWith(2);
  });
});
