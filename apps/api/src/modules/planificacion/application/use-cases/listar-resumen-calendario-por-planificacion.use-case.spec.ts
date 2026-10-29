import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarResumenCalendarioPorPlanificacionUseCase } from './listar-resumen-calendario-por-planificacion.use-case';

describe('ListarResumenCalendarioPorPlanificacionUseCase', () => {
  it('should list resumen por calendario for an existing planificacion', async () => {
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

    const listarResumenCalendarioPorPlanificacion = jest
      .fn()
      .mockResolvedValue([
        {
          idCalendario: 501,
          fecha: new Date('2026-05-01T00:00:00.000Z'),
          anio: 2026,
          mes: 5,
          diaMes: 1,
          diaSemanaNombre: 'Viernes',
          esFinSemana: false,
          esFeriado: false,
          codigoFeriado: null,
          nombreFeriado: null,
          totalRegistros: 1,
          totalTurnos: 1,
          totalIncidenciasPersonales: 0,
          totalPersonasProgramadas: 1,
          totalHorasProgramadas: 12,
        },
      ]);

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion,
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

    const useCase = new ListarResumenCalendarioPorPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(useCase.execute(10, { id_calendario: 501 })).resolves.toEqual([
      {
        idCalendario: 501,
        fecha: '2026-05-01T00:00:00.000Z',
        anio: 2026,
        mes: 5,
        diaMes: 1,
        diaSemanaNombre: 'Viernes',
        esFinSemana: false,
        esFeriado: false,
        codigoFeriado: null,
        nombreFeriado: null,
        totalRegistros: 1,
        totalTurnos: 1,
        totalIncidenciasPersonales: 0,
        totalPersonasProgramadas: 1,
        totalHorasProgramadas: 12,
      },
    ]);

    expect(listarResumenCalendarioPorPlanificacion).toHaveBeenCalledWith(10, {
      idCalendario: 501,
    });
  });
});
