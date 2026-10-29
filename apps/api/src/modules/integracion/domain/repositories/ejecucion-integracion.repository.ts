import {
  CierreEjecucionIntegracion,
  FuenteIntegracion,
  NuevaEjecucionIntegracion,
} from '../entities/ejecucion-integracion';

export interface BloqueoIntegracion {
  liberar(): Promise<void>;
}

export abstract class EjecucionIntegracionRepository {
  // null si otra ejecucion de la misma fuente ya tiene el bloqueo.
  abstract adquirirBloqueo(
    fuente: FuenteIntegracion,
  ): Promise<BloqueoIntegracion | null>;

  // Con el bloqueo tomado, cualquier ejecucion que siga INICIADA quedo
  // huerfana (proceso detenido a mitad de camino). Devuelve cuantas cerro.
  abstract cerrarInterrumpidas(fuente: FuenteIntegracion): Promise<number>;

  abstract obtenerUltimaValidacionAplicable(
    fuente: FuenteIntegracion,
  ): Promise<number | null>;

  abstract obtenerUltimaValidacion(
    fuente: FuenteIntegracion,
  ): Promise<number | null>;

  abstract crear(ejecucion: NuevaEjecucionIntegracion): Promise<number>;

  abstract cerrar(
    ejecucionId: number,
    cierre: CierreEjecucionIntegracion,
  ): Promise<void>;

  abstract marcarError(ejecucionId: number, mensaje: string): Promise<void>;
}
