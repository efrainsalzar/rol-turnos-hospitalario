export interface ResumenPlanificacionPersonal {
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
  primeraFecha: Date | null;
  ultimaFecha: Date | null;
}
