import { createHash } from 'node:crypto';
import {
  PersonaExterna,
  PersonaExternaEvaluada,
} from '../entities/persona-externa';

// Longitud de `personal.documento_identidad` en la base local.
const LONGITUD_MAXIMA_DOCUMENTO = 30;

export interface IdentidadesLocales {
  // external_id ya vinculados a esta fuente en `personal_fuente`.
  vinculados: ReadonlySet<string>;
  // documento normalizado -> personal.id del personal local.
  documentosLocales: ReadonlyMap<string, number>;
}

export function normalizarTexto(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizarDocumento(value: string | null): string | null {
  const normalized = normalizarTexto(value);
  return normalized ? normalized.replace(/\s+/g, '').toUpperCase() : null;
}

/**
 * Normaliza, valida y clasifica todas las personas de una lectura. La
 * clasificacion depende del lote completo (duplicados y documentos repetidos
 * dentro del origen), por eso no se evalua registro por registro.
 */
export function evaluarPersonasExternas(
  personas: PersonaExterna[],
  identidades: IdentidadesLocales,
): PersonaExternaEvaluada[] {
  const evaluadas = personas.map((persona) =>
    normalizarPersona(persona, identidades),
  );
  const externalIds = new Set<string>();
  const documentos = new Map<string, number>();

  for (const persona of evaluadas) {
    if (persona.documentoNormalizado) {
      documentos.set(
        persona.documentoNormalizado,
        (documentos.get(persona.documentoNormalizado) ?? 0) + 1,
      );
    }
  }

  for (const persona of evaluadas) {
    if (persona.estado === 'VALIDO' && externalIds.has(persona.externalId)) {
      marcar(
        persona,
        'DUPLICADO',
        'DUPLICADO',
        'Identificador externo repetido en el origen',
      );
    }
    externalIds.add(persona.externalId);

    if (
      persona.estado === 'VALIDO' &&
      persona.documentoNormalizado &&
      (documentos.get(persona.documentoNormalizado) ?? 0) > 1
    ) {
      marcar(
        persona,
        'CONFLICTO',
        'CONFLICTO',
        'Documento de identidad repetido en el origen',
      );
    }

    // Misma regla que la API aplica al crear personal a mano: no puede haber
    // dos personas con el mismo documento. Si ya existe localmente sin
    // vinculo con esta fuente, decidir si es la misma persona es tarea humana.
    const idPersonalLocal = persona.documentoNormalizado
      ? identidades.documentosLocales.get(persona.documentoNormalizado)
      : undefined;
    if (
      persona.estado === 'VALIDO' &&
      !persona.yaVinculada &&
      idPersonalLocal !== undefined
    ) {
      marcar(
        persona,
        'CONFLICTO',
        'DOCUMENTO_EXISTE_LOCAL',
        `Documento de identidad ya registrado en personal local (id ${idPersonalLocal}) sin vinculo con esta fuente`,
      );
    }
  }

  return evaluadas;
}

function normalizarPersona(
  persona: PersonaExterna,
  identidades: IdentidadesLocales,
): PersonaExternaEvaluada {
  const externalId = persona.externalId?.trim() ?? '';
  const nombres = normalizarTexto(persona.nombres);
  const apellidoPaterno = normalizarTexto(persona.apellidoPaterno);
  const apellidoMaterno = normalizarTexto(persona.apellidoMaterno);
  const documentoIdentidad = normalizarTexto(persona.documentoIdentidad);
  const errores: string[] = [];

  if (!externalId) errores.push('identificador externo vacio');
  if (!nombres) errores.push('nombres vacio');
  if (!apellidoPaterno) errores.push('apellido paterno vacio');
  if (!documentoIdentidad) errores.push('documento de identidad vacio');
  if (
    documentoIdentidad &&
    documentoIdentidad.length > LONGITUD_MAXIMA_DOCUMENTO
  ) {
    errores.push(
      `documento de identidad supera VARCHAR(${LONGITUD_MAXIMA_DOCUMENTO}) local`,
    );
  }

  return {
    externalId,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    documentoIdentidad,
    documentoNormalizado: normalizarDocumento(persona.documentoIdentidad),
    hash: calcularHashPersona(
      externalId,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      documentoIdentidad,
    ),
    estado: errores.length > 0 ? 'ERROR' : 'VALIDO',
    tipoConflicto: errores.length > 0 ? 'ERROR' : null,
    mensaje: errores.length > 0 ? errores.join('; ') : null,
    yaVinculada: externalId !== '' && identidades.vinculados.has(externalId),
  };
}

// El nombre de las claves forma parte del hash: cambiarlo invalida la
// comparacion con los `source_record_hash` ya guardados en staging.
function calcularHashPersona(
  externalId: string,
  nombre: string | null,
  apellidoPaterno: string | null,
  apellidoMaterno: string | null,
  documentoIdentidad: string | null,
): string {
  const payload = JSON.stringify({
    externalId,
    nombre,
    apellidoPaterno,
    apellidoMaterno,
    documentoIdentidad,
  });
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

function marcar(
  persona: PersonaExternaEvaluada,
  estado: PersonaExternaEvaluada['estado'],
  tipoConflicto: string,
  mensaje: string,
): void {
  persona.estado = estado;
  persona.tipoConflicto = tipoConflicto;
  persona.mensaje = mensaje;
}
