import { Turno } from '../../../operacion/domain/entities/turno';
import { TipoServicio } from './servicio';

export interface ServicioDetalle {
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
  turnos: Turno[];
}
