export interface CalendarioResponseDto {
  id: number;
  fecha: string;
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
