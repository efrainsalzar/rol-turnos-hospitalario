// Modelo canonico de una persona leida de cualquier fuente de personal. Los
// nombres propios de cada sistema (por ejemplo el codigo interno de un sistema de RRHH) no
// pasan de su adaptador: el resto del modulo solo conoce este contrato.
export interface PersonaExterna {
  externalId: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  documentoIdentidad: string | null;
}

export type EstadoEvaluacionPersona =
  | 'VALIDO'
  | 'ERROR'
  | 'DUPLICADO'
  | 'CONFLICTO';

export interface PersonaExternaEvaluada {
  externalId: string;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  documentoIdentidad: string | null;
  documentoNormalizado: string | null;
  hash: string;
  estado: EstadoEvaluacionPersona;
  // Clasificacion persistida en `integracion_conflicto.tipo`; nula si VALIDO.
  tipoConflicto: string | null;
  mensaje: string | null;
  yaVinculada: boolean;
}
