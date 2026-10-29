import type ExcelJS from 'exceljs';
import { PaperSize } from 'exceljs';

export function sanitizeWorksheetName(
  value: string | null | undefined,
): string {
  const normalized = (value || 'Rol turnos')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim();

  return normalized.slice(0, 31) || 'Rol turnos';
}

export function buildUniqueWorksheetName(
  workbook: ExcelJS.Workbook,
  preferredName: string | null | undefined,
  suffixHint?: string | null,
): string {
  const baseName = sanitizeWorksheetName(preferredName);
  const existingNames = new Set(
    workbook.worksheets.map((worksheet) => worksheet.name.toUpperCase()),
  );

  if (!existingNames.has(baseName.toUpperCase())) {
    return baseName;
  }

  const normalizedSuffix = suffixHint
    ? sanitizeWorksheetName(suffixHint).replace(/\s+/g, ' ')
    : '';
  const baseWithSuffix = normalizedSuffix
    ? sanitizeWorksheetName(`${baseName} ${normalizedSuffix}`)
    : baseName;

  if (!existingNames.has(baseWithSuffix.toUpperCase())) {
    return baseWithSuffix;
  }

  for (let index = 2; index <= 99; index += 1) {
    const candidate = sanitizeWorksheetName(`${baseWithSuffix} ${index}`);
    if (!existingNames.has(candidate.toUpperCase())) {
      return candidate;
    }
  }

  return sanitizeWorksheetName(`${baseName} copia`);
}

export function configureWorksheetForPrint(
  worksheet: ExcelJS.Worksheet,
  options?: { freezeColumns?: number; freezeRows?: number },
): void {
  worksheet.views = [
    {
      state: 'frozen',
      xSplit: options?.freezeColumns ?? 0,
      ySplit: options?.freezeRows ?? 6,
    },
  ];
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 14 as PaperSize,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3,
    },
    horizontalCentered: true,
    verticalCentered: false,
    printTitlesRow: '1:6',
  };
  worksheet.properties.defaultRowHeight = 18;
}

export function buildMonthRangeLabel(
  anio: number,
  mes: number,
  totalDias: number,
): string {
  const month = new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(anio, mes - 1, 1)))
    .toUpperCase();

  return `01 DE ${month} AL ${String(totalDias).padStart(2, '0')} DE ${month} DE ${anio}`;
}

export function formatTimeRange(
  horaInicio: string | null,
  horaFin: string | null,
): string {
  if (!horaInicio || !horaFin) {
    return '';
  }

  return `${horaInicio.slice(0, 5)}-${horaFin.slice(0, 5)}`;
}
