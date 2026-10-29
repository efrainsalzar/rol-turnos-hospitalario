export interface ConflictoPlanificacionAsignacionResponseDto {
  idAsignacion: number;
  tieneConflicto: boolean;
  unidadNombre: string | null;
  periodo: string | null;
  tienePlanificacionAprobada: boolean;
  planificacionAprobada: {
    id: number;
    unidadNombre: string;
    periodo: string;
  } | null;
  // null cuando el caller no envio unidad destino a evaluar (todavia no se elige
  // destino, o el cambio no implica traslado de unidad). Si se envio, siempre
  // viene resuelto (tienePlanificacionAprobada en false cuando no hay una).
  destino: {
    tienePlanificacionAprobada: boolean;
    planificacionAprobada: {
      id: number;
      unidadNombre: string;
      periodo: string;
    } | null;
  } | null;
}
