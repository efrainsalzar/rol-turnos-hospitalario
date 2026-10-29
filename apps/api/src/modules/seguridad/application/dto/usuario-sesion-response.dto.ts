import type { AlcancePlanificacionUsuario } from '../../domain/entities/usuario-sesion';
import type { UsuarioPermisosOperativos } from '../../domain/entities/usuario-permisos';
import type { UsuarioCapacidadesOperativas } from '../../domain/entities/usuario-capacidades';

export interface UsuarioSesionResponseDto {
  id: number;
  username: string;
  tipoUsuario: string;
  proveedorAutenticacion: string;
  sujetoAutenticacion: string | null;
  identidadLocalHabilitada: boolean;
  activo: boolean;
  rolSeguridad: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  personal: {
    id: number | null;
    codigoPersonal: string | null;
    nombreCompleto: string | null;
  };
  alcancePlanificacion: AlcancePlanificacionUsuario;
  puedeGestionarPlanificacion: boolean;
  puedeGestionarTodo: boolean;
  permisos: UsuarioPermisosOperativos;
  capacidades?: UsuarioCapacidadesOperativas;
  departamentosGestionables: Array<{
    id: number;
    codigo: string;
    nombre: string;
  }>;
  serviciosGestionables: Array<{
    id: number;
    idDepartamento: number;
    codigo: string;
    nombre: string;
    codigoDepartamento: string | null;
    nombreDepartamento: string | null;
  }>;
}
