import mssql from 'mssql';
import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { createTypeOrmDataSource } from '../src/infrastructure/persistence/typeorm/typeorm-data-source.factory';
import { seedSystemBase } from './seed-system-base';
import { ejecutarMigraciones } from './lib/migraciones';
import { assertResettableDatabase } from './lib/sql-script-runner';

// Base limpia: drop + create + todas las migraciones de database/migrations/
// (las mismas que ejecuta migrate:api, lib/migraciones.ts) + catalogos del
// sistema y usuario admin.sistema (seedSystemBase). No carga datos reales del
// hospital ni datos de demo. Se separo en dos comandos el 2026-07-22 a pedido
// del usuario: una cosa es la base vacia, otra es cargarle datos (ver
// docs/database/decisiones-tecnicas.md). Corre sobre el entorno activo
// (`npm run env:demo` o `npm run env:preparacion`) -- ver RESETTABLE_DATABASES en
// lib/sql-script-runner.ts para la lista de entornos permitidos.
async function main(): Promise<void> {
  loadEnvFile();

  const env = readDatabaseEnv();

  assertResettableDatabase(env.name);

  await recreateDatabase(env);

  const dataSource = await createTypeOrmDataSource();

  try {
    const currentDatabaseRows = (await dataSource.query(
      'SELECT DB_NAME() AS current_database',
    )) as Array<{ current_database: string }>;
    const currentDatabase = currentDatabaseRows[0]?.current_database ?? '';

    assertResettableDatabase(currentDatabase);

    await ejecutarMigraciones(dataSource, '[reset-db-clean]');

    const resumen = (await dataSource.query(`
      SELECT
        (SELECT COUNT(*) FROM dbo.departamento WHERE activo = 1) AS total_departamentos,
        (SELECT COUNT(*) FROM dbo.servicio WHERE activo = 1) AS total_servicios,
        (SELECT COUNT(*) FROM dbo.nivel_cargo WHERE activo = 1) AS total_nivel_cargo,
        (SELECT COUNT(*) FROM dbo.rol_seguridad) AS total_roles,
        (SELECT COUNT(*) FROM dbo.usuario) AS total_usuarios
    `)) as Array<{
      total_departamentos: number | string;
      total_servicios: number | string;
      total_nivel_cargo: number | string;
      total_roles: number | string;
      total_usuarios: number | string;
    }>;

    console.log(
      '[reset-db-clean] Base limpia lista con estructura + catálogos base de migraciones:',
      {
        departamentos: Number(resumen[0]?.total_departamentos ?? 0),
        servicios: Number(resumen[0]?.total_servicios ?? 0),
        nivelCargo: Number(resumen[0]?.total_nivel_cargo ?? 0),
        roles: Number(resumen[0]?.total_roles ?? 0),
        usuarios: Number(resumen[0]?.total_usuarios ?? 0),
      },
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }

  // Nivel 0: Aplicar catálogos del sistema indispensables y usuario bootstrap admin.sistema
  await seedSystemBase();
}

async function recreateDatabase(env: ReturnType<typeof readDatabaseEnv>) {
  const pool = await mssql.connect({
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
    connectionTimeout: env.connectTimeoutMs,
    requestTimeout: env.connectTimeoutMs,
  });

  try {
    await pool.request().batch(`
      IF DB_ID(N'${env.name}') IS NOT NULL
      BEGIN
          EXEC ('ALTER DATABASE [${env.name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE');
          EXEC ('DROP DATABASE [${env.name}]');
      END;
      CREATE DATABASE [${env.name}];
    `);

    console.log(`[reset-db-clean] Base ${env.name} recreada.`);
  } finally {
    await pool.close();
  }
}

void main().catch((error: unknown) => {
  console.error('[reset-db-clean] Error:', error);
  process.exitCode = 1;
});
