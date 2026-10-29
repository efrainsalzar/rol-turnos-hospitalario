import { SesionEdicionPlanificacion } from '../entities/sesion-edicion-planificacion';

/** Sin latido durante este tiempo, la sesion se trata como libre (housekeeping perezoso, sin job en segundo plano). */
export const MINUTOS_EXPIRACION_SESION_EDICION = 10;

export interface IntentoAdquisicionSesionEdicion {
  sesion: SesionEdicionPlanificacion;
  /** true si el actor quedo con el control (ya lo tenia, o la sesion estaba libre/vencida). */
  controlPropio: boolean;
}

/**
 * Control de edicion exclusiva por planificacion (una sola persona escribe a
 * la vez, el resto queda en solo lectura). El vencimiento por inactividad de
 * latido (10 minutos) y la decision de "quien puede tomar el control" NO
 * viven aqui: el vencimiento lo resuelve cada implementacion al leer/escribir
 * (housekeeping perezoso, mismo criterio que cerrarSiVencida para
 * planificaciones), y la jerarquia de rango la aplica el caso de uso antes de
 * llamar a forzarControl.
 */
export abstract class SesionEdicionPlanificacionRepository {
  abstract obtenerActiva(
    idPlanificacion: number,
  ): Promise<SesionEdicionPlanificacion | null>;

  /**
   * Registra un latido de mantenimiento/adquisicion: si no hay sesion activa
   * (nunca existio o vencio por inactividad) o si ya pertenece al mismo
   * usuario, adquiere/renueva y controlPropio=true. Si pertenece a otro
   * usuario con sesion activa, no modifica nada y devuelve esa sesion con
   * controlPropio=false para que el caso de uso decida si es un 409.
   */
  abstract intentarAdquirirOLatir(
    idPlanificacion: number,
    idUsuarioEditor: number,
  ): Promise<IntentoAdquisicionSesionEdicion>;

  /** Reemplaza el control sin condicion; el caso de uso ya valido el rango. */
  abstract forzarControl(
    idPlanificacion: number,
    idUsuarioEditor: number,
  ): Promise<SesionEdicionPlanificacion>;

  /** Libera solo si la sesion activa pertenece a idUsuarioEditor. */
  abstract liberar(
    idPlanificacion: number,
    idUsuarioEditor: number,
  ): Promise<void>;

  /** Libera cualquier sesion que tenga abierta el usuario, sin importar la planificacion (logout). */
  abstract liberarTodasDeUsuario(idUsuarioEditor: number): Promise<void>;
}
