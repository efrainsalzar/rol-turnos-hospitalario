import { PersonaExterna } from '../../../domain/entities/persona-externa';

// Contrato de `database/integracion/rrhh-externo/persona-basico.sql`: los
// alias de salida de la consulta, no las columnas del sistema de origen.
export interface FilaPersonaRrhh {
  codigo_externo: number | string | null;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  documento_identidad: string | null;
}

export function mapearPersonaRrhh(fila: FilaPersonaRrhh): PersonaExterna {
  return {
    // Se guarda como texto porque el modelo multi-fuente admite
    // identificadores numericos o alfanumericos segun el sistema de origen.
    externalId:
      fila.codigo_externo == null ? null : String(fila.codigo_externo),
    nombres: fila.nombres,
    apellidoPaterno: fila.apellido_paterno,
    apellidoMaterno: fila.apellido_materno,
    documentoIdentidad: fila.documento_identidad,
  };
}
