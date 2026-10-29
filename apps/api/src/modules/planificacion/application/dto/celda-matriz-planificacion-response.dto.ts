export interface CeldaMatrizPlanificacionResponseDto {
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
