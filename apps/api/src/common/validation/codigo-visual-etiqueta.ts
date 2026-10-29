// El codigo visual y la etiqueta son un apodo opcional para la matriz: si se define
// uno, el otro tambien es obligatorio (nunca queda asimetrico), ver docs/database/decisiones-tecnicas.md.
export const CODIGO_VISUAL_PATTERN = /^[A-Z]{1,4}$/;

export function trimIfString({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function noVacio(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

// Entrada no tipada a proposito: ValidateIf corre antes que los validadores de
// tipo, asi que un cliente malformado puede mandar codigoVisual/etiqueta como
// no-string.
export function tieneOverrideVisual(o: {
  codigoVisual?: unknown;
  etiqueta?: unknown;
}): boolean {
  return noVacio(o.codigoVisual) || noVacio(o.etiqueta);
}
