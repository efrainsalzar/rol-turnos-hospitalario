import type { TurnoTramo } from './turno-tramo';

export type TipoHorario = 'CONTINUO' | 'DISCONTINUO';

export interface Turno {
  id: number;
  idServicio: number | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  idDepartamento: number | null;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  codigo: string;
  nombre: string;
  codigoVisual: string | null;
  etiquetaVisual: string | null;
  tipoHorario: TipoHorario;
  horaInicio: string;
  horaFin: string;
  cruzaMedianoche: boolean;
  duracionHoras: number;
  tramos: TurnoTramo[];
  vigenciaDesde: Date;
  vigenciaHasta: Date | null;
  activo: boolean;
}
