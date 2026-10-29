export interface TipoFeriadoResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}
