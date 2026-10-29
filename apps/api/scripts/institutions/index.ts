import { IInstitutionImporter } from './base-institution-importer';
import { HospitalEjemploImporter } from './hospital-ejemplo/importer';

// Registro central de importadores por institución (escalable para agregar nuevos hospitales)
export const INSTITUTION_IMPORTERS: Record<string, IInstitutionImporter> = {
  ejemplo: new HospitalEjemploImporter(),
};

export function getInstitutionImporter(id: string): IInstitutionImporter | undefined {
  return INSTITUTION_IMPORTERS[id.toLowerCase()];
}

export function listAvailableInstitutions(): Array<{ id: string; nombre: string; descripcion?: string }> {
  return Object.values(INSTITUTION_IMPORTERS).map((imp) => ({
    id: imp.manifest.id,
    nombre: imp.manifest.nombre,
    descripcion: imp.manifest.descripcion,
  }));
}
