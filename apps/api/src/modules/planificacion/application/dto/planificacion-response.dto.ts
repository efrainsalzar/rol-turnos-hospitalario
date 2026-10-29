import { EstadoPlanificacion } from '../../domain/entities/planificacion';

export interface PlanificacionResponseDto {
  id: number;
  idServicio: number | null;
  idDepartamento: number | null;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  cantidadPersonalPlanificable: number;
  anio: number;
  mes: number;
  version: number;
  estado: EstadoPlanificacion;
  activo: boolean;
  fechaInicio: string;
  fechaFin: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  createdAt: string;
  updatedAt: string;
}
