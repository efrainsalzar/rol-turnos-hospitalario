import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveFromProjectRoot, resolveProjectRoot } from './project-root';

export function loadEnvFile(fileName = '.env'): void {
  const filePaths = resolveEnvPaths(fileName);
  // Las variables entregadas por el proceso tienen la maxima prioridad.
  // Los archivos se cargan de general a especifico: un archivo posterior
  // puede reemplazar valores cargados por uno anterior, pero nunca una
  // variable externa (Windows, Docker, CI, etc.).
  const externallyProvidedKeys = new Set(Object.keys(process.env));

  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      continue;
    }

    loadFileIntoProcessEnv(filePath, externallyProvidedKeys);
  }
}

function loadFileIntoProcessEnv(
  filePath: string,
  externallyProvidedKeys: Set<string>,
): void {
  const fileContent = readFileSync(filePath, 'utf8');
  const lines = fileContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripOptionalQuotes(line.slice(separatorIndex + 1).trim());

    if (!externallyProvidedKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

function stripOptionalQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function resolveEnvPaths(fileName: string): string[] {
  const filePaths: string[] = [];
  const currentDirectoryCandidate = join(process.cwd(), fileName);
  const projectRoot = resolveProjectRoot();
  const rootCandidate = join(projectRoot, fileName);

  if (existsSync(currentDirectoryCandidate)) {
    filePaths.push(currentDirectoryCandidate);
  }

  if (
    rootCandidate !== currentDirectoryCandidate &&
    existsSync(rootCandidate)
  ) {
    filePaths.push(rootCandidate);
  }

  const apiEnv = resolveApiEnvSource(fileName);

  if (!filePaths.includes(apiEnv.path)) {
    filePaths.push(apiEnv.path);
  }

  return filePaths;
}

export interface ApiEnvSource {
  origen: 'API_ENV_FILE' | 'PERFIL' | 'ARCHIVO';
  perfil: string | null;
  path: string;
}

const PERFIL_VALIDO = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Archivo de entorno de la API, por orden de prioridad:
 * 1. `API_ENV_FILE` entregada por el proceso (ruta explicita).
 * 2. Perfil activo: `API_ENV_PROFILE` del proceso o, si no, el que
 *    `npm run env:<perfil>` dejo en `apps/api/.env.active`. Carga
 *    `apps/api/.env.<perfil>` directamente, sin copiarlo sobre `.env`, para
 *    que no exista una copia que se desincronice del perfil.
 * 3. `apps/api/.env`: el caso de un servidor real, que no usa perfiles.
 */
export function resolveApiEnvSource(fileName = '.env'): ApiEnvSource {
  const apiEnvFile = process.env.API_ENV_FILE?.trim();

  if (apiEnvFile) {
    return {
      origen: 'API_ENV_FILE',
      perfil: null,
      path: resolveFromProjectRoot(apiEnvFile),
    };
  }

  const perfil =
    process.env.API_ENV_PROFILE?.trim() || readPerfilSeleccionado();

  if (perfil) {
    if (!PERFIL_VALIDO.test(perfil)) {
      throw new Error(`El perfil de entorno "${perfil}" no es valido.`);
    }

    const perfilPath = resolveFromProjectRoot('apps', 'api', `.env.${perfil}`);

    // Un perfil activo sin archivo no debe caer en silencio a otra base.
    if (!existsSync(perfilPath)) {
      throw new Error(
        `El perfil de entorno "${perfil}" esta activo pero no existe apps/api/.env.${perfil}. ` +
          `Copie apps/api/.env.${perfil}.example a apps/api/.env.${perfil} y complete sus valores.`,
      );
    }

    return { origen: 'PERFIL', perfil, path: perfilPath };
  }

  return {
    origen: 'ARCHIVO',
    perfil: null,
    path: resolveFromProjectRoot('apps', 'api', fileName),
  };
}

function readPerfilSeleccionado(): string | null {
  const selectorPath = resolveFromProjectRoot('apps', 'api', '.env.active');

  if (!existsSync(selectorPath)) {
    return null;
  }

  for (const rawLine of readFileSync(selectorPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line.startsWith('API_ENV_PROFILE=')) {
      const perfil = line.slice('API_ENV_PROFILE='.length).trim();
      return perfil || null;
    }
  }

  return null;
}
