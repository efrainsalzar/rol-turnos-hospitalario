import { Usuario } from '../entities/usuario';
import { UsuarioSesion } from '../entities/usuario-sesion';

export interface UsuarioSesionAutenticable {
  session: UsuarioSesion;
  passwordHash: string | null;
}

export interface CrearSesionActivaInput {
  idUsuario: number;
  ipOrigen?: string | null;
  userAgent?: string | null;
}

export interface SesionActivaUsuario {
  tokenSesion: string;
  session: UsuarioSesion;
}

export interface GuardarUsuarioInput {
  idPersonal?: number | null;
  idRolSeguridad?: number | null;
  tipoUsuario: string;
  username: string;
  password?: string;
}

export abstract class UsuarioRepository {
  abstract listar(): Promise<Usuario[]>;
  abstract obtenerPorId(idUsuario: number): Promise<Usuario | null>;
  abstract obtenerSesionPorId(idUsuario: number): Promise<UsuarioSesion | null>;
  abstract obtenerSesionPorUsername(
    username: string,
  ): Promise<UsuarioSesion | null>;
  abstract obtenerSesionAutenticablePorUsername(
    username: string,
  ): Promise<UsuarioSesionAutenticable | null>;
  abstract crearSesionActiva(
    input: CrearSesionActivaInput,
  ): Promise<SesionActivaUsuario>;
  abstract obtenerSesionPorToken(
    tokenSesion: string,
  ): Promise<UsuarioSesion | null>;
  abstract revocarSesionPorToken(
    tokenSesion: string,
    motivo?: string,
  ): Promise<void>;
  abstract crear(input: GuardarUsuarioInput): Promise<Usuario>;
  abstract actualizar(
    idUsuario: number,
    input: GuardarUsuarioInput,
  ): Promise<Usuario>;
  /** Cambio de password self-service: no toca el resto del perfil (a diferencia de `actualizar`) y revoca las sesiones activas, igual que el reset administrativo. */
  abstract actualizarPassword(
    idUsuario: number,
    passwordHash: string,
  ): Promise<void>;
  abstract activar(idUsuario: number): Promise<void>;
  abstract desactivar(idUsuario: number): Promise<void>;
  abstract obtenerPorPersonal(idPersonal: number): Promise<Usuario | null>;

  /** Cuenta usuarios activos con rolSeguridad activo de alcance SISTEMA y puede_gestionar_usuarios=1. */
  abstract contarAdministradoresSistemaActivos(): Promise<number>;
}
