import { Planificacion } from '../../domain/entities/planificacion';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';

export function mapPlanificacionToResponse(
  planificacion: Planificacion,
): PlanificacionResponseDto {
  return {
    id: planificacion.id,
    idServicio: planificacion.idServicio,
    idDepartamento: planificacion.idDepartamento,
    codigoDepartamento: planificacion.codigoDepartamento,
    nombreDepartamento: planificacion.nombreDepartamento,
    codigoServicio: planificacion.codigoServicio,
    nombreServicio: planificacion.nombreServicio,
    cantidadPersonalPlanificable: planificacion.cantidadPersonalPlanificable,
    anio: planificacion.anio,
    mes: planificacion.mes,
    version: planificacion.version,
    estado: planificacion.estado,
    activo: planificacion.activo,
    fechaInicio: planificacion.fechaInicio.toISOString(),
    fechaFin: planificacion.fechaFin.toISOString(),
    fechaPublicacion: planificacion.fechaPublicacion
      ? planificacion.fechaPublicacion.toISOString()
      : null,
    fechaCierre: planificacion.fechaCierre
      ? planificacion.fechaCierre.toISOString()
      : null,
    createdAt: planificacion.createdAt.toISOString(),
    updatedAt: planificacion.updatedAt.toISOString(),
  };
}
