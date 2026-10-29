import type { AlcancePlanificacionUsuario } from '../entities/usuario-sesion';
import type { UsuarioCapacidadesOperativas } from '../entities/usuario-capacidades';
import type { UsuarioPermisosOperativos } from '../entities/usuario-permisos';
import { RolSeguridad } from '../entities/rol-seguridad';

export interface GuardarRolSeguridadInput {
  codigo: string;
  nombre: string;
  activo?: boolean;
  alcancePlanificacion: AlcancePlanificacionUsuario;
  permisos: UsuarioPermisosOperativos;
  capacidades: UsuarioCapacidadesOperativas;
}

export abstract class RolSeguridadRepository {
  abstract listar(): Promise<RolSeguridad[]>;

  abstract obtenerPorId(id: number): Promise<RolSeguridad | null>;

  abstract crear(input: GuardarRolSeguridadInput): Promise<RolSeguridad>;

  abstract actualizar(
    idRolSeguridad: number,
    input: GuardarRolSeguridadInput,
  ): Promise<RolSeguridad>;

  abstract activar(idRolSeguridad: number): Promise<void>;

  abstract desactivar(idRolSeguridad: number): Promise<void>;
}
