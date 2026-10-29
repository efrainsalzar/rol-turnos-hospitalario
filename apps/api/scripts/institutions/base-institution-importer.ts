import { DataSource } from 'typeorm';

export interface InstitutionManifest {
  id: string;
  nombre: string;
  descripcion?: string;
  version?: string;
  archivosRequeridos?: string[];
}

export interface IInstitutionImporter {
  readonly manifest: InstitutionManifest;

  /**
   * Verifica la existencia de prerequisitos (ej. archivos SQL o datasets locales)
   * antes de iniciar la transacción/carga.
   */
  validate(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Ejecuta el proceso completo de siembra para esta institución.
   */
  run(dataSource: DataSource): Promise<void>;
}
