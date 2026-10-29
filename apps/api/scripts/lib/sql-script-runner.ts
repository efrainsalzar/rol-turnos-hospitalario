import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { resolveFromProjectRoot } from '../../src/infrastructure/config/project-root';

// Entornos sobre los que es seguro correr un reset/carga destructiva
// (drop+create, carga masiva de personal, etc.). La proteccion es por nombre
// de base: `planificacion_turnos` (produccion) no debe agregarse nunca, porque
// habilitaria reset:db sobre la base oficial. Produccion se arma en
// `planificacion_turnos_preparacion` y se traslada con backup/restore
// (docs/deployment/guia-instalacion.md).
export const RESETTABLE_DATABASES = [
  'roles_turnos_demo',
  'planificacion_turnos_preparacion',
];

export function assertResettableDatabase(name: string): void {
  if (!RESETTABLE_DATABASES.includes(name)) {
    throw new Error(
      `Esta operacion solo debe ejecutarse sobre ${RESETTABLE_DATABASES.join(' o ')} y detecto ${name}.`,
    );
  }
}

// Ejecuta seeds de database/seeds/ por lotes `GO`. Sabe resolver directivas
// `:r` (include) y `:setvar` de sqlcmd; los seeds actuales no las usan, pero
// soportarlas no tiene costo. Las migraciones no pasan por aqui: las ejecuta
// lib/migraciones.ts.
export function loadSqlBatches(
  absolutePath: string,
  scriptVariables: Map<string, string>,
): string[] {
  const sql = expandSqlIncludes(absolutePath, scriptVariables);

  return sql
    .split(/^\s*GO\s*$/gim)
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0)
    .map((batch) => stripSqlCmdDirectives(batch, scriptVariables))
    .map((batch) => batch.trim())
    .filter((batch) => batch.length > 0);
}

function expandSqlIncludes(
  absolutePath: string,
  scriptVariables: Map<string, string>,
): string {
  const baseDir = dirname(absolutePath);
  const sql = readFileSync(absolutePath, 'utf8');
  const lines = sql.split(/\r?\n/);
  const expanded: string[] = [];

  for (const line of lines) {
    const includeMatch = line.match(/^\s*:r\s+(.+?)\s*$/i);
    const setVarMatch = line.match(/^\s*:setvar\s+(\w+)\s+"?(.+?)"?\s*$/i);

    if (includeMatch) {
      const includeRawPath = includeMatch[1].trim().replace(/^["']|["']$/g, '');
      const includeAbsolutePath =
        includeRawPath.startsWith('.\\database\\') ||
        includeRawPath.startsWith('./database/') ||
        includeRawPath.startsWith('database\\') ||
        includeRawPath.startsWith('database/')
          ? resolveFromProjectRoot(
              includeRawPath.replace(/^\.\\/, '').replace(/^\.\//, ''),
            )
          : includeRawPath.startsWith('.\\') ||
              includeRawPath.startsWith('./') ||
              includeRawPath.startsWith('..\\') ||
              includeRawPath.startsWith('../')
            ? resolve(baseDir, includeRawPath)
            : resolveFromProjectRoot(includeRawPath);
      expanded.push(expandSqlIncludes(includeAbsolutePath, scriptVariables));
      continue;
    }

    if (setVarMatch) {
      scriptVariables.set(setVarMatch[1], setVarMatch[2]);
      continue;
    }

    expanded.push(line);
  }

  return expanded.join('\n');
}

function stripSqlCmdDirectives(
  batch: string,
  scriptVariables: Map<string, string>,
): string {
  let normalized = batch
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith(':on error exit'))
    .filter((line) => !line.trim().startsWith(':setvar'))
    .join('\n');

  for (const [key, value] of scriptVariables.entries()) {
    normalized = normalized.replaceAll(`$(${key})`, value);
  }

  return normalized;
}
