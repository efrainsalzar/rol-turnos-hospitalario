import type ExcelJS from 'exceljs';
import { thinGrayBorder } from './excel-border.helpers';

export function applyHeaderCellStyle(
  cell: ExcelJS.Cell,
  options?: {
    centered?: boolean;
    fillArgb?: string | null;
    fontSize?: number;
    noFill?: boolean;
  },
): void {
  cell.font = {
    bold: true,
    size: options?.fontSize ?? 9,
    color: { argb: 'FF243B53' },
  };
  if (!options?.noFill) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options?.fillArgb ?? 'FFDCE7F3' },
    };
  }
  cell.alignment = {
    vertical: 'middle',
    horizontal: options?.centered === false ? 'left' : 'center',
    wrapText: true,
  };
  cell.border = thinGrayBorder();
}

export function applyBodyCellStyle(
  cell: ExcelJS.Cell,
  options?: {
    centered?: boolean;
    fillArgb?: string | null;
    bold?: boolean;
    fontSize?: number;
  },
): void {
  cell.font = {
    size: options?.fontSize ?? 8,
    bold: options?.bold ?? false,
    color: { argb: 'FF102A43' },
  };
  if (options?.fillArgb) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: options.fillArgb },
    };
  }
  cell.alignment = {
    vertical: 'middle',
    horizontal: options?.centered ? 'center' : 'left',
    wrapText: true,
  };
  cell.border = thinGrayBorder();
}

export function applyInstitutionTitleStyle(
  cell: ExcelJS.Cell,
  options?: { size?: number; centered?: boolean },
): void {
  cell.font = {
    bold: true,
    size: options?.size ?? 11,
    color: { argb: 'FF102A43' },
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: options?.centered === false ? 'left' : 'center',
    wrapText: true,
  };
}
