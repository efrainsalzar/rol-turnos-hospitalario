export interface ObservacionDiariaPlanificacion {
  id: number;
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  idRolTurno: number | null;
  tipoObservacion: string;
  descripcion: string;
  createdBy: number;
  createdAt: Date;
}
