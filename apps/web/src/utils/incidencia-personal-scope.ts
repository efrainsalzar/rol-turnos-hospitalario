import type { GuardarIncidenciaPersonalInput, IncidenciaPersonal } from 'types/api';

export type IncidenciaPersonalScope = 'GENERAL' | 'PERSONAL' | 'OTRO';

const GENERAL_KEYWORDS = [
  'FERIADO',
  'FESTIVO',
  'ASUETO',
  'NO LABORABLE',
  'NO_LABORABLE',
  'INSTITUCIONAL',
  'ANIVERSARIO',
  'PARO',
  'CENSO',
  'SUSPENSION',
  'SUSPENSIÓN'
];

const PERSONAL_KEYWORDS = [
  'VACACION',
  'VACACIONES',
  'LICENCIA',
  'BAJA',
  'MEDICA',
  'MÉDICA',
  'REPOSO',
  'FALTA',
  'PERMISO',
  'DESCANSO',
  'COMISION',
  'COMISIÓN',
  'MATERNIDAD',
  'PATERNIDAD',
  'AISLAMIENTO'
];

type IncidenciaPersonalLike =
  | (Pick<IncidenciaPersonal, 'codigo' | 'nombre' | 'descripcion'> & { alcance?: IncidenciaPersonalScope })
  | (Pick<GuardarIncidenciaPersonalInput, 'codigo' | 'nombre' | 'descripcion'> & { alcance?: IncidenciaPersonalScope });

export function resolveIncidenciaPersonalScope(incidenciaPersonal: IncidenciaPersonalLike): IncidenciaPersonalScope {
  if (incidenciaPersonal.alcance) {
    return incidenciaPersonal.alcance;
  }

  const text = normalizeIncidenciaPersonalText(incidenciaPersonal);

  if (!text) {
    return 'OTRO';
  }

  if (matchesAny(text, GENERAL_KEYWORDS)) {
    return 'GENERAL';
  }

  if (matchesAny(text, PERSONAL_KEYWORDS)) {
    return 'PERSONAL';
  }

  return 'OTRO';
}

export function getIncidenciaPersonalScopeLabel(scope: IncidenciaPersonalScope) {
  switch (scope) {
    case 'GENERAL':
      return 'General';
    case 'PERSONAL':
      return 'Personal';
    default:
      return 'Por revisar';
  }
}

export function getIncidenciaPersonalScopeDescription(scope: IncidenciaPersonalScope) {
  switch (scope) {
    case 'GENERAL':
      return 'Se usa para contexto comun del calendario, como feriados o marcas institucionales del dia.';
    case 'PERSONAL':
      return 'Se usa para incidencias de una persona concreta, como vacacion, licencia o baja medica.';
    default:
      return 'Revisa el codigo y el uso esperado antes de aplicarlo en calendario o matriz.';
  }
}

function normalizeIncidenciaPersonalText(incidenciaPersonal: IncidenciaPersonalLike) {
  return [incidenciaPersonal.codigo, incidenciaPersonal.nombre, incidenciaPersonal.descripcion || '']
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function matchesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}
