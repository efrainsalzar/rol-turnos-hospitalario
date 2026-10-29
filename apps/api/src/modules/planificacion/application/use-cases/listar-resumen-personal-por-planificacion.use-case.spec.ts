import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarResumenPersonalPorPlanificacionUseCase } from './listar-resumen-personal-por-planificacion.use-case';

describe('ListarResumenPersonalPorPlanificacionUseCase', () => {
  it('should list resumen por personal for an existing planificacion', async () => {
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
        createdAt: new Date('2026-04-30T00:00:00.000Z'),
        updatedAt: new Date('2026-04-30T00:00:00.000Z'),
      }),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const listarResumenPersonalPorPlanificacion = jest.fn().mockResolvedValue([
      {
        idAsignacionPersonal: 100,
        idPersonal: 1,
        codigoPersonal: 'PER-001',
        nombreCompleto: 'Ana Maria Rojas Lopez',
        idServicio: 2,
        codigoServicio: 'SRV-URG',
        nombreServicio: 'Urgencias',
        totalRegistros: 2,
        totalTurnos: 2,
        totalIncidenciasPersonales: 0,
        totalDiasProgramados: 2,
        totalHorasProgramadas: 24,
        primeraFecha: new Date('2026-05-01T00:00:00.000Z'),
        ultimaFecha: new Date('2026-05-02T00:00:00.000Z'),
      },
    ]);

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion,
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
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

    const useCase = new ListarResumenPersonalPorPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(
      useCase.execute(10, { id_asignacion_personal: 100 }),
    ).resolves.toEqual([
      {
        idAsignacionPersonal: 100,
        idPersonal: 1,
        codigoPersonal: 'PER-001',
        nombreCompleto: 'Ana Maria Rojas Lopez',
        idServicio: 2,
        codigoServicio: 'SRV-URG',
        nombreServicio: 'Urgencias',
        totalRegistros: 2,
        totalTurnos: 2,
        totalIncidenciasPersonales: 0,
        totalDiasProgramados: 2,
        totalHorasProgramadas: 24,
        primeraFecha: '2026-05-01T00:00:00.000Z',
        ultimaFecha: '2026-05-02T00:00:00.000Z',
      },
    ]);

    expect(listarResumenPersonalPorPlanificacion).toHaveBeenCalledWith(10, {
      idAsignacionPersonal: 100,
    });
  });
});
