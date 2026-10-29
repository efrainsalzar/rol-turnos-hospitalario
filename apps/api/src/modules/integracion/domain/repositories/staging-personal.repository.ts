import { FuenteIntegracion } from '../entities/ejecucion-integracion';
import { PersonaExternaEvaluada } from '../entities/persona-externa';

export interface FilaStagingPersonal {
  // Clave unica dentro de la ejecucion; difiere del identificador externo
  // solo para filas DUPLICADO o sin identificador.
  claveStaging: string;
  persona: PersonaExternaEvaluada;
}

export interface StagingPersonalValido {
  id: number;
  externalId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  documentoNormalizado: string;
}

export interface StagingPersonalObservado {
  ejecucionId: number;
  stagingId: number;
  externalId: string;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  documentoIdentidad: string | null;
  documentoNormalizado: string | null;
  estado: string;
  mensaje: string | null;
}

export abstract class StagingPersonalRepository {
  // Guarda la lectura completa y sus conflictos en una sola transaccion.
  abstract registrarLectura(
    ejecucionId: number,
    fuente: FuenteIntegracion,
    filas: FilaStagingPersonal[],
  ): Promise<void>;

  abstract listarValidos(ejecucionId: number): Promise<StagingPersonalValido[]>;

  abstract contarNoValidos(ejecucionId: number): Promise<number>;

  abstract marcarProcesados(
    stagingIds: number[],
    estado: 'APLICADO' | 'SIN_CAMBIOS',
  ): Promise<void>;

  // Conflicto descubierto recien al aplicar (el dato local cambio despues
  // de la validacion).
  abstract marcarConflictoAlAplicar(
    ejecucionAplicacionId: number,
    stagingId: number,
    tipo: string,
    detalle: string,
  ): Promise<void>;

  abstract listarObservados(
    ejecucionId: number,
  ): Promise<StagingPersonalObservado[]>;
}
