import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { createTypeOrmDataSource } from '../src/infrastructure/persistence/typeorm/typeorm-data-source.factory';
import { assertResettableDatabase } from './lib/sql-script-runner';
import {
  getInstitutionImporter,
  listAvailableInstitutions,
} from './institutions';

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const isListRequest =
    args.includes('--list') ||
    args.includes('list') ||
    args.includes('-l') ||
    args.length === 0;

  const idArg = args.find((a) => a.startsWith('--id='));
  const idValue = idArg
    ? idArg.split('=')[1]
    : args.includes('--id')
      ? args[args.indexOf('--id') + 1]
      : undefined;

  if (isListRequest && !idValue) {
    console.log('\n==================================================');
    console.log('  INSTITUCIONES DISPONIBLES PARA IMPORTACIÓN (NIVEL 2)');
    console.log('==================================================');
    const available = listAvailableInstitutions();
    for (const inst of available) {
      console.log(`\n • ID: ${inst.id}`);
      console.log(`   Nombre: ${inst.nombre}`);
      if (inst.descripcion) {
        console.log(`   Descripción: ${inst.descripcion}`);
      }
    }
    console.log('\n--------------------------------------------------');
    console.log('Uso para cargar una institución:');
    console.log('  npm run seed:institution -- --id=<id_institucion>\n');
    return;
  }

  if (!idValue) {
    console.log(
      '\n[seed-institution] Error: Debe especificar el ID de la institución a cargar.',
    );
    console.log('Uso: npm run seed:institution -- --id=<id_institucion>');
    console.log('Ejemplo: npm run seed:institution -- --id=ejemplo\n');
    process.exitCode = 1;
    return;
  }

  const importer = getInstitutionImporter(idValue);
  if (!importer) {
    console.error(
      `[seed-institution] Error: No existe un importador registrado para ID '${idValue}'.`,
    );
    console.log(
      'Consulte las disponibles ejecutando: npm run seed:institution',
    );
    process.exitCode = 1;
    return;
  }

  loadEnvFile();
  const env = readDatabaseEnv();
  assertResettableDatabase(env.name);

  const validation = await importer.validate();
  if (!validation.valid) {
    console.error(
      `[seed-institution] Error de validación para ${importer.manifest.nombre}: ${validation.error}`,
    );
    process.exitCode = 1;
    return;
  }

  const dataSource = await createTypeOrmDataSource();

  try {
    const rolesExistentes = (await dataSource.query(
      'SELECT COUNT(*) AS total FROM dbo.rol_seguridad',
    )) as Array<{ total: number | string }>;

    if (Number(rolesExistentes[0]?.total ?? 0) === 0) {
      throw new Error(
        'La base de datos no tiene los catálogos base migrados. Ejecute "npm run reset:db" primero.',
      );
    }

    await importer.run(dataSource);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  console.error('[seed-institution] Error de ejecución:', error);
  process.exitCode = 1;
});
