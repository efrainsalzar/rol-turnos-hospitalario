import {
  OrigenRegistroRolTurno,
  RolTurnoPlanificacion,
} from '../entities/rol-turno-planificacion';
import { AsignacionPlanificacionDisponible } from '../entities/asignacion-planificacion-disponible';
import { ResumenPlanificacionCalendario } from '../entities/resumen-planificacion-calendario';
import { ResumenPlanificacionPersonal } from '../entities/resumen-planificacion-personal';

export interface ListarRolTurnosPorPlanificacionFiltro {
  idAsignacionPersonal?: number;
  idCalendario?: number;
  vista?: 'ORIGINAL' | 'EFECTIVA';
}

export interface ListarResumenPersonalPorPlanificacionFiltro {
  idAsignacionPersonal?: number;
}

export interface ListarResumenCalendarioPorPlanificacionFiltro {
  idCalendario?: number;
}

export interface CrearRolTurnoPlanificacionInput {
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  secuenciaDia: number;
  idTurno: number | null;
  idIncidenciaPersonal: number | null;
  horasProgramadas: number;
  origenRegistro: OrigenRegistroRolTurno;
  idUsuarioOperacion: number;
}

export interface ActualizarRolTurnoPlanificacionInput extends CrearRolTurnoPlanificacionInput {
  idRolTurno: number;
}

export interface RegistroCeldaMatrizExistente {
  idRolTurno: number;
  secuenciaDia: number;
  idTurno: number | null;
  idIncidenciaPersonal: number | null;
  horasProgramadas: number;
}

export interface EstadoCeldaMatrizPlanificacion {
  asignacionValida: boolean;
  calendarioValido: boolean;
  registros: RegistroCeldaMatrizExistente[];
}

export interface AplicarCeldaMatrizRapidaInput {
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  secuenciaDia: number;
  idTurno: number | null;
  idIncidenciaPersonal: number | null;
  horasProgramadas: number;
  origenRegistro: OrigenRegistroRolTurno;
  idUsuarioOperacion: number;
  limpiar: boolean;
  idPlanificacionCambio?: number | null;
}

export interface CeldaMatrizPersistida {
  idRolTurno: number | null;
  secuenciaDia: number | null;
  idTurno: number | null;
  codigoTurno: string | null;
  nombreTurno: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  cruzaMedianoche: boolean | null;
  idIncidenciaPersonal: number | null;
  codigoIncidenciaPersonal: string | null;
  nombreIncidenciaPersonal: string | null;
  horasProgramadas: number | null;
}

export interface VerificarConflictoRolTurnoInput {
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  secuenciaDia: number;
  excluirIdRolTurno?: number;
}

export type ModoCargaRolTurnoDesdeBase = 'REEMPLAZAR' | 'COMPLEMENTAR';

export interface CopiarRegistrosDesdePlanificacionBaseInput {
  idPlanificacionObjetivo: number;
  idPlanificacionBase: number;
  idUsuarioOperacion: number;
  modoCarga: ModoCargaRolTurnoDesdeBase;
}

export interface ResultadoCopiaRegistrosPlanificacion {
  idPlanificacion: number;
  idPlanificacionBase: number;
  modoCarga: ModoCargaRolTurnoDesdeBase;
  totalRegistrosOrigen: number;
  totalRegistrosInsertados: number;
  totalRegistrosOmitidosPorConflicto: number;
  totalRegistrosOmitidosPorCalendario: number;
  totalRegistrosOmitidosPorAsignacion: number;
  totalRegistrosOmitidosPorTurnoOIncidenciaPersonal: number;
  totalRegistrosEliminadosPrevios: number;
}

export interface TurnoValidacion {
  id: number;
  idServicio: number;
  codigo: string;
  nombre: string;
  horaInicio: string;
  horaFin: string;
  cruzaMedianoche: boolean;
  duracionHoras: number;
  activo: boolean;
}

export interface IncidenciaPersonalValidacion {
  id: number;
  codigo: string;
  nombre: string;
  alcance: 'GENERAL' | 'PERSONAL' | 'OTRO';
  activo: boolean;
}

export abstract class RolTurnoRepository {
  abstract listarPorPlanificacion(
    idPlanificacion: number,
    filtro: ListarRolTurnosPorPlanificacionFiltro,
  ): Promise<RolTurnoPlanificacion[]>;

  abstract listarResumenPersonalPorPlanificacion(
    idPlanificacion: number,
    filtro: ListarResumenPersonalPorPlanificacionFiltro,
  ): Promise<ResumenPlanificacionPersonal[]>;

  abstract listarResumenCalendarioPorPlanificacion(
    idPlanificacion: number,
    filtro: ListarResumenCalendarioPorPlanificacionFiltro,
  ): Promise<ResumenPlanificacionCalendario[]>;

  abstract listarAsignacionesDisponiblesPorServicio(
    idServicio: number,
  ): Promise<AsignacionPlanificacionDisponible[]>;

  listarAsignacionesDisponiblesPorDepartamento(
    idDepartamento: number,
  ): Promise<AsignacionPlanificacionDisponible[]> {
    throw new Error(
      `listarAsignacionesDisponiblesPorDepartamento no implementado para departamento=${idDepartamento}.`,
    );
  }

  existeAsignacionPersonalEnDepartamento(
    idAsignacionPersonal: number,
    idDepartamento: number,
  ): Promise<boolean> {
    throw new Error(
      `existeAsignacionPersonalEnDepartamento no implementado para asignacion=${idAsignacionPersonal}, departamento=${idDepartamento}.`,
    );
  }

  abstract obtenerPorIdEnPlanificacion(
    idPlanificacion: number,
    idRolTurno: number,
  ): Promise<RolTurnoPlanificacion | null>;

  abstract contarPorPlanificacion(idPlanificacion: number): Promise<number>;

  abstract existeAsignacionPersonalEnServicio(
    idAsignacionPersonal: number,
    idServicio: number,
  ): Promise<boolean>;

  abstract existeCalendarioEnRango(
    idCalendario: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<boolean>;

  abstract obtenerTurnoValidacion(
    idTurno: number,
  ): Promise<TurnoValidacion | null>;

  abstract obtenerIncidenciaPersonalValidacion(
    idIncidenciaPersonal: number,
  ): Promise<IncidenciaPersonalValidacion | null>;

  abstract existeIncidenciaPersonal(
    idIncidenciaPersonal: number,
  ): Promise<boolean>;

  abstract existeConflictoSecuencia(
    input: VerificarConflictoRolTurnoInput,
  ): Promise<boolean>;

  obtenerEstadoCeldaMatriz(
    idPlanificacion: number,
    idAsignacionPersonal: number,
    idCalendario: number,
    idServicio: number | null,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<EstadoCeldaMatrizPlanificacion> {
    throw new Error(
      `obtenerEstadoCeldaMatriz no implementado para planificacion=${idPlanificacion}, asignacion=${idAsignacionPersonal}, calendario=${idCalendario}, servicio=${idServicio ?? 'null'}, rango=${fechaInicio.toISOString()}..${fechaFin.toISOString()}.`,
    );
  }

  aplicarCeldaMatrizRapida(
    input: AplicarCeldaMatrizRapidaInput,
  ): Promise<CeldaMatrizPersistida> {
    throw new Error(
      `aplicarCeldaMatrizRapida no implementado para planificacion=${input.idPlanificacion}, asignacion=${input.idAsignacionPersonal}, calendario=${input.idCalendario}.`,
    );
  }

  abstract crear(
    input: CrearRolTurnoPlanificacionInput,
  ): Promise<RolTurnoPlanificacion>;

  abstract actualizar(
    input: ActualizarRolTurnoPlanificacionInput,
  ): Promise<RolTurnoPlanificacion>;

  abstract eliminar(idPlanificacion: number, idRolTurno: number): Promise<void>;

  abstract copiarRegistrosDesdePlanificacionBase(
    input: CopiarRegistrosDesdePlanificacionBaseInput,
  ): Promise<ResultadoCopiaRegistrosPlanificacion>;
}

export interface CambioDestinoPlanificacion {
  idAsignacionDestino: number;
  idCambio: number;
  fechaEfectiva: Date;
}

export interface RolTurnoPlanificacionCambioRepository {
  // Reemplaza a listarAsignacionDestinoIdsPorPlanificacionCambio (solo ids):
  // la vista ORIGINAL necesita los ids para excluir esas filas, y la vista
  // EFECTIVA necesita ademas la fecha efectiva para marcar la fila como
  // "traslado pendiente de completar" y bloquear visualmente sus celdas
  // anteriores a esa fecha — una sola consulta sirve a ambos casos.
  listarCambiosDestinoPorPlanificacion(
    idPlanificacion: number,
  ): Promise<CambioDestinoPlanificacion[]>;
  obtenerCambioDestinoParaCelda(
    idPlanificacion: number,
    idAsignacionPersonal: number,
    idCalendario: number,
  ): Promise<{ idCambio: number; fechaEfectiva: Date } | null>;
}
