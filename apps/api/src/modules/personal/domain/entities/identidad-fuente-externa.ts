// Identifica de que sistema y entidad externa proviene un identificador
// (`personal_fuente.source_system` / `source_entity`).
export interface FuenteExternaPersonal {
  sourceSystem: string;
  sourceEntity: string;
}

export interface IdentidadesPorFuente {
  // external_id -> personal.id ya vinculados a esta fuente.
  vinculados: Map<string, number>;
  // documento normalizado -> personal.id, para todo el personal local.
  documentosLocales: Map<string, number>;
}

export interface RegistroPersonalDesdeFuente {
  externalId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  documentoNormalizado: string;
}

export type ResultadoRegistroPersonalDesdeFuente =
  | { externalId: string; resultado: 'CREADO'; idPersonal: number }
  | { externalId: string; resultado: 'VINCULO_EXISTENTE'; idPersonal: number }
  | {
      externalId: string;
      resultado: 'DOCUMENTO_EXISTE_LOCAL';
      idPersonalExistente: number;
    };

export interface OpcionesRegistroPersonalDesdeFuente {
  activoPorDefecto: boolean;
}

// Misma normalizacion que se usa para detectar documentos repetidos en el
// origen: el valor mostrado al usuario nunca se modifica, solo se compara.
export function normalizarDocumentoIdentidad(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\s+/g, '').toUpperCase() : null;
}
