export interface Calendario {
  id: number;
  fecha: Date;
  anio: number;
  mes: number;
  diaMes: number;
  diaSemanaNum: number;
  diaSemanaNombre: string;
  semanaMes: number | null;
  esFinSemana: boolean;
  esFeriado: boolean;
  codigoFeriado: string | null;
  nombreFeriado: string | null;
}
