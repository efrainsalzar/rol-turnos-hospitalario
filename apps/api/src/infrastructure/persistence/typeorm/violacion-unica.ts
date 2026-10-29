import { QueryFailedError } from 'typeorm';

// SQL Server 2627: violacion de constraint UNIQUE. 2601: violacion de indice
// UNIQUE. Compatible con SQL Server 2008 R2 y versiones modernas.
const ERRORES_UNICIDAD = new Set([2627, 2601]);

/**
 * Si el error es una violacion de unicidad, devuelve el nombre de la
 * restriccion o indice violado (o '' si el mensaje no lo trae); si no, null.
 * Sirve para traducir el error de base a un mensaje que el usuario entienda
 * en vez de dejar pasar el texto de SQL Server.
 */
export function obtenerRestriccionUnicaViolada(error: unknown): string | null {
  if (!(error instanceof QueryFailedError)) {
    return null;
  }

  const driverError = (
    error as { driverError?: { number?: number; message?: string } }
  ).driverError;

  if (!driverError?.number || !ERRORES_UNICIDAD.has(driverError.number)) {
    return null;
  }

  // Todas las restricciones del proyecto usan el prefijo `uq_`; buscarlo por
  // nombre funciona aunque SQL Server este configurado en otro idioma.
  const mensaje = driverError.message ?? '';
  const nombre =
    /'(uq_[^']+)'/i.exec(mensaje) ??
    /(?:constraint|index) '([^']+)'/i.exec(mensaje);
  return nombre?.[1] ?? '';
}
