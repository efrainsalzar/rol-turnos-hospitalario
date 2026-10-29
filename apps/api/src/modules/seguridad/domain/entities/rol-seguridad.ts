import type { AlcancePlanificacionUsuario } from './usuario-sesion';
import type { UsuarioCapacidadesOperativas } from './usuario-capacidades';
import type { UsuarioPermisosOperativos } from './usuario-permisos';

export interface RolSeguridad {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  alcancePlanificacion: AlcancePlanificacionUsuario;
  permisos: UsuarioPermisosOperativos;
  capacidades: UsuarioCapacidadesOperativas;
}
