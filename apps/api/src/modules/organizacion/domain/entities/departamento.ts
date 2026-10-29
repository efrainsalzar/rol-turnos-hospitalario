export interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  cantidadPersonalActivo: number;
}
