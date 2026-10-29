export interface TramoResponseDto {
  id: number;
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
  activo: boolean;
}

export interface TurnoResponseDto {
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
  tipoHorario: 'CONTINUO' | 'DISCONTINUO';
  horaInicio: string;
  horaFin: string;
  cruzaMedianoche: boolean;
  duracionHoras: number;
  tramos: TramoResponseDto[];
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  activo: boolean;
}
