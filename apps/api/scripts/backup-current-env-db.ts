import { mkdirSync } from 'node:fs';
import sql from 'mssql';
import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { resolveFromProjectRoot } from '../src/infrastructure/config/project-root';

async function main(): Promise<void> {
  loadEnvFile();
  const env = readDatabaseEnv();
  const backupDirectory = resolveBackupDirectory();
  mkdirSync(backupDirectory, { recursive: true });

  const backupFileName = `${env.name}_${buildTimestamp()}.bak`;
  const backupFilePath = resolveFromProjectRoot(backupDirectory, backupFileName);
  const quotedBackupPath = backupFilePath.replace(/'/g, "''");

  const pool = await sql.connect(buildSqlConfig(env, 'master'));

  try {
    await pool
      .request()
      .batch(
        `
          BACKUP DATABASE [${env.name}]
          TO DISK = N'${quotedBackupPath}'
          WITH INIT, COPY_ONLY, STATS = 10;
        `,
      );

    console.log(
      `[backup-current-env-db] Backup generado para ${env.name}: ${backupFilePath}`,
    );
  } finally {
    await pool.close();
  }
}

function resolveBackupDirectory(): string {
  const provided = process.argv[2]?.trim();

  if (provided) {
    return provided;
  }

  return 'database/backups';
}

function buildTimestamp(): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');

  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

function buildSqlConfig(
  env: ReturnType<typeof readDatabaseEnv>,
  database: string,
): sql.config {
  return {
    user: env.user,
    password: env.password,
    server: env.host,
    database,
    ...(env.port ? { port: env.port } : {}),
    options: {
      encrypt: env.encrypt,
      trustServerCertificate: env.trustServerCertificate,
      ...(env.port ? {} : { instanceName: env.instance ?? undefined }),
    },
    connectionTimeout: env.connectTimeoutMs,
    requestTimeout: Math.max(env.connectTimeoutMs, 120000),
  };
}

void main().catch((error: unknown) => {
  console.error('[backup-current-env-db] Error:', error);
  process.exitCode = 1;
});
