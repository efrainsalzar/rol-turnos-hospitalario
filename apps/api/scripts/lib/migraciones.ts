import { readdirSync, readFileSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { resolveFromProjectRoot } from '../../src/infrastructure/config/project-root';

// La carpeta database/migrations/ es la unica fuente de verdad de que
// migraciones existen y en que orden corren. Antes habia dos listas escritas
// a mano (run-migrations.sql para reset:db y otra en migrate:api) y una
// migracion nueva agregada a una sola rompia la otra
// (docs/database/decisiones-tecnicas.md secciones 148, 162 y 163).
const PATRON_MIGRACION = /^(\d{3})_.+\.sql$/;

export interface ArchivoMigracion {
  version: string;
  nombre: string;
  ruta: string;
}

export function listarMigraciones(): ArchivoMigracion[] {
  const carpeta = resolveFromProjectRoot('database', 'migrations');

  return readdirSync(carpeta)
    .map((nombre) => ({ nombre, match: PATRON_MIGRACION.exec(nombre) }))
    .filter(
      (item): item is { nombre: string; match: RegExpExecArray } =>
        item.match !== null,
    )
    .map(({ nombre, match }) => ({
      version: match[1],
      nombre,
      ruta: resolveFromProjectRoot('database', 'migrations', nombre),
    }))
    .sort((a, b) => a.version.localeCompare(b.version));
}

/**
 * Ejecuta todas las migraciones en orden. Cada archivo es idempotente: revisa
 * su version en dbo.schema_migration y no hace nada si ya esta APLICADO, asi
 * que correrlas todas sobre una base existente solo aplica las nuevas.
 */
export async function ejecutarMigraciones(
  dataSource: DataSource,
  prefijoLog: string,
): Promise<void> {
  await dataSource.query(`
    IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
    BEGIN
        CREATE TABLE dbo.schema_migration
        (
            id BIGINT IDENTITY(1,1) NOT NULL,
            version VARCHAR(50) NOT NULL,
            nombre VARCHAR(255) NOT NULL,
            aplicado_at DATETIME NOT NULL CONSTRAINT df_schema_migration_aplicado_at DEFAULT (GETDATE()),
            checksum VARCHAR(100) NULL,
            estado VARCHAR(20) NOT NULL,
            CONSTRAINT pk_schema_migration PRIMARY KEY CLUSTERED (id),
            CONSTRAINT uq_schema_migration_version UNIQUE (version),
            CONSTRAINT ck_schema_migration_estado CHECK (estado IN ('APLICADO', 'ERROR'))
        )
    END
  `);

  for (const migracion of listarMigraciones()) {
    for (const lote of dividirEnLotes(readFileSync(migracion.ruta, 'utf8'))) {
      await dataSource.query(lote);
    }

    console.log(`${prefijoLog} Ejecutado ${migracion.nombre}`);
  }
}

function dividirEnLotes(sql: string): string[] {
  return sql
    .split(/^\s*GO\s*$/gim)
    .map((lote) => lote.trim())
    .filter((lote) => lote.length > 0);
}
