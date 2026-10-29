import type { UsuarioPermisosOperativos } from './usuario-permisos';
import type { UsuarioCapacidadesOperativas } from './usuario-capacidades';

export type AlcancePlanificacionUsuario =
  | 'SISTEMA'
  | 'DEPARTAMENTO'
  | 'SERVICIO'
  | 'LECTURA';

export interface DepartamentoGestionableUsuario {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ServicioGestionableUsuario {
  id: number;
  idDepartamento: number;
  codigo: string;
  nombre: string;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
}

export interface UsuarioSesion {
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
  departamentosGestionables: DepartamentoGestionableUsuario[];
  serviciosGestionables: ServicioGestionableUsuario[];
}
