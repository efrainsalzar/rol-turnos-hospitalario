// El codigo visual y la etiqueta son un apodo opcional para la matriz: si se
// define uno, el otro tambien es obligatorio (nunca queda asimetrico), ver
// docs/database/decisiones-tecnicas.md.
export const CODIGO_VISUAL_PATTERN = /^[A-Z]{1,4}$/;

export function sanitizarCodigoVisual(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, '');
}

export function validarParCodigoEtiqueta(codigo?: string, etiqueta?: string): string | null {
  const codigoLimpio = (codigo || '').trim();
  const etiquetaLimpia = (etiqueta || '').trim();

  if (!codigoLimpio && !etiquetaLimpia) {
    return null;
  }

  if (!codigoLimpio || !etiquetaLimpia) {
    return 'Si defines codigo visible o etiqueta, ambos son obligatorios.';
  }

  if (!CODIGO_VISUAL_PATTERN.test(codigoLimpio)) {
    return 'El codigo visible debe ser de 1 a 4 letras mayusculas (A-Z).';
  }

  return null;
}
