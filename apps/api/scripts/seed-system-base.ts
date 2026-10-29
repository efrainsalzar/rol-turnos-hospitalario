import { basename } from 'node:path';
import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { resolveFromProjectRoot } from '../src/infrastructure/config/project-root';
import { createTypeOrmDataSource } from '../src/infrastructure/persistence/typeorm/typeorm-data-source.factory';
import {
  assertResettableDatabase,
  loadSqlBatches,
} from './lib/sql-script-runner';

// Nivel 0: Catálogos indispensables del sistema (Core Base Seed)
// Siembra los catálogos de operación esenciales y el usuario bootstrap inicial (admin.sistema)
// para que cualquier base recién migrada quede 100% limpia pero funcional y lista para entrar.
const SEED_CORE_FILES = [
  'database/seeds/dev-005_tipo_contrato.sql',
  'database/seeds/dev-006_carga_horaria.sql',
  'database/seeds/dev-007_usuario.sql',
];

export async function seedSystemBase(): Promise<void> {
  loadEnvFile();
  const env = readDatabaseEnv();

  assertResettableDatabase(env.name);

  const dataSource = await createTypeOrmDataSource();

  try {
    const currentDatabaseRows = (await dataSource.query(
      'SELECT DB_NAME() AS current_database',
    )) as Array<{ current_database: string }>;
    const currentDatabase = currentDatabaseRows[0]?.current_database ?? '';

    assertResettableDatabase(currentDatabase);

    const rolesExistentes = (await dataSource.query(
      'SELECT COUNT(*) AS total FROM dbo.rol_seguridad',
    )) as Array<{ total: number | string }>;

    if (Number(rolesExistentes[0]?.total ?? 0) === 0) {
      throw new Error(
        'No se encontraron roles de seguridad. Debe ejecutar las migraciones base primero ("npm run migrate:api").',
      );
    }

    const scriptVariables = new Map<string, string>();
    for (const relativePath of SEED_CORE_FILES) {
      const batches = loadSqlBatches(
        resolveFromProjectRoot(relativePath),
        scriptVariables,
      );

      for (const batch of batches) {
        await dataSource.query(batch);
      }

      console.log(`[seed-system-base] Nivel 0: Ejecutado ${basename(relativePath)}`);
    }

    const adminUser = (await dataSource.query(
      "SELECT username FROM dbo.usuario WHERE username = 'admin.sistema'",
    )) as Array<{ username: string }>;

    if (adminUser.length > 0) {
      console.log(
        '[seed-system-base] Nivel 0 listo: Catálogos base sembrados y usuario "admin.sistema" activo.',
      );
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

// Ejecución directa si se invoca como CLI
if (require.main === module) {
  seedSystemBase().catch((error: unknown) => {
    console.error('[seed-system-base] Error:', error);
    process.exitCode = 1;
  });
}
