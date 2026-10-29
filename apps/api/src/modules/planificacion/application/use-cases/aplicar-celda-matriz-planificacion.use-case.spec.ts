import { ConflictException, NotFoundException } from '@nestjs/common';
import { AplicarCeldaMatrizPlanificacionUseCase } from './aplicar-celda-matriz-planificacion.use-case';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';

describe('AplicarCeldaMatrizPlanificacionUseCase', () => {
  // Las fixtures son de julio 2026: se fija la fecha para que no dependan del
  // dia en que se corran (vencimiento y ventana visible de jefaturas).
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00-04:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const planificacionBorrador = {
    id: 10,
    idServicio: 2,
    codigoServicio: 'SRV-URG',
    nombreServicio: 'Urgencias',
    anio: 2026,
    mes: 7,
    version: 1,
    estado: 'BORRADOR' as const,
    fechaInicio: new Date('2026-07-01T00:00:00.000Z'),
    fechaFin: new Date('2026-07-31T00:00:00.000Z'),
    fechaPublicacion: null,
    fechaCierre: null,
    createdAt: new Date('2026-06-30T00:00:00.000Z'),
    updatedAt: new Date('2026-06-30T00:00:00.000Z'),
  };

  function buildPlanificacionRepository(
    planificacion: typeof planificacionBorrador | null = planificacionBorrador,
  ): PlanificacionRepository {
    return {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue(planificacion),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn().mockResolvedValue(true),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    } as unknown as PlanificacionRepository;
  }

  function buildPlanificacionHistorialRepository(): PlanificacionHistorialRepository {
    return {
      existeHistorial: jest.fn(),
      cerrarYMaterializar: jest.fn(),
      listarIdsVencidasNoCerradas: jest.fn(),
      listarRegistrosHistorial: jest.fn(),
      listarObservacionesDiariasHistorial: jest.fn(),
    };
  }

  function buildConfiguracionOperativaServicioRepository(
    overrides: Partial<ConfiguracionOperativaServicioRepository> = {},
  ): ConfiguracionOperativaServicioRepository {
    return {
      obtenerPorPlanificacion: jest.fn(),
      obtenerPorServicio: jest.fn(),
      resolverCodigoOperativoEnPlanificacion: jest.fn(),
      guardarConfiguracionServicio: jest.fn(),
      actualizarCodigoVisual: jest.fn(),
      obtenerPorDepartamento: jest.fn(),
      guardarConfiguracionDepartamento: jest.fn(),
      ...overrides,
    };
  }

  function buildRolTurnoRepository(
    overrides: Partial<RolTurnoRepository> = {},
  ): RolTurnoRepository {
    return {
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
      obtenerEstadoCeldaMatriz: jest.fn().mockResolvedValue({
        asignacionValida: true,
        calendarioValido: true,
        registros: [],
      }),
      aplicarCeldaMatrizRapida: jest.fn().mockResolvedValue({
        idRolTurno: 900,
        secuenciaDia: 1,
        idTurno: null,
        codigoTurno: null,
        nombreTurno: null,
        horaInicio: null,
        horaFin: null,
        cruzaMedianoche: null,
        idIncidenciaPersonal: null,
        codigoIncidenciaPersonal: null,
        nombreIncidenciaPersonal: null,
        horasProgramadas: null,
      }),
      eliminar: jest.fn(),
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
      ...overrides,
    };
  }

  function buildSesionEdicionPlanificacionRepository(): SesionEdicionPlanificacionRepository {
    return {
      obtenerActiva: jest.fn().mockResolvedValue(null),
      intentarAdquirirOLatir: jest.fn().mockResolvedValue({
        sesion: {
          idPlanificacion: 10,
          idUsuarioEditor: 1,
          nombreUsuarioEditor: 'actor',
          codigoRolEditor: 'JEFE_SERVICIO',
          adquiridoEn: new Date(),
          ultimoLatido: new Date(),
        },
        controlPropio: true,
      }),
      forzarControl: jest.fn(),
      liberar: jest.fn(),
      liberarTodasDeUsuario: jest.fn(),
    };
  }

  const baseInput = {
    idAsignacionPersonal: 100,
    idCalendario: 501,
    secuenciaDia: 1,
  };

  it('should apply a turno to a cell for an editable planificacion', async () => {
    const aplicarCeldaMatrizRapida = jest.fn().mockResolvedValue({
      idRolTurno: 900,
      secuenciaDia: 1,
      idTurno: 20,
      codigoTurno: 'TUR-URG-M',
      nombreTurno: 'Urgencias manana',
      horaInicio: '07:00',
      horaFin: '13:00',
      cruzaMedianoche: false,
      idIncidenciaPersonal: null,
      codigoIncidenciaPersonal: null,
      nombreIncidenciaPersonal: null,
      horasProgramadas: 6,
    });
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 20,
        idServicio: 2,
        codigo: 'TUR-URG-M',
        nombre: 'Urgencias manana',
        horaInicio: '07:00',
        horaFin: '13:00',
        cruzaMedianoche: false,
        duracionHoras: 6,
        activo: true,
      }),
      aplicarCeldaMatrizRapida,
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await useCase.execute(
      10,
      { ...baseInput, idTurno: 20, horasProgramadas: 6 },
      1,
    );

    expect(aplicarCeldaMatrizRapida).toHaveBeenCalledWith(
      expect.objectContaining({
        idPlanificacion: 10,
        idAsignacionPersonal: 100,
        idCalendario: 501,
        idTurno: 20,
        idIncidenciaPersonal: null,
        horasProgramadas: 6,
        origenRegistro: 'MANUAL',
        limpiar: false,
      }),
    );
  });

  it('should apply an incidencia personal to a cell', async () => {
    const aplicarCeldaMatrizRapida = jest.fn().mockResolvedValue({
      idRolTurno: 901,
      secuenciaDia: 1,
      idTurno: null,
      codigoTurno: null,
      nombreTurno: null,
      horaInicio: null,
      horaFin: null,
      cruzaMedianoche: null,
      idIncidenciaPersonal: 5,
      codigoIncidenciaPersonal: 'VACACION',
      nombreIncidenciaPersonal: 'Vacacion',
      horasProgramadas: 0,
    });
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerIncidenciaPersonalValidacion: jest.fn().mockResolvedValue({
        id: 5,
        codigo: 'VACACION',
        nombre: 'Vacacion',
        alcance: 'PERSONAL',
        activo: true,
      }),
      aplicarCeldaMatrizRapida,
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await useCase.execute(
      10,
      { ...baseInput, idIncidenciaPersonal: 5, horasProgramadas: 0 },
      1,
    );

    expect(aplicarCeldaMatrizRapida).toHaveBeenCalledWith(
      expect.objectContaining({
        idTurno: null,
        idIncidenciaPersonal: 5,
        origenRegistro: 'MANUAL',
      }),
    );
  });

  it('should clear a cell without resolving codigo operativo', async () => {
    const resolverCodigoOperativoEnPlanificacion = jest.fn();
    const configuracionOperativaServicioRepository =
      buildConfiguracionOperativaServicioRepository({
        resolverCodigoOperativoEnPlanificacion,
      });
    const aplicarCeldaMatrizRapida = jest.fn().mockResolvedValue({
      idRolTurno: null,
      secuenciaDia: null,
      idTurno: null,
      codigoTurno: null,
      nombreTurno: null,
      horaInicio: null,
      horaFin: null,
      cruzaMedianoche: null,
      idIncidenciaPersonal: null,
      codigoIncidenciaPersonal: null,
      nombreIncidenciaPersonal: null,
      horasProgramadas: null,
    });
    const rolTurnoRepository = buildRolTurnoRepository({
      aplicarCeldaMatrizRapida,
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
      buildSesionEdicionPlanificacionRepository(),
    );

    await useCase.execute(10, { ...baseInput, limpiar: true }, 1);

    expect(resolverCodigoOperativoEnPlanificacion).not.toHaveBeenCalled();
    expect(aplicarCeldaMatrizRapida).toHaveBeenCalledWith(
      expect.objectContaining({
        idTurno: null,
        idIncidenciaPersonal: null,
        horasProgramadas: 0,
        origenRegistro: 'AJUSTE',
        limpiar: true,
      }),
    );
  });

  it('should throw when planificacion does not exist', async () => {
    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(null),
      buildPlanificacionHistorialRepository(),
      buildRolTurnoRepository(),
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        999,
        { ...baseInput, idTurno: 20, horasProgramadas: 6 },
        1,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject editing a planificacion that is not BORRADOR/REVISION', async () => {
    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository({
        ...planificacionBorrador,
        estado: 'CERRADA' as unknown as typeof planificacionBorrador.estado,
      }),
      buildPlanificacionHistorialRepository(),
      buildRolTurnoRepository(),
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        10,
        { ...baseInput, idTurno: 20, horasProgramadas: 6 },
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should reject an invalid asignacion even when the codigo operativo would resolve fine (parallel validation)', async () => {
    const aplicarCeldaMatrizRapida = jest.fn();
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerEstadoCeldaMatriz: jest.fn().mockResolvedValue({
        asignacionValida: false,
        calendarioValido: true,
        registros: [],
      }),
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 20,
        idServicio: 2,
        codigo: 'TUR-URG-M',
        nombre: 'Urgencias manana',
        horaInicio: '07:00',
        horaFin: '13:00',
        cruzaMedianoche: false,
        duracionHoras: 6,
        activo: true,
      }),
      aplicarCeldaMatrizRapida,
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        10,
        { ...baseInput, idTurno: 20, horasProgramadas: 6 },
        1,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(aplicarCeldaMatrizRapida).not.toHaveBeenCalled();
  });

  it('should reject an invalid calendario', async () => {
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerEstadoCeldaMatriz: jest.fn().mockResolvedValue({
        asignacionValida: true,
        calendarioValido: false,
        registros: [],
      }),
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        10,
        { ...baseInput, idTurno: 20, horasProgramadas: 6 },
        1,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should reject a turno that does not belong to the planificacion servicio', async () => {
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 20,
        idServicio: 999,
        codigo: 'TUR-OTRO',
        nombre: 'Otro servicio',
        horaInicio: '07:00',
        horaFin: '13:00',
        cruzaMedianoche: false,
        duracionHoras: 6,
        activo: true,
      }),
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        10,
        { ...baseInput, idTurno: 20, horasProgramadas: 6 },
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should reject an inactive turno', async () => {
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 20,
        idServicio: 2,
        codigo: 'TUR-URG-M',
        nombre: 'Urgencias manana',
        horaInicio: '07:00',
        horaFin: '13:00',
        cruzaMedianoche: false,
        duracionHoras: 6,
        activo: false,
      }),
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        10,
        { ...baseInput, idTurno: 20, horasProgramadas: 6 },
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should reject an incidencia personal with alcance GENERAL', async () => {
    const rolTurnoRepository = buildRolTurnoRepository({
      obtenerIncidenciaPersonalValidacion: jest.fn().mockResolvedValue({
        id: 5,
        codigo: 'FERIADO',
        nombre: 'Feriado',
        alcance: 'GENERAL',
        activo: true,
      }),
    });

    const useCase = new AplicarCeldaMatrizPlanificacionUseCase(
      buildPlanificacionRepository(),
      buildPlanificacionHistorialRepository(),
      rolTurnoRepository,
      buildConfiguracionOperativaServicioRepository(),
      buildSesionEdicionPlanificacionRepository(),
    );

    await expect(
      useCase.execute(
        10,
        { ...baseInput, idIncidenciaPersonal: 5, horasProgramadas: 0 },
        1,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
