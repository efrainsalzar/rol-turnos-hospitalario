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
  'SUSPENSIÓN',
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
  'AISLAMIENTO',
];

interface IncidenciaPersonalLike {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export function resolveIncidenciaPersonalScope(
  incidenciaPersonal: IncidenciaPersonalLike,
): IncidenciaPersonalScope {
  const text = [
    incidenciaPersonal.codigo,
    incidenciaPersonal.nombre,
    incidenciaPersonal.descripcion ?? '',
  ]
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (!text) {
    return 'OTRO';
  }

  if (GENERAL_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'GENERAL';
  }

  if (PERSONAL_KEYWORDS.some((keyword) => text.includes(keyword))) {
    return 'PERSONAL';
  }

  return 'OTRO';
}
