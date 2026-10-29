export interface InstitutionEnv {
  name: string;
  headerLines: string[];
}

const DEFAULT_NAME = 'SISTEMA DE ROLES Y TURNOS';

export function readInstitutionEnv(): InstitutionEnv {
  const name = process.env.EXPORT_INSTITUTION_NAME?.trim() || DEFAULT_NAME;
  const headerLines = parseHeaderLines(
    process.env.EXPORT_INSTITUTION_HEADER_LINES,
  );

  return { name, headerLines };
}

function parseHeaderLines(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split('|')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
