import { ConflictException } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { PublicarPlanificacionUseCase } from './publicar-planificacion.use-case';

describe('PublicarPlanificacionUseCase', () => {
  it('should publish a revision planificacion with rol_turnos', async () => {
    const publicar = jest.fn().mockResolvedValue({
      id: 10,
      idServicio: 2,
      codigoServicio: 'SRV-URG',
      nombreServicio: 'Urgencias',
      anio: 2026,
      mes: 5,
      version: 1,
      estado: 'APROBADA',
      fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
      fechaFin: new Date('2026-05-31T00:00:00.000Z'),
      fechaPublicacion: new Date('2026-05-01T10:00:00.000Z'),
      fechaCierre: null,
      createdAt: new Date('2026-04-30T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
    });

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
        estado: 'REVISION',
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
      publicar,
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn(),
      contarPorPlanificacion: jest.fn().mockResolvedValue(3),
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

    const useCase = new PublicarPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(
      useCase.execute(10, { idUsuarioPublicador: 1 }),
    ).resolves.toMatchObject({
      id: 10,
      estado: 'APROBADA',
    });

    expect(publicar).toHaveBeenCalledWith(10, 1);
  });

  it('should reject publish without rol_turnos', async () => {
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

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn(),
      contarPorPlanificacion: jest.fn().mockResolvedValue(0),
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

    const useCase = new PublicarPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(
      useCase.execute(10, { idUsuarioPublicador: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('REGRESION: rechaza publicar directo desde BORRADOR, sin pasar por REVISION', async () => {
    // Antes del fix, este use-case solo validaba assertPlanificacionPublicable
    // (que acepta BORRADOR o REVISION), sin aplicar la maquina de estados
    // (assertTransicionEstadoValida, que solo permite REVISION:APROBADA). Un
    // JEFE_SERVICIO con acceso a POST /:id/publicar podia saltarse la
    // revision del jefe de departamento.
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

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn(),
      contarPorPlanificacion: jest.fn().mockResolvedValue(3),
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

    const useCase = new PublicarPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
    );

    await expect(
      useCase.execute(10, { idUsuarioPublicador: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
