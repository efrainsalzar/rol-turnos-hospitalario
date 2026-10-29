import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join, relative } from 'node:path';
import mssql from 'mssql';
import { listarMigraciones } from './lib/migraciones';
import {
  loadEnvFile,
  resolveApiEnvSource,
} from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { readCorsEnv } from '../src/infrastructure/config/cors-env';
import {
  resolveFromProjectRoot,
  resolveProjectRoot,
} from '../src/infrastructure/config/project-root';

// Diagnostico de entorno para poder correr el sistema (backend + frontend +
// base de datos) en una maquina nueva, sin arrancar nada todavia. Junta
// TODOS los problemas encontrados en una sola pasada para poder mostrar el
// reporte completo de una vez, en vez de detenerse en el primer error.

type CheckStatus = 'ok' | 'warn' | 'fail';

interface CheckResult {
  category: string;
  label: string;
  status: CheckStatus;
  detail?: string;
  fix?: string;
}

const results: CheckResult[] = [];

function record(
  category: string,
  label: string,
  status: CheckStatus,
  detail?: string,
  fix?: string,
): void {
  results.push({ category, label, status, detail, fix });
}

// Se resuelve en main(): depende del perfil activo (npm run env:<perfil>).
let API_ENV_PATH = resolveFromProjectRoot('apps', 'api', '.env');
let API_ENV_LABEL = 'apps/api/.env';
const WEB_ENV_PATH = resolveFromProjectRoot('apps', 'web', '.env');

const PLACEHOLDER_VALUES = new Set([
  'usuario',
  'password',
  'change_me',
  'cambiar-por-un-secreto-largo-y-aleatorio',
]);

async function main(): Promise<void> {
  try {
    const source = resolveApiEnvSource();
    API_ENV_PATH = source.path;
    API_ENV_LABEL = relative(resolveProjectRoot(), source.path).replace(
      /\\/g,
      '/',
    );
    record(
      'Configuracion',
      'Perfil de entorno activo',
      'ok',
      source.perfil
        ? `${source.perfil} (${API_ENV_LABEL})`
        : `sin perfil: ${API_ENV_LABEL}`,
    );
    loadEnvFile();
  } catch (error) {
    record(
      'Configuracion',
      'Perfil de entorno activo',
      'fail',
      (error as Error).message,
      'Activa un perfil existente con "npm run env:demo", "npm run env:preparacion" o "npm run env:produccion".',
    );
    printReport();
    return;
  }

  checkHerramientas();
  checkDependenciasInstaladas();
  const apiEnv = checkApiEnvFile();
  checkWebEnvFile();

  if (apiEnv.ok) {
    await checkBaseDeDatos();
  } else {
    record(
      'Base de datos',
      'Conexion a la base configurada',
      'fail',
      `Se omite: ${API_ENV_LABEL} tiene valores faltantes o placeholder.`,
      `Corrige ${API_ENV_LABEL} (ver seccion "Configuracion" arriba) y vuelve a correr "npm run doctor".`,
    );
  }

  await checkPuertoLibre(
    'Backend',
    'Puerto de la API',
    getIntEnv('PORT', 3000),
  );
  await checkPuertoLibre(
    'Frontend',
    'Puerto del dev server de Vite',
    getWebEnvInt('VITE_DEV_SERVER_PORT', 3001),
  );
  checkCoherenciaFrontendBackend();

  printReport();
}

function checkHerramientas(): void {
  const packageJson = JSON.parse(
    readFileSync(resolveFromProjectRoot('package.json'), 'utf8'),
  ) as { engines?: { node?: string } };
  const requiredNode = (packageJson.engines?.node ?? '').replace(/^>=\s*/, '');
  const currentNode = process.version.replace(/^v/, '');

  if (requiredNode && !isNodeVersionSufficient(currentNode, requiredNode)) {
    record(
      'Herramientas',
      'Version de Node.js',
      'fail',
      `Detectado ${process.version}, se requiere >= ${requiredNode}.`,
      'Instala una version de Node.js igual o mayor a la requerida (https://nodejs.org).',
    );
  } else {
    record('Herramientas', 'Version de Node.js', 'ok', process.version);
  }

  try {
    let npmDetail: string;

    if (process.platform === 'win32') {
      // npm se instala como npm.cmd junto a node.exe. Comprobar el archivo
      // evita depender de shell:true o de como el proceso padre resolvio los
      // scripts .cmd en PATH.
      const npmPath = join(dirname(process.execPath), 'npm.cmd');
      if (!existsSync(npmPath)) {
        throw new Error('No existe npm.cmd junto a node.exe.');
      }

      npmDetail = 'npm.cmd detectado';
    } else {
      const npmVersion = execFileSync('npm', ['--version'], {
        encoding: 'utf8',
      }).trim();
      npmDetail = `v${npmVersion}`;
    }

    record('Herramientas', 'npm instalado', 'ok', npmDetail);
  } catch {
    record(
      'Herramientas',
      'npm instalado',
      'fail',
      'No se encontro el comando "npm".',
      'Instala Node.js (incluye npm) desde https://nodejs.org.',
    );
  }
}

function checkDependenciasInstaladas(): void {
  const rootNodeModules = resolveFromProjectRoot('node_modules');
  const webNodeModules = resolveFromProjectRoot('apps', 'web', 'node_modules');

  record(
    'Dependencias',
    'Dependencias del backend (raiz)',
    existsSync(rootNodeModules) ? 'ok' : 'fail',
    existsSync(rootNodeModules) ? undefined : 'Falta node_modules en la raiz.',
    existsSync(rootNodeModules)
      ? undefined
      : 'Corre "npm install" en la raiz del repositorio.',
  );

  record(
    'Dependencias',
    'Dependencias del frontend (apps/web)',
    existsSync(webNodeModules) ? 'ok' : 'fail',
    existsSync(webNodeModules) ? undefined : 'Falta apps/web/node_modules.',
    existsSync(webNodeModules)
      ? undefined
      : 'Corre "npm install" dentro de apps/web.',
  );
}

function checkApiEnvFile(): { ok: boolean } {
  if (!existsSync(API_ENV_PATH)) {
    record(
      'Configuracion',
      `${API_ENV_LABEL}`,
      'fail',
      'El archivo no existe.',
      `Copia apps/api/.env.example a ${API_ENV_LABEL} y completa las credenciales de SQL Server.`,
    );
    return { ok: false };
  }

  const values = parseEnvFile(API_ENV_PATH);
  const requiredKeys = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ];
  let ok = true;

  for (const key of requiredKeys) {
    const value = values.get(key);

    if (!value) {
      record(
        'Configuracion',
        `${API_ENV_LABEL}: ${key}`,
        'fail',
        'Falta la variable.',
        `Agrega ${key}= en ${API_ENV_LABEL}.`,
      );
      ok = false;
      continue;
    }

    if (PLACEHOLDER_VALUES.has(value)) {
      record(
        'Configuracion',
        `${API_ENV_LABEL}: ${key}`,
        'fail',
        'Sigue con el valor de ejemplo.',
        `Reemplaza ${key} en ${API_ENV_LABEL} por un valor real.`,
      );
      ok = false;
      continue;
    }

    record('Configuracion', `${API_ENV_LABEL}: ${key}`, 'ok');
  }

  try {
    readCorsEnv();
    record('Configuracion', `${API_ENV_LABEL}: CORS_ORIGINS`, 'ok');
  } catch (error) {
    record(
      'Configuracion',
      `${API_ENV_LABEL}: CORS_ORIGINS`,
      'fail',
      (error as Error).message,
      `Revisa CORS_ORIGINS y CORS_CREDENTIALS en ${API_ENV_LABEL}.`,
    );
    ok = false;
  }

  if (!values.get('EXPORT_INSTITUTION_NAME')) {
    record(
      'Configuracion',
      `${API_ENV_LABEL}: EXPORT_INSTITUTION_NAME`,
      'warn',
      'Sin configurar: las exportaciones usaran el encabezado generico por defecto.',
      'Opcional. Ver docs/exportacion/plantillas-excel-rol-turnos.md si necesitas un encabezado institucional real.',
    );
  }

  return { ok };
}

function checkWebEnvFile(): void {
  if (!existsSync(WEB_ENV_PATH)) {
    record(
      'Configuracion',
      'apps/web/.env',
      'fail',
      'El archivo no existe.',
      'Copia apps/web/.env.example a apps/web/.env.',
    );
    return;
  }

  const values = parseEnvFile(WEB_ENV_PATH);

  record(
    'Configuracion',
    'apps/web/.env: VITE_API_BASE_URL',
    values.get('VITE_API_BASE_URL') ? 'ok' : 'fail',
    values.get('VITE_API_BASE_URL') ? undefined : 'Falta la variable.',
    values.get('VITE_API_BASE_URL')
      ? undefined
      : 'Agrega VITE_API_BASE_URL= en apps/web/.env (ej. http://localhost:3000).',
  );
}

async function checkBaseDeDatos(): Promise<void> {
  const env = readDatabaseEnv();
  let adminPool: mssql.ConnectionPool | undefined;
  let pool: mssql.ConnectionPool | undefined;

  try {
    // SQL Server puede reportar "Login failed" cuando el login es valido,
    // pero la base indicada en Initial Catalog todavia no existe (el driver
    // Tedious expone ese caso como ELOGIN). Comprobamos primero desde master
    // para distinguir autenticacion de base ausente.
    adminPool = await mssql.connect({
      server: env.host,
      port: env.port ?? undefined,
      user: env.user,
      password: env.password,
      database: 'master',
      options: {
        encrypt: env.encrypt,
        trustServerCertificate: env.trustServerCertificate,
        instanceName: env.port ? undefined : (env.instance ?? undefined),
      },
      connectionTimeout: Math.min(env.connectTimeoutMs, 5000),
      requestTimeout: Math.min(env.requestTimeoutMs, 5000),
    });

    const databaseLookup = (await adminPool
      .request()
      .input('databaseName', mssql.NVarChar(128), env.name)
      .query('SELECT DB_ID(@databaseName) AS database_id')) as {
      recordset: Array<{ database_id: number | null }>;
    };

    await adminPool.close();
    adminPool = undefined;

    if (databaseLookup.recordset[0]?.database_id == null) {
      record(
        'Base de datos',
        'Conexion a la base configurada',
        'fail',
        `La base ${env.name} no existe en ${env.host}${env.port ? `:${env.port}` : ''}. La autenticacion contra master fue correcta.`,
        `Crea la base ${env.name} y vuelve a correr "npm run doctor".`,
      );
      return;
    }

    pool = await mssql.connect({
      server: env.host,
      port: env.port ?? undefined,
      user: env.user,
      password: env.password,
      database: env.name,
      options: {
        encrypt: env.encrypt,
        trustServerCertificate: env.trustServerCertificate,
        instanceName: env.port ? undefined : (env.instance ?? undefined),
      },
      // Diagnostico rapido: no queremos los reintentos completos que usa el
      // arranque normal de la API (hasta DB_CONNECT_MAX_RETRIES), un fallo
      // real de conexion debe reportarse en segundos, no minutos.
      connectionTimeout: Math.min(env.connectTimeoutMs, 5000),
      requestTimeout: Math.min(env.requestTimeoutMs, 5000),
    });

    record(
      'Base de datos',
      'Conexion a la base configurada',
      'ok',
      `${env.host}${env.instance ? `\\${env.instance}` : env.port ? `:${env.port}` : ''}/${env.name} ` +
        `(perfil ${env.profile.name}, compatibilidad ${env.profile.compatibilityLevel})`,
    );

    // Con mssql-modern sobre una base de nivel 100 la paginacion usa
    // OFFSET/FETCH, que 2008 R2 rechaza: el error solo aparece al listar.
    const compatibilidad = (await pool
      .request()
      .query(
        'SELECT compatibility_level FROM sys.databases WHERE name = DB_NAME()',
      )) as { recordset: Array<{ compatibility_level: number }> };
    const nivelReal = compatibilidad.recordset[0]?.compatibility_level;
    const perfilAdmiteNivel =
      nivelReal === undefined ||
      (env.profile.name === 'mssql-2008r2' ? true : nivelReal >= 110);

    record(
      'Base de datos',
      'Perfil SQL coherente con la base',
      perfilAdmiteNivel ? 'ok' : 'fail',
      `Base con nivel de compatibilidad ${nivelReal ?? 'desconocido'}; DB_PROFILE=${env.profile.name}.`,
      perfilAdmiteNivel
        ? undefined
        : `Define DB_PROFILE=mssql-2008r2 y DB_COMPATIBILITY_LEVEL=${nivelReal} en ${API_ENV_LABEL}.`,
    );

    const migraciones = (await pool.request().query(
      `IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NOT NULL
         SELECT version FROM dbo.schema_migration WHERE estado = 'APLICADO'
       ELSE
         SELECT CAST(NULL AS VARCHAR(50)) AS version WHERE 1 = 0`,
    )) as { recordset: Array<{ version: string }> };
    const aplicadas = new Set(
      migraciones.recordset.map((row) => row.version.trim()),
    );
    // Se compara contra los archivos de database/migrations/ (misma lista que
    // ejecutan migrate:api y reset:db), no solo se cuentan las aplicadas.
    const pendientes = listarMigraciones()
      .filter((migracion) => !aplicadas.has(migracion.version))
      .map((migracion) => migracion.nombre);

    record(
      'Base de datos',
      'Esquema migrado',
      pendientes.length === 0 ? 'ok' : 'fail',
      pendientes.length === 0
        ? `${aplicadas.size} migraciones aplicadas, ninguna pendiente.`
        : `${aplicadas.size} aplicadas; pendientes: ${pendientes.join(', ')}.`,
      pendientes.length === 0 ? undefined : 'Corre "npm run migrate:api".',
    );

    const roles = (await pool.request().query(
      `IF OBJECT_ID(N'dbo.rol_seguridad', N'U') IS NOT NULL
         SELECT COUNT(*) AS total FROM dbo.rol_seguridad
       ELSE
         SELECT 0 AS total`,
    )) as { recordset: Array<{ total: number }> };
    const totalRoles = roles.recordset[0]?.total ?? 0;

    record(
      'Base de datos',
      'Catalogos base sembrados',
      totalRoles > 0 ? 'ok' : 'warn',
      `${totalRoles} roles de seguridad encontrados.`,
      totalRoles > 0
        ? undefined
        : 'En demo corre "npm run seed:demo"; en la instancia real, "npm run seed:hospital".',
    );
  } catch (error) {
    record(
      'Base de datos',
      'Conexion a la base configurada',
      'fail',
      (error as Error).message,
      buildDatabaseErrorFix((error as Error).message),
    );
  } finally {
    await adminPool?.close();
    await pool?.close();
  }
}

async function checkPuertoLibre(
  category: string,
  label: string,
  port: number,
): Promise<void> {
  const libre = await isPortFree(port);

  record(
    category,
    label,
    libre ? 'ok' : 'warn',
    libre
      ? `Puerto ${port} libre.`
      : `Puerto ${port} ocupado (puede que el servidor ya este corriendo).`,
  );
}

function checkCoherenciaFrontendBackend(): void {
  if (!existsSync(WEB_ENV_PATH)) {
    return;
  }

  const webValues = parseEnvFile(WEB_ENV_PATH);
  const apiBaseUrl = webValues.get('VITE_API_BASE_URL');
  const backendPort = getIntEnv('PORT', 3000);

  if (!apiBaseUrl) {
    return;
  }

  const matchedPort = apiBaseUrl.match(/:(\d+)/)?.[1];

  if (matchedPort && Number(matchedPort) !== backendPort) {
    record(
      'Coherencia',
      `apps/web/.env VITE_API_BASE_URL vs ${API_ENV_LABEL} PORT`,
      'warn',
      `El frontend apunta a ${apiBaseUrl}, pero la API esta configurada en el puerto ${backendPort}.`,
      `Alinea VITE_API_BASE_URL en apps/web/.env con PORT en ${API_ENV_LABEL}.`,
    );
  } else {
    record(
      'Coherencia',
      `apps/web/.env VITE_API_BASE_URL vs ${API_ENV_LABEL} PORT`,
      'ok',
    );
  }
}

function buildDatabaseErrorFix(message: string): string {
  if (/Failed to connect|ETIMEOUT|ECONNREFUSED|EINSTLOOKUP/i.test(message)) {
    return `Verifica que SQL Server este iniciado y que DB_HOST/DB_INSTANCE/DB_PORT en ${API_ENV_LABEL} sean correctos.`;
  }

  if (/Login failed|ELOGIN/i.test(message)) {
    return `Revisa DB_USER y DB_PASSWORD en ${API_ENV_LABEL}.`;
  }

  if (/Cannot open database/i.test(message)) {
    return 'La base configurada en DB_NAME no existe todavia. Creala o corre el script de setup correspondiente al entorno.';
  }

  return `Revisa la configuracion de conexion en ${API_ENV_LABEL}.`;
}

function parseEnvFile(path: string): Map<string, string> {
  const values = new Map<string, string>();
  const content = readFileSync(path, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (value) {
      values.set(key, value);
    }
  }

  return values;
}

function getIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getWebEnvInt(name: string, fallback: number): number {
  if (!existsSync(WEB_ENV_PATH)) {
    return fallback;
  }

  const value = Number(parseEnvFile(WEB_ENV_PATH).get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function isNodeVersionSufficient(current: string, required: string): boolean {
  const [currentMajor, currentMinor = 0] = current.split('.').map(Number);
  const [requiredMajor, requiredMinor = 0] = required.split('.').map(Number);

  if (currentMajor !== requiredMajor) {
    return currentMajor > requiredMajor;
  }

  return currentMinor >= requiredMinor;
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolvePromise) => {
    const server = createServer();

    server.once('error', () => resolvePromise(false));
    server.once('listening', () => {
      server.close(() => resolvePromise(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

const STATUS_SYMBOLS: Record<CheckStatus, string> = {
  ok: '\x1b[32m✔\x1b[0m',
  warn: '\x1b[33m⚠\x1b[0m',
  fail: '\x1b[31m✘\x1b[0m',
};

function printReport(): void {
  const categories = [...new Set(results.map((result) => result.category))];

  for (const category of categories) {
    console.log(`\n${category}`);

    for (const result of results.filter((item) => item.category === category)) {
      console.log(`  ${STATUS_SYMBOLS[result.status]} ${result.label}`);

      if (result.detail) {
        console.log(`      ${result.detail}`);
      }

      if (result.status !== 'ok' && result.fix) {
        console.log(`      -> ${result.fix}`);
      }
    }
  }

  const totalFail = results.filter((result) => result.status === 'fail').length;
  const totalWarn = results.filter((result) => result.status === 'warn').length;

  console.log('');

  if (totalFail === 0 && totalWarn === 0) {
    console.log('\x1b[32mSistema listo para correr.\x1b[0m');
  } else if (totalFail === 0) {
    console.log(
      `\x1b[33mSistema puede correr, con ${totalWarn} advertencia(s). Ver detalle arriba.\x1b[0m`,
    );
  } else {
    console.log(
      `\x1b[31mSistema NO listo. ${totalFail} problema(s) bloqueante(s), ${totalWarn} advertencia(s). Ver detalle arriba.\x1b[0m`,
    );
  }

  process.exitCode = totalFail > 0 ? 1 : 0;
}

void main().catch((error: unknown) => {
  console.error('[doctor] Error inesperado:', error);
  process.exitCode = 1;
});
