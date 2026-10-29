import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { createTypeOrmDataSource } from '../src/infrastructure/persistence/typeorm/typeorm-data-source.factory';
import { ejecutarMigraciones } from './lib/migraciones';

// La lista de migraciones sale de database/migrations/ (lib/migraciones.ts);
// agregar una migracion es solo crear el archivo NNN_*.sql.
async function main(): Promise<void> {
  loadEnvFile();
  const env = readDatabaseEnv();
  const dataSource = await createTypeOrmDataSource();

  try {
    const currentDatabaseRows = (await dataSource.query(
      'SELECT DB_NAME() AS current_database',
    )) as Array<{ current_database: string }>;
    const currentDatabase = currentDatabaseRows[0]?.current_database ?? '';

    if (!currentDatabase) {
      throw new Error('No se pudo resolver la base activa para migraciones.');
    }

    if (currentDatabase !== env.name) {
      throw new Error(
        `El entorno esperaba ${env.name} pero la conexion activa detecto ${currentDatabase}.`,
      );
    }

    await ejecutarMigraciones(dataSource, '[migrate-current-env]');

    console.log(
      `[migrate-current-env] Migraciones completadas sobre ${currentDatabase}.`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  console.error('[migrate-current-env] Error:', error);
  process.exitCode = 1;
});
