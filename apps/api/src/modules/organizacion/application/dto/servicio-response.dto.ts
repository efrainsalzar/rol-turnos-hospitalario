import { TipoServicio } from '../../domain/entities/servicio';

export interface ServicioResponseDto {
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
