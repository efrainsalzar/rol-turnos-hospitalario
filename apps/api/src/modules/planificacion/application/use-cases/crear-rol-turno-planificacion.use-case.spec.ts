import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { CrearRolTurnoPlanificacionUseCase } from './crear-rol-turno-planificacion.use-case';

describe('CrearRolTurnoPlanificacionUseCase', () => {
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

  it('should create a MANUAL rol_turno for a borrador planificacion', async () => {
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

    const crear = jest.fn().mockResolvedValue({
      id: 900,
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
    });

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn(),
      contarPorPlanificacion: jest.fn(),
      existeAsignacionPersonalEnServicio: jest.fn().mockResolvedValue(true),
      existeAsignacionPersonalEnDepartamento: jest.fn(),
      listarAsignacionesDisponiblesPorDepartamento: jest.fn(),
      existeCalendarioEnRango: jest.fn().mockResolvedValue(true),
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 20,
        idServicio: 2,
        codigo: 'TUR-URG-M',
        nombre: 'Urgencias manana',
        duracionHoras: 6,
        activo: true,
      }),
      obtenerIncidenciaPersonalValidacion: jest.fn(),
      existeIncidenciaPersonal: jest.fn(),
      existeConflictoSecuencia: jest.fn().mockResolvedValue(false),
      crear,
      actualizar: jest.fn(),
      obtenerEstadoCeldaMatriz: jest.fn(),
      aplicarCeldaMatrizRapida: jest.fn(),
      eliminar: jest.fn(),
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
    };

    const useCase = new CrearRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
    );

    await expect(
      useCase.execute(10, {
        idAsignacionPersonal: 100,
        idCalendario: 501,
        secuenciaDia: 1,
        idTurno: 20,
        horasProgramadas: 6,
        idUsuarioOperacion: 1,
      }),
    ).resolves.toMatchObject({
      id: 900,
      idPlanificacion: 10,
      idTurno: 20,
      origenRegistro: 'MANUAL',
    });

    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({
        idPlanificacion: 10,
        idAsignacionPersonal: 100,
        idCalendario: 501,
        secuenciaDia: 1,
        idTurno: 20,
        idIncidenciaPersonal: null,
        origenRegistro: 'MANUAL',
      }),
    );
  });

  it('should reject duplicate sequence conflicts', async () => {
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
      contarPorPlanificacion: jest.fn(),
      existeAsignacionPersonalEnServicio: jest.fn().mockResolvedValue(true),
      existeAsignacionPersonalEnDepartamento: jest.fn(),
      listarAsignacionesDisponiblesPorDepartamento: jest.fn(),
      existeCalendarioEnRango: jest.fn().mockResolvedValue(true),
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 20,
        idServicio: 2,
        codigo: 'TUR-URG-M',
        nombre: 'Urgencias manana',
        duracionHoras: 6,
        activo: true,
      }),
      obtenerIncidenciaPersonalValidacion: jest.fn(),
      existeIncidenciaPersonal: jest.fn(),
      existeConflictoSecuencia: jest.fn().mockResolvedValue(true),
      crear: jest.fn(),
      actualizar: jest.fn(),
      obtenerEstadoCeldaMatriz: jest.fn(),
      aplicarCeldaMatrizRapida: jest.fn(),
      eliminar: jest.fn(),
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
    };

    const useCase = new CrearRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
    );

    await expect(
      useCase.execute(10, {
        idAsignacionPersonal: 100,
        idCalendario: 501,
        secuenciaDia: 1,
        idTurno: 20,
        horasProgramadas: 6,
        idUsuarioOperacion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
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

    const useCase = new CrearRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
    );

    await expect(
      useCase.execute(999, {
        idAsignacionPersonal: 100,
        idCalendario: 501,
        secuenciaDia: 1,
        idTurno: 20,
        horasProgramadas: 6,
        idUsuarioOperacion: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should resolve idCodigoOperativoServicio and ignore horas sent by frontend', async () => {
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

    const crear = jest.fn().mockResolvedValue({
      id: 901,
      idPlanificacion: 10,
      idAsignacionPersonal: 100,
      idCalendario: 501,
      fecha: new Date('2026-05-01T00:00:00.000Z'),
      diaMes: 1,
      diaSemanaNombre: 'Viernes',
      secuenciaDia: 1,
      idTurno: 25,
      codigoTurno: 'M',
      nombreTurno: 'Manana',
      idIncidenciaPersonal: null,
      codigoIncidenciaPersonal: null,
      nombreIncidenciaPersonal: null,
      horasProgramadas: 12,
      origenRegistro: 'MANUAL',
      idPersonal: 1,
      codigoPersonal: 'PER-001',
      nombreCompleto: 'Ana Maria Rojas Lopez',
    });

    const rolTurnoRepository: RolTurnoRepository = {
      listarPorPlanificacion: jest.fn(),
      listarResumenPersonalPorPlanificacion: jest.fn(),
      listarResumenCalendarioPorPlanificacion: jest.fn(),
      listarAsignacionesDisponiblesPorServicio: jest.fn(),
      obtenerPorIdEnPlanificacion: jest.fn(),
      contarPorPlanificacion: jest.fn(),
      existeAsignacionPersonalEnServicio: jest.fn().mockResolvedValue(true),
      existeAsignacionPersonalEnDepartamento: jest.fn(),
      listarAsignacionesDisponiblesPorDepartamento: jest.fn(),
      existeCalendarioEnRango: jest.fn().mockResolvedValue(true),
      obtenerTurnoValidacion: jest.fn().mockResolvedValue({
        id: 25,
        idServicio: 2,
        codigo: 'M',
        nombre: 'Manana',
        duracionHoras: 12,
        activo: true,
      }),
      obtenerIncidenciaPersonalValidacion: jest.fn(),
      existeIncidenciaPersonal: jest.fn(),
      existeConflictoSecuencia: jest.fn().mockResolvedValue(false),
      crear,
      actualizar: jest.fn(),
      obtenerEstadoCeldaMatriz: jest.fn(),
      aplicarCeldaMatrizRapida: jest.fn(),
      eliminar: jest.fn(),
      copiarRegistrosDesdePlanificacionBase: jest.fn(),
    };

    (
      configuracionOperativaServicioRepository.resolverCodigoOperativoEnPlanificacion as jest.Mock
    ).mockResolvedValueOnce({
      id: 1001,
      idFamiliaLaboral: null,
      origen: 'TURNO',
      idTurno: 25,
      idIncidenciaPersonal: null,
      codigoInterno: 'M',
      codigoVisual: 'N12',
      etiqueta: 'Nocturno especial',
      descripcion: 'Turno resuelto desde configuracion',
      horasEquivalentes: 12,
      categoria: 'TRABAJO',
      color: '#000000',
      ordenVisual: 1,
      esLaborable: true,
      requiereConfirmacion: false,
      activo: true,
    });

    const useCase = new CrearRolTurnoPlanificacionUseCase(
      planificacionRepository,
      rolTurnoRepository,
      configuracionOperativaServicioRepository,
    );

    await useCase.execute(10, {
      idAsignacionPersonal: 100,
      idCalendario: 501,
      secuenciaDia: 1,
      idCodigoOperativoServicio: 1001,
      horasProgramadas: 1,
      idUsuarioOperacion: 1,
    });

    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({
        idTurno: 25,
        idIncidenciaPersonal: null,
        horasProgramadas: 12,
      }),
    );
  });
});
