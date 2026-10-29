import { TurnoResponseDto } from '../../../operacion/application/dto/turno-response.dto';
import { TipoServicio } from '../../domain/entities/servicio';

export interface ServicioDetalleResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipoServicio: TipoServicio;
  activo: boolean;
  departamento: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  };
  cantidadPersonalActivo: number;
  jefaServicio: {
    idPersonal: number;
    codigoPersonal: string | null;
    nombreCompleto: string;
    codigoRolFuncional: string | null;
    nombreRolFuncional: string | null;
  } | null;
  turnos: TurnoResponseDto[];
}
