export interface CargaHoraria {
  id: number;
  codigo: string;
  nombre: string;
  horasDiaBase: number;
  descripcion: string | null;
  activo: boolean;
}
