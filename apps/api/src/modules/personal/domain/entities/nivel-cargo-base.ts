export interface NivelCargoBase {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}
