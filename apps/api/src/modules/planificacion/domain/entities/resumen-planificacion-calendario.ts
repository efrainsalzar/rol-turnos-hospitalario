export interface ResumenPlanificacionCalendario {
  idCalendario: number;
  fecha: Date;
  anio: number;
  mes: number;
  diaMes: number;
  diaSemanaNombre: string;
  esFinSemana: boolean;
  esFeriado: boolean;
  codigoFeriado: string | null;
  nombreFeriado: string | null;
  totalRegistros: number;
  totalTurnos: number;
  totalIncidenciasPersonales: number;
  totalPersonasProgramadas: number;
  totalHorasProgramadas: number;
}
