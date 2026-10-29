import type { AlcancePlanificacionUsuario } from '../../domain/entities/usuario-sesion';
import type { UsuarioCapacidadesOperativas } from '../../domain/entities/usuario-capacidades';
import type { UsuarioPermisosOperativos } from '../../domain/entities/usuario-permisos';

export interface RolSeguridadResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  alcancePlanificacion: AlcancePlanificacionUsuario;
  permisos: UsuarioPermisosOperativos;
  capacidades: UsuarioCapacidadesOperativas;
}
