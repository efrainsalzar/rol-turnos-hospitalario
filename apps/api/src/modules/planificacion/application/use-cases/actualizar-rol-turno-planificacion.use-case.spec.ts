import { ConflictException } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ActualizarRolTurnoPlanificacionUseCase } from './actualizar-rol-turno-planificacion.use-case';

describe('ActualizarRolTurnoPlanificacionUseCase', () => {
  const configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository =
    {
      obtenerPorPlanificacion: jest.fn(),
      obtenerPorServicio: jest.fn(),
      resolverCodigoOperativoEnPlanificacion: jest.fn(),
      guardarConfiguracionServicio: jest.fn(),
      actualizarCodigoVisual: jest.fn(),
      obtenerPorDepartamento: jest.fn(),
      guardarConfiguracionDepartamento: jest.fn(),
    };

  it('should update a rol_turno and mark it as AJUSTE', async () => {
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

    const actualizar = jest.fn().mockResolvedValue({
      id: 901,
      idPlanificacion: 10,
      idAsignacionPersonal: 100,
      idCalendario: 502,
      fecha: new Date('2026-05-02T00:00:00.000Z'),
      diaMes: 2,
      diaSemanaNombre: 'Sabado',
      secuenciaDia: 1,
      idTurno: null,
      codigoTurno: null,
      nombreTurno: null,
      idIncidenciaPersonal: 4,
      codigoIncidenciaPersonal: 'DESCANSO',
      nombreIncidenciaPersonal: 'Descanso',
      horasProgramadas: 0,
      origenRegistro: 'AJUSTE',
      idPersonal: 1,
      codigoPersonal: 'PER-001',
      nombreCompleto: 'Ana Maria Rojas Lopez',
    });

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn().mockResolvedValueOnce({
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
      existeAsignacionPersonalEnServicio: jest.fn().mockResolvedValue(true),
      existeAsignacionPersonalEnDepartamento: jest.fn(),
      listarAsignacionesDisponiblesPorDepartamento: jest.fn(),
      existeCalendarioEnRango: jest.fn().mockResolvedValue(true),
      obtenerTurnoValidacion: jest.fn(),
      obtenerIncidenciaPersonalValidacion: jest.fn().mockResolvedValue({
        id: 4,
        codigo: 'DESCANSO',
        nombre: 'Descanso',
        alcance: 'PERSONAL',
        activo: true,
      }),
      existeIncidenciaPersonal: jest.fn().mockResolvedValue(true),
      existeConflictoSecuencia: jest.fn().mockResolvedValue(false),
      crear: jest.fn(),
      actualizar,
      obtenerEstadoCeldaMatriz: jest.fn(),
      aplicarCeldaMatrizRapida: jest.fn(),
      eliminar: jest.fn(),
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
    };

    const useCase = new ActualizarRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
    );

    await expect(
      useCase.execute(10, 901, {
        idAsignacionPersonal: 100,
        idCalendario: 502,
        secuenciaDia: 1,
        idIncidenciaPersonal: 4,
        horasProgramadas: 0,
        idUsuarioOperacion: 1,
      }),
    ).resolves.toMatchObject({
      id: 901,
      idIncidenciaPersonal: 4,
      origenRegistro: 'AJUSTE',
    });

    expect(actualizar).toHaveBeenCalledWith(
      expect.objectContaining({
        idRolTurno: 901,
        origenRegistro: 'AJUSTE',
      }),
    );
  });

  it('should reject updates for non-borrador planificaciones', async () => {
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
        estado: 'APROBADA',
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-05-31T00:00:00.000Z'),
        fechaPublicacion: new Date('2026-05-01T10:00:00.000Z'),
        fechaCierre: null,
        createdAt: new Date('2026-04-30T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
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

    const useCase = new ActualizarRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
    );

    await expect(
      useCase.execute(10, 901, {
        idAsignacionPersonal: 100,
        idCalendario: 502,
        secuenciaDia: 1,
        idIncidenciaPersonal: 4,
        horasProgramadas: 0,
        idUsuarioOperacion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
