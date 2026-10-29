export interface TurnoTramo {
  id: number;
  idTurno: number;
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
  activo: boolean;
}
