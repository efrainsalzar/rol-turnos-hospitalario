import type { ObservacionMensualPlanificacionResponseDto } from '../dto/observacion-mensual-planificacion-response.dto';
import type { ObservacionMensualPlanificacion } from '../../domain/entities/observacion-mensual-planificacion';

export function mapObservacionMensualPlanificacionToResponse(
  observacion: ObservacionMensualPlanificacion,
): ObservacionMensualPlanificacionResponseDto {
  return {
    id: observacion.id,
    idPlanificacion: observacion.idPlanificacion,
    idAsignacionPersonal: observacion.idAsignacionPersonal,
    tipoObservacion: observacion.tipoObservacion,
    descripcion: observacion.descripcion,
    createdBy: observacion.createdBy,
    createdAt: observacion.createdAt.toISOString(),
  };
}
