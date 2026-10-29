export interface Feriado {
  id: number;
  idTipoFeriado: number;
  codigoTipoFeriado: string;
  nombreTipoFeriado: string;
  nombre: string;
  anio: number;
  mes: number;
  fechaInicio: Date;
  fechaFin: Date;
  activo: boolean;
}
