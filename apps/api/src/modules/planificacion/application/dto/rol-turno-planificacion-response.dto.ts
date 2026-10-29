export interface RolTurnoPlanificacionResponseDto {
  id: number;
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  fecha: string;
  diaMes: number;
  diaSemanaNombre: string;
  secuenciaDia: number;
  idTurno: number | null;
  codigoTurno: string | null;
  nombreTurno: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  cruzaMedianoche?: boolean | null;
  idIncidenciaPersonal: number | null;
  codigoIncidenciaPersonal: string | null;
  nombreIncidenciaPersonal: string | null;
  horasProgramadas: number;
  origenRegistro: string;
  idPersonal: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
}
