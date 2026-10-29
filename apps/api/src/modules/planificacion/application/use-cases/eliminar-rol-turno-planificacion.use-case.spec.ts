import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { EliminarRolTurnoPlanificacionUseCase } from './eliminar-rol-turno-planificacion.use-case';

describe('EliminarRolTurnoPlanificacionUseCase', () => {
  it('should delete a rol_turno from a borrador planificacion', async () => {
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
      existeUsuario: jest.fn().mockResolvedValue(true),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const eliminar = jest.fn().mockResolvedValue(undefined);

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn().mockResolvedValue({
        id: 901,
        idPlanificacion: 10,
        idAsignacionPersonal: 100,
        idCalendario: 501,
        fecha: new Date('2026-05-01T00:00:00.000Z'),
        diaMes: 1,
        diaSemanaNombre: 'Viernes',
        secuenciaDia: 1,
        idTurno: 20,
        codigoTurno: 'TUR-URG-M',
        nombreTurno: 'Urgencias manana',
        idIncidenciaPersonal: null,
        codigoIncidenciaPersonal: null,
        nombreIncidenciaPersonal: null,
        horasProgramadas: 6,
        origenRegistro: 'MANUAL',
        idPersonal: 1,
        codigoPersonal: 'PER-001',
        nombreCompleto: 'Ana Maria Rojas Lopez',
      }),
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
      eliminar,
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
    };

    const useCase = new EliminarRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(useCase.execute(10, 901, 1)).resolves.toBeUndefined();
    expect(eliminar).toHaveBeenCalledWith(10, 901);
  });
});
