export interface ObservacionMensualPlanificacion {
  id: number;
  idPlanificacion: number;
  idAsignacionPersonal: number;
  tipoObservacion: string;
  descripcion: string;
  createdBy: number;
  createdAt: Date;
}
