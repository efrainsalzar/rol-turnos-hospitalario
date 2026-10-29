export interface ResumenPlanificacionPersonalResponseDto {
  idAsignacionPersonal: number;
  idPersonal: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  idServicio: number | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  totalRegistros: number;
  totalTurnos: number;
  totalIncidenciasPersonales: number;
  totalDiasProgramados: number;
  totalHorasProgramadas: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
}
