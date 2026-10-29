import { DatabaseProfile, readDatabaseProfile } from './database-profile';

export interface DatabaseEnv {
  host: string;
  instance: string | null;
  port: number | null;
  name: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  dialect: string;
  profile: DatabaseProfile;
  connectMaxRetries: number;
  connectRetryDelayMs: number;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
  poolMax: number;
  poolAcquireTimeoutMs: number;
}

export function readDatabaseEnv(): DatabaseEnv {
  const profile = readDatabaseProfile();

  return {
    host: getRequiredEnv('DB_HOST'),
    instance: getOptionalEnv('DB_INSTANCE'),
    port: getOptionalPort('DB_PORT'),
    name: getRequiredEnv('DB_NAME'),
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    encrypt: getBooleanEnv('DB_ENCRYPT', false),
    trustServerCertificate: getBooleanEnv('DB_TRUST_SERVER_CERTIFICATE', true),
    dialect: getOptionalEnv('DB_DIALECT') ?? 'mssql',
    profile,
    connectMaxRetries: getIntegerEnv('DB_CONNECT_MAX_RETRIES', 5),
    connectRetryDelayMs: getIntegerEnv('DB_CONNECT_RETRY_DELAY_MS', 3000),
    // Cuanto puede tardar en establecerse la conexion TCP+login contra SQL
    // Server. Antes esta misma variable tambien se usaba como requestTimeout
    // (ver DB_REQUEST_TIMEOUT_MS abajo) — ajustar una desactivaba la otra sin
    // querer. Ver docs/rendimiento/analisis-lentitud-matriz-mensual.md.
    connectTimeoutMs: getIntegerEnv('DB_CONNECT_TIMEOUT_MS', 5000),
    // Cuanto puede tardar en ejecutarse una consulta ya con conexion
    // establecida, antes de que el driver mssql la aborte. Concepto distinto
    // de connectTimeoutMs: una consulta legitima de la matriz mensual puede
    // tardar mas que un simple handshake de conexion.
    requestTimeoutMs: getIntegerEnv('DB_REQUEST_TIMEOUT_MS', 15000),
    // Tamano maximo del pool de conexiones de TypeORM. Sin limite explicito,
    // el default de tedious-connection-pool es 1 conexion — cualquier
    // concurrencia real serializa todas las requests contra la base.
    poolMax: getIntegerEnv('DB_POOL_MAX', 10),
    // Cuanto puede esperar una request a que se libere una conexion del pool
    // antes de fallar. Sin este limite, si el pool se agota bajo concurrencia
    // la espera no tiene techo — el requestTimeout del driver solo aplica una
    // vez que ya se adquirio una conexion, no durante la espera de una.
    poolAcquireTimeoutMs: getIntegerEnv('DB_POOL_ACQUIRE_TIMEOUT_MS', 10000),
  };
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`La variable de entorno ${name} es obligatoria.`);
  }

  return value;
}

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function getOptionalPort(name: string): number | null {
  const value = getOptionalEnv(name);

  if (!value) {
    return null;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `La variable de entorno ${name} debe ser un puerto valido.`,
    );
  }

  return port;
}

function getIntegerEnv(name: string, fallback: number): number {
  const value = getOptionalEnv(name);

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(
      `La variable de entorno ${name} debe ser un entero valido.`,
    );
  }

  return parsed;
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = getOptionalEnv(name);

  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}
