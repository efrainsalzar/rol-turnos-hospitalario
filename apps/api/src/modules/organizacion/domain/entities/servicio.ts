export type TipoServicio = 'SERVICIO' | 'UNIDAD';

export interface Servicio {
  id: number;
  idDepartamento: number;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipoServicio: TipoServicio;
  cantidadPersonalActivo: number;
  activo: boolean;
}
