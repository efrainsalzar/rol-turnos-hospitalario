import type { TurnoTramo } from '../../../operacion/domain/entities/turno-tramo';

export type OrigenRegistroRolTurno =
  | 'MANUAL'
  | 'PLANTILLA'
  | 'AJUSTE'
  | 'CAMBIO';

export interface RolTurnoPlanificacion {
  id: number;
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  fecha: Date;
  diaMes: number;
  diaSemanaNombre: string;
  secuenciaDia: number;
  idTurno: number | null;
  codigoTurno: string | null;
  nombreTurno: string | null;
  tipoHorario?: 'CONTINUO' | 'DISCONTINUO' | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  cruzaMedianoche?: boolean | null;
  tramos?: TurnoTramo[];
  idIncidenciaPersonal: number | null;
  codigoIncidenciaPersonal: string | null;
  nombreIncidenciaPersonal: string | null;
  horasProgramadas: number;
  origenRegistro: OrigenRegistroRolTurno;
  idPersonal: number;
  codigoPersonal: string | null;
  nroItem?: string | null;
  idCargaHoraria?: number | null;
  codigoCargaHoraria?: string | null;
  nombreCargaHoraria?: string | null;
  horasDiaBase?: number | null;
  ci?: string | null;
  idTipoContrato?: number | null;
  codigoTipoContrato?: string | null;
  nombreTipoContrato?: string | null;
  codigoFuenteItem?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  nombres?: string | null;
  nombreCompleto: string;
  cargoActual?: string | null;
  rolFuncionalCodigo?: string | null;
  rolFuncionalNombre?: string | null;
  esJefatura?: boolean;
  servicioCodigo?: string | null;
  servicioNombre?: string | null;
  observacionMensual?: string | null;
  /**
   * Codigo/etiqueta visual ya congelados en el historial de una
   * planificacion CERRADA. Cuando vienen presentes, tienen prioridad sobre
   * la resolucion en vivo via `codigo_operativo_servicio` porque
   * representan lo que se veia en el momento del cierre, no lo que el
   * catalogo muestra hoy.
   */
  codigoVisualCongelado?: string | null;
  etiquetaVisualCongelada?: string | null;
}
