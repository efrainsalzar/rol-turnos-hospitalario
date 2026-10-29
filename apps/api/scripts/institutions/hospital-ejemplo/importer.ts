import { existsSync } from 'node:fs';
import { basename } from 'node:path';
import { DataSource } from 'typeorm';
import {
  IInstitutionImporter,
  InstitutionManifest,
} from '../base-institution-importer';
import manifestData from './manifest.json';
import { resolveFromProjectRoot } from '../../../src/infrastructure/config/project-root';
import { loadSqlBatches } from '../../lib/sql-script-runner';

const SEED_FILES_EJEMPLO = ['database/seeds/ejemplo-001_organizacion.sql'];

export class HospitalEjemploImporter implements IInstitutionImporter {
  readonly manifest: InstitutionManifest = manifestData;

  async validate(): Promise<{ valid: boolean; error?: string }> {
    for (const file of SEED_FILES_EJEMPLO) {
      if (!existsSync(resolveFromProjectRoot(file))) {
        return {
          valid: false,
          error: `No se encuentra el archivo SQL requerido: ${file}`,
        };
      }
    }
    return { valid: true };
  }

  async run(dataSource: DataSource): Promise<void> {
    console.log(
      `\n=== Iniciando Carga Institucional: ${this.manifest.nombre} ===`,
    );

    const scriptVariables = new Map<string, string>();
    for (const relativePath of SEED_FILES_EJEMPLO) {
      const batches = loadSqlBatches(
        resolveFromProjectRoot(relativePath),
        scriptVariables,
      );

      for (const batch of batches) {
        await dataSource.query(batch);
      }

      console.log(
        `[importer:${this.manifest.id}] Ejecutado ${basename(relativePath)}`,
      );
    }

    console.log(
      `=== Carga Institucional completada con éxito: ${this.manifest.nombre} ===\n`,
    );
  }
}
