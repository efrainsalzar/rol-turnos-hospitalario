import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sql from 'mssql';
import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { resolveFromProjectRoot } from '../src/infrastructure/config/project-root';

type BackupFileEntry = {
  LogicalName: string;
  Type: 'D' | 'L';
};

type ServerPathRow = {
  data_path: string | null;
  log_path: string | null;
  master_data_file: string | null;
  master_log_file: string | null;
};

async function main(): Promise<void> {
  loadEnvFile();
  const env = readDatabaseEnv();
  const backupPath = resolveBackupPath();

  if (!existsSync(backupPath)) {
    throw new Error(`No existe el archivo de backup: ${backupPath}`);
  }

  const quotedBackupPath = backupPath.replace(/'/g, "''");
  const pool = await sql.connect(buildSqlConfig(env, 'master'));

  try {
    const fileList = (await pool
      .request()
      .query<BackupFileEntry>(
        `RESTORE FILELISTONLY FROM DISK = N'${quotedBackupPath}'`,
      )).recordset;

    if (!fileList.length) {
      throw new Error(
        `El backup ${backupPath} no devolvio archivos restaurables.`,
      );
    }

    const serverPaths = (await pool.request().query<ServerPathRow>(`
      SELECT
        CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(4000)) AS data_path,
        CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS NVARCHAR(4000)) AS log_path,
        (SELECT TOP 1 physical_name FROM master.sys.master_files WHERE database_id = DB_ID('master') AND file_id = 1) AS master_data_file,
        (SELECT TOP 1 physical_name FROM master.sys.master_files WHERE database_id = DB_ID('master') AND file_id = 2) AS master_log_file
    `)).recordset[0];

    const dataDirectory = resolveSqlDirectory(
      serverPaths?.data_path,
      serverPaths?.master_data_file,
    );
    const logDirectory = resolveSqlDirectory(
      serverPaths?.log_path,
      serverPaths?.master_log_file,
    );

    if (!dataDirectory || !logDirectory) {
      throw new Error(
        'No se pudieron resolver rutas de datos y log del servidor SQL.',
      );
    }

    const moveClauses = buildMoveClauses(fileList, env.name, dataDirectory, logDirectory);
    const quotedDatabase = `[${env.name}]`;

    await pool.request().batch(`
      IF DB_ID(N'${env.name.replace(/'/g, "''")}') IS NOT NULL
      BEGIN
        ALTER DATABASE ${quotedDatabase} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      END;
    `);

    await pool.request().batch(`
      RESTORE DATABASE ${quotedDatabase}
      FROM DISK = N'${quotedBackupPath}'
      WITH REPLACE, RECOVERY, STATS = 10, ${moveClauses};
    `);

    await pool.request().batch(`
      ALTER DATABASE ${quotedDatabase} SET MULTI_USER;
    `);

    console.log(
      `[restore-current-env-db] Base ${env.name} restaurada desde ${backupPath}`,
    );
  } finally {
    await pool.close();
  }
}

function resolveBackupPath(): string {
  const provided = process.argv[2]?.trim();

  if (!provided) {
    throw new Error(
      'Debes indicar la ruta del .bak. Ejemplo: npm run restore:api -- .\\database\\backups\\mi_base.bak',
    );
  }

  if (/^[A-Za-z]:\\/.test(provided) || provided.startsWith('\\\\')) {
    return provided;
  }

  return resolve(resolveFromProjectRoot(), provided);
}

function resolveSqlDirectory(
  preferredPath: string | null | undefined,
  fallbackFile: string | null | undefined,
): string | null {
  if (preferredPath?.trim()) {
    return preferredPath.trim();
  }

  if (!fallbackFile?.trim()) {
    return null;
  }

  const normalized = fallbackFile.replace(/\//g, '\\');
  const segments = normalized.split('\\');
  segments.pop();
  return segments.join('\\');
}

function buildMoveClauses(
  fileList: BackupFileEntry[],
  databaseName: string,
  dataDirectory: string,
  logDirectory: string,
): string {
  let dataIndex = 0;
  let logIndex = 0;

  return fileList
    .map((file) => {
      if (file.Type === 'L') {
        const fileName = logIndex === 0 ? `${databaseName}_log.ldf` : `${databaseName}_log_${logIndex}.ldf`;
        logIndex += 1;
        return `MOVE N'${file.LogicalName.replace(/'/g, "''")}' TO N'${join(logDirectory, fileName).replace(/'/g, "''")}'`;
      }

      const extension = dataIndex === 0 ? 'mdf' : 'ndf';
      const suffix = dataIndex === 0 ? '' : `_${dataIndex}`;
      const fileName = `${databaseName}${suffix}.${extension}`;
      dataIndex += 1;
      return `MOVE N'${file.LogicalName.replace(/'/g, "''")}' TO N'${join(dataDirectory, fileName).replace(/'/g, "''")}'`;
    })
    .join(', ');
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
  console.error('[restore-current-env-db] Error:', error);
  process.exitCode = 1;
});
