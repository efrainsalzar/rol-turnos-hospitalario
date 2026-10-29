import { NotFoundException } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarRolTurnosPorPlanificacionUseCase } from './listar-rol-turnos-por-planificacion.use-case';

describe('ListarRolTurnosPorPlanificacionUseCase', () => {
  it('should list rol_turnos for an existing planificacion', async () => {
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
        createdAt: new Date('2026-04-30T12:00:00.000Z'),
        updatedAt: new Date('2026-04-30T12:00:00.000Z'),
      }),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn().mockResolvedValue([
        {
          id: 1,
          idPlanificacion: 10,
          idAsignacionPersonal: 100,
          idCalendario: 500,
          fecha: new Date('2026-05-01T00:00:00.000Z'),
          diaMes: 1,
          diaSemanaNombre: 'Viernes',
          secuenciaDia: 1,
          idTurno: 20,
          codigoTurno: 'TUR-URG-M',
          nombreTurno: 'Urgencias manana',
          horaInicio: null,
          horaFin: null,
          cruzaMedianoche: null,
          idIncidenciaPersonal: null,
          codigoIncidenciaPersonal: null,
          nombreIncidenciaPersonal: null,
          horasProgramadas: 6,
          origenRegistro: 'MANUAL',
          idPersonal: 1,
          codigoPersonal: 'PER-001',
          nombreCompleto: 'Ana Maria Rojas Lopez',
        },
      ]),
      listarResumenPersonalPorPlanificacion: jest.fn(),
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

    const useCase = new ListarRolTurnosPorPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(
      useCase.execute(10, { id_asignacion_personal: 100 }),
    ).resolves.toEqual([
      {
        id: 1,
        idPlanificacion: 10,
        idAsignacionPersonal: 100,
        idCalendario: 500,
        fecha: '2026-05-01T00:00:00.000Z',
        diaMes: 1,
        diaSemanaNombre: 'Viernes',
        secuenciaDia: 1,
        idTurno: 20,
        codigoTurno: 'TUR-URG-M',
        nombreTurno: 'Urgencias manana',
        horaInicio: null,
        horaFin: null,
        cruzaMedianoche: null,
        idIncidenciaPersonal: null,
        codigoIncidenciaPersonal: null,
        nombreIncidenciaPersonal: null,
        horasProgramadas: 6,
        origenRegistro: 'MANUAL',
        idPersonal: 1,
        codigoPersonal: 'PER-001',
        nombreCompleto: 'Ana Maria Rojas Lopez',
      },
    ]);
  });

  it('should throw when planificacion does not exist', async () => {
    const planificacionRepository: PlanificacionRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue(null),
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

    const useCase = new ListarRolTurnosPorPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(useCase.execute(999, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
