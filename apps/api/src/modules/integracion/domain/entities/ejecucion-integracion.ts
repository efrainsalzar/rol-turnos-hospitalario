// Identifica una fuente externa (`source_system` / `source_entity`): todas
// las tablas de integracion usan este par como clave logica.
export interface FuenteIntegracion {
  sourceSystem: string;
  sourceEntity: string;
}

export type TipoEjecucionIntegracion = 'DRY_RUN' | 'APPLY';

export type OrigenEjecucionIntegracion = 'CONSOLA' | 'API' | 'PROGRAMADA';

export type EstadoCierreEjecucion =
  | 'FINALIZADA'
  | 'APLICADA_TOTAL'
  | 'APLICADA_PARCIAL';

export interface NuevaEjecucionIntegracion {
  fuente: FuenteIntegracion;
  tipo: TipoEjecucionIntegracion;
  origen: OrigenEjecucionIntegracion;
  idUsuario: number | null;
  ejecucionValidacionId: number | null;
}

export interface CierreEjecucionIntegracion {
  estado: EstadoCierreEjecucion;
  totalLeidos: number;
  totalValidos: number;
  totalAplicados: number;
  totalErrores: number;
  mensaje: string;
  modoConexion: string | null;
  origenConPermisoEscritura: boolean | null;
}

export type DetalleEjecucion = Record<string, number | string | boolean | null>;

export interface ResumenEjecucionIntegracion {
  ejecucionId: number;
  ejecucionValidacionId: number | null;
  conector: string;
  tipo: TipoEjecucionIntegracion;
  estado: EstadoCierreEjecucion;
  mensaje: string;
  detalle: DetalleEjecucion;
  advertencias: string[];
  ejecucionesInterrumpidas: number;
}
