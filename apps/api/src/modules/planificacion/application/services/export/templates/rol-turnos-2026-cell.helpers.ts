import type { MatrizMensualPlanificacionResponseDto } from '../../../dto/matriz-mensual-planificacion-response.dto';
import { type RolTurnosExportBuildOptions } from '../turno-export-code.mapper';

export const EXCEL_COLOR_TOKENS = {
  headerNormal: 'FFEDF4FB',
  headerWeekend: 'FFEEF1F4',
  headerHoliday: 'FFFDF1C7',
  bodyWeekend: 'FFF4F6F8',
  bodyHoliday: 'FFFFF7CC',
  incidenciaBackground: 'FFE6FBF5',
  textModeHolidayHeader: 'FFCFCFCF',
  textModeHolidayBody: 'FFE0E0E0',
} as const;

export function resolveDayFill(isWeekend: boolean, isHoliday: boolean): string {
  if (isHoliday) {
    return EXCEL_COLOR_TOKENS.headerHoliday;
  }

  if (isWeekend) {
    return EXCEL_COLOR_TOKENS.headerWeekend;
  }

  return EXCEL_COLOR_TOKENS.headerNormal;
}

export function resolveDayBodyFill(
  options: RolTurnosExportBuildOptions,
  celda:
    | MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number]
    | undefined,
  isWeekend: boolean,
  isHoliday: boolean,
  value: string,
): string | null {
  if (options.estilo !== 'color') {
    return isHoliday ? EXCEL_COLOR_TOKENS.textModeHolidayBody : null;
  }

  if (hasIncidenciaRegistros(celda)) {
    return EXCEL_COLOR_TOKENS.incidenciaBackground;
  }

  const mapper = options.mapper;
  const configuredColor = celda?.registros
    .map((registro) => mapper.resolveColor(registro.codigo))
    .find(Boolean);

  if (configuredColor) {
    return normalizeExcelFill(configuredColor);
  }

  const normalized = value.toUpperCase();

  if (hasCellCode(celda, normalized, ['VAC', 'VACACION'])) {
    return 'FFFFF0F3';
  }
  if (hasCellCode(celda, normalized, ['LIC', 'LICENCIA', 'LV'])) {
    return 'FFFFF4E5';
  }
  if (hasCellCode(celda, normalized, ['FN', 'FERIADO'])) {
    return EXCEL_COLOR_TOKENS.bodyHoliday;
  }
  if (hasCellCode(celda, normalized, ['BAJA', 'BAJA_MEDICA'])) {
    return 'FFFDECEC';
  }
  if (hasCellCode(celda, normalized, ['DES', 'DESCANSO'])) {
    return 'FFF1F5F9';
  }
  if (hasCellCode(celda, normalized, ['M'])) {
    return 'FFE6F4EA';
  }
  if (hasCellCode(celda, normalized, ['T'])) {
    return 'FFE8F0FE';
  }
  if (hasCellCode(celda, normalized, ['N'])) {
    return 'FFECE8FF';
  }
  if (isHoliday) {
    return EXCEL_COLOR_TOKENS.bodyHoliday;
  }
  if (isWeekend) {
    return EXCEL_COLOR_TOKENS.bodyWeekend;
  }
  return null;
}

export function hasIncidenciaRegistros(
  celda:
    | MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number]
    | undefined,
) {
  return (celda?.registros ?? []).some((registro) =>
    isIncidenciaCodigo((registro.codigo ?? '').trim().toUpperCase()),
  );
}

export function isIncidenciaCodigo(codigo: string) {
  return [
    'VACACION',
    'VAC',
    'VA',
    'LICENCIA',
    'LIC',
    'LI',
    'LV',
    'BAJA_MEDICA',
    'BAJA',
    'BM',
    'DESCANSO',
    'DES',
    'DE',
    'PERMISO',
    'PER',
    'PE',
    'FALTA',
    'FAL',
    'FA',
    'COMISION',
    'COM',
    'CO',
  ].includes(codigo);
}

export function normalizeExcelFill(color: string): string {
  const normalized = color.trim().replace('#', '').toUpperCase();

  if (normalized.length === 6) {
    return `FF${normalized}`;
  }

  if (normalized.length === 8) {
    return normalized;
  }

  return 'FFFFFFFF';
}

export function hasCellCode(
  celda:
    | MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number]
    | undefined,
  renderedValue: string,
  expectedCodes: string[],
): boolean {
  const normalizedCodes = expectedCodes.map((code) =>
    code.trim().toUpperCase(),
  );

  if (
    celda?.registros.some((registro) =>
      normalizedCodes.includes((registro.codigo ?? '').trim().toUpperCase()),
    )
  ) {
    return true;
  }

  return normalizedCodes.some((code) => renderedValue.includes(code));
}

export function wrapPersonalNames(nombres: string): string {
  const normalized = nombres
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalized.length <= 1) {
    return normalized.join(' ');
  }

  return `${normalized[0]}\n${normalized.slice(1).join(' ')}`;
}

export function countWrappedLines(
  text: string,
  approxCharsPerLine: number,
): number {
  if (!text.trim()) {
    return 1;
  }

  return text
    .split('\n')
    .map((segment) =>
      Math.max(1, Math.ceil(segment.length / approxCharsPerLine)),
    )
    .reduce((total, count) => total + count, 0);
}
