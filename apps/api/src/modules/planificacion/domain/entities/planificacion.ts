export type EstadoPlanificacion =
  | 'BORRADOR'
  | 'REVISION'
  | 'APROBADA'
  | 'CERRADA';

export interface Planificacion {
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
  fechaInicio: Date;
  fechaFin: Date;
  fechaPublicacion: Date | null;
  fechaCierre: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
