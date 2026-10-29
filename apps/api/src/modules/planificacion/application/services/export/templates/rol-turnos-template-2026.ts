import { Injectable } from '@nestjs/common';
import type ExcelJS from 'exceljs';
import type { MatrizMensualPlanificacionResponseDto } from '../../../dto/matriz-mensual-planificacion-response.dto';
import type { RolTurnosExcelTemplate } from './rol-turnos-template.interface';
import { type RolTurnosExportBuildOptions } from '../turno-export-code.mapper';
import type { InstitutionEnv } from '../../../../../../infrastructure/config/institution-env';
import {
  buildUniqueWorksheetName,
  buildMonthRangeLabel,
  configureWorksheetForPrint,
} from '../styles/excel-layout.helpers';
import {
  applyBodyCellStyle,
  applyHeaderCellStyle,
  applyInstitutionTitleStyle,
} from '../styles/excel-style.helpers';
import {
  EXCEL_COLOR_TOKENS,
  countWrappedLines,
  resolveDayBodyFill,
  resolveDayFill,
  wrapPersonalNames,
} from './rol-turnos-2026-cell.helpers';
import { buildTableBodyMultiHorario } from './rol-turnos-template-2026-multi-horario';
import {
  buildPlanificacionEtiquetaCorta,
  buildPlanificacionNombreHoja,
} from '../planificacion-unidad.helper';

const ADMIN_COLUMNS = [
  { key: 'numeroFila', header: 'No.', width: 4 },
  { key: 'nroItem', header: 'Nro. ITEM', width: 8 },
  { key: 'cargaHorariaCodigo', header: 'C/H', width: 5 },
  { key: 'ci', header: 'C.I.', width: 9 },
  { key: 'tipoContrato', header: 'ITEM TGN, MIN ASSO', width: 9 },
  { key: 'apellidoPaterno', header: 'APELLIDO PATERNO', width: 12 },
  { key: 'apellidoMaterno', header: 'APELLIDO MATERNO', width: 12 },
  { key: 'nombres', header: 'NOMBRES', width: 13 },
  { key: 'cargoActual', header: 'CARGO ACTUAL', width: 14 },
] as const;

const TRAILING_COLUMNS = [
  { key: 'totalHorasMes', header: 'TOTAL HRS\nMES', width: 6 },
  { key: 'horarioResumen', header: 'HORARIO', width: 10 },
  { key: 'observacionMensual', header: 'OBSERVACIONES', width: 14 },
] as const;

// Ajustes manuales recomendados para impresion:
// - anchos: ADMIN_COLUMNS, DAY_COLUMN_WIDTH y TRAILING_COLUMNS
// - tipografia: HEADER_FONT_SIZE, BODY_FONT_SIZE y TITLE_FONT_SIZES
const DAY_COLUMN_WIDTH = 3;
const HEADER_FONT_SIZE = 10;
const BODY_FONT_SIZE = 9;
const TITLE_FONT_SIZES = {
  institution: 10,
  hospital: 16,
  service: 14,
  month: 14,
  legend: 10,
} as const;

@Injectable()
export class RolTurnosTemplate2026 implements RolTurnosExcelTemplate {
  supports(anio: number): boolean {
    return anio === 2026;
  }

  build(
    workbook: ExcelJS.Workbook,
    matriz: MatrizMensualPlanificacionResponseDto,
    options: RolTurnosExportBuildOptions,
  ): void {
    const worksheet = workbook.addWorksheet(
      buildUniqueWorksheetName(
        workbook,
        buildPlanificacionNombreHoja(matriz.planificacion),
        `${matriz.planificacion.mes}-${matriz.planificacion.anio}`,
      ),
    );
    configureWorksheetForPrint(worksheet, { freezeRows: 6 });

    defineColumns(worksheet, matriz.dias.length);
    buildInstitutionHeader(worksheet, matriz, options.institution);
    buildTableHeader(worksheet, matriz, options);

    const startRow = 7;
    let ultimaFilaCuerpo = startRow + matriz.filas.length - 1;

    if (options.formato === 'multi-horario') {
      ultimaFilaCuerpo = buildTableBodyMultiHorario(
        worksheet,
        matriz,
        options,
        {
          adminColumnCount: ADMIN_COLUMNS.length,
          bodyFontSize: BODY_FONT_SIZE,
          startRow,
        },
      );
    } else {
      buildTableBody(worksheet, matriz, options);
    }

    buildLegend(worksheet, matriz, options, ultimaFilaCuerpo);
  }
}

function defineColumns(worksheet: ExcelJS.Worksheet, dayCount: number): void {
  let columnIndex = 1;

  ADMIN_COLUMNS.forEach((column) => {
    worksheet.getColumn(columnIndex).width = column.width;
    columnIndex += 1;
  });

  for (let index = 0; index < dayCount; index += 1) {
    worksheet.getColumn(columnIndex).width = DAY_COLUMN_WIDTH;
    columnIndex += 1;
  }

  TRAILING_COLUMNS.forEach((column) => {
    worksheet.getColumn(columnIndex).width = column.width;
    columnIndex += 1;
  });
}

function buildInstitutionHeader(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  institution: InstitutionEnv,
): void {
  const rightStart = ADMIN_COLUMNS.length + 1;
  const rightEnd = ADMIN_COLUMNS.length + matriz.dias.length + 2;
  const leftEnd = rightStart - 1;
  const monthLabel = buildMonthRangeLabel(
    matriz.planificacion.anio,
    matriz.planificacion.mes,
    matriz.dias.length,
  );
  const serviceLabel = buildPlanificacionEtiquetaCorta(
    matriz.planificacion,
  ).toUpperCase();

  for (let row = 1; row <= 4; row += 1) {
    worksheet.mergeCells(row, 1, row, leftEnd);
    worksheet.mergeCells(row, rightStart, row, rightEnd);
  }

  institution.headerLines.forEach((line, index) => {
    const cell = worksheet.getCell(index + 1, 1);
    cell.value = line;
    applyInstitutionTitleStyle(cell, {
      size: TITLE_FONT_SIZES.institution,
      centered: false,
    });
  });

  worksheet.getCell(1, rightStart).value = institution.name;
  applyInstitutionTitleStyle(worksheet.getCell(1, rightStart), {
    size: TITLE_FONT_SIZES.hospital,
  });

  worksheet.getCell(2, rightStart).value = `ROL DE TURNOS ${serviceLabel}`;
  applyInstitutionTitleStyle(worksheet.getCell(2, rightStart), {
    size: TITLE_FONT_SIZES.service,
  });

  worksheet.getCell(3, rightStart).value = monthLabel;
  applyInstitutionTitleStyle(worksheet.getCell(3, rightStart), {
    size: TITLE_FONT_SIZES.month,
  });

  applyThickRangeBorder(worksheet, 3, rightStart, rightEnd);

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 16;
}

function buildTableHeader(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
): void {
  const useColor = options.estilo === 'color';
  const numberRow = 5;
  const weekdayRow = 6;
  let columnIndex = 1;

  ADMIN_COLUMNS.forEach((column) => {
    if (column.key === 'apellidoPaterno') {
      worksheet.mergeCells(numberRow, columnIndex, numberRow, columnIndex + 1);
      const parentCell = worksheet.getCell(numberRow, columnIndex);
      parentCell.value = 'APELLIDO';
      applyHeaderCellStyle(parentCell, {
        centered: true,
        noFill: !useColor,
        fontSize: HEADER_FONT_SIZE,
      });

      const paternoCell = worksheet.getCell(weekdayRow, columnIndex);
      paternoCell.value = 'PATERNO';
      applyHeaderCellStyle(paternoCell, {
        centered: true,
        noFill: !useColor,
        fontSize: HEADER_FONT_SIZE,
      });

      const maternoCell = worksheet.getCell(weekdayRow, columnIndex + 1);
      maternoCell.value = 'MATERNO';
      applyHeaderCellStyle(maternoCell, {
        centered: true,
        noFill: !useColor,
        fontSize: HEADER_FONT_SIZE,
      });

      columnIndex += 2;
      return;
    }

    if (column.key === 'apellidoMaterno') {
      return;
    }

    worksheet.mergeCells(numberRow, columnIndex, weekdayRow, columnIndex);
    const cell = worksheet.getCell(numberRow, columnIndex);
    cell.value = column.header;
    applyHeaderCellStyle(cell, {
      centered: true,
      noFill: !useColor,
      fontSize: HEADER_FONT_SIZE,
    });
    columnIndex += 1;
  });

  matriz.dias.forEach((dia) => {
    const numberCell = worksheet.getCell(numberRow, columnIndex);
    numberCell.value = buildHolidayHeaderLabel(dia);
    applyHeaderCellStyle(numberCell, {
      centered: true,
      fillArgb: useColor
        ? resolveDayFill(dia.esFinSemana, dia.esFeriado)
        : dia.esFeriado
          ? EXCEL_COLOR_TOKENS.textModeHolidayHeader
          : null,
      noFill: !useColor && !dia.esFeriado,
      fontSize: dia.esFeriado ? HEADER_FONT_SIZE - 1 : HEADER_FONT_SIZE,
    });

    const weekdayCell = worksheet.getCell(weekdayRow, columnIndex);
    weekdayCell.value = dia.abreviaturaDiaSemana;
    applyHeaderCellStyle(weekdayCell, {
      centered: true,
      fillArgb: useColor
        ? resolveDayFill(dia.esFinSemana, dia.esFeriado)
        : dia.esFeriado
          ? EXCEL_COLOR_TOKENS.textModeHolidayHeader
          : null,
      noFill: !useColor && !dia.esFeriado,
      fontSize: HEADER_FONT_SIZE,
    });
    columnIndex += 1;
  });

  TRAILING_COLUMNS.forEach((column) => {
    worksheet.mergeCells(numberRow, columnIndex, weekdayRow, columnIndex);
    const cell = worksheet.getCell(numberRow, columnIndex);
    cell.value = column.header;
    applyHeaderCellStyle(cell, {
      centered: true,
      noFill: !useColor,
      fontSize: HEADER_FONT_SIZE,
    });
    columnIndex += 1;
  });

  worksheet.getRow(numberRow).height = 24;
  worksheet.getRow(weekdayRow).height = 18;
}

function applyThickRangeBorder(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  startColumn: number,
  endColumn: number,
): void {
  for (let column = startColumn; column <= endColumn; column += 1) {
    const cell = worksheet.getCell(rowNumber, column);
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      left:
        column === startColumn
          ? { style: 'medium', color: { argb: 'FF000000' } }
          : undefined,
      right:
        column === endColumn
          ? { style: 'medium', color: { argb: 'FF000000' } }
          : undefined,
    };
  }

  const previousCell = worksheet.getCell(rowNumber, startColumn - 1);
  previousCell.border = {
    ...previousCell.border,
    right: { style: 'medium', color: { argb: 'FF000000' } },
  };
}

function buildTableBody(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
): void {
  const useColor = options.estilo === 'color';
  const startRow = 7;

  matriz.filas.forEach((fila, index) => {
    const rowNumber = startRow + index;
    const values = [
      fila.numeroFila,
      fila.nroItem ?? '',
      fila.cargaHorariaCodigo ?? '',
      fila.ci ?? '',
      fila.tipoContratoCodigo ?? fila.codigoFuenteItem ?? '',
      fila.apellidoPaterno ?? '',
      fila.apellidoMaterno ?? '',
      wrapPersonalNames(fila.nombres ?? ''),
      fila.cargoActual ?? '',
    ];

    values.forEach((value, valueIndex) => {
      const cell = worksheet.getCell(rowNumber, valueIndex + 1);
      cell.value = value;
      applyBodyCellStyle(cell, {
        centered: valueIndex <= 4,
        fillArgb: useColor && fila.esJefatura ? 'FFF4F8FC' : null,
        fontSize: BODY_FONT_SIZE,
      });
    });

    matriz.dias.forEach((dia, dayIndex) => {
      const cell = worksheet.getCell(
        rowNumber,
        ADMIN_COLUMNS.length + dayIndex + 1,
      );
      const celda = fila.dias.find(
        (item) => item.idCalendario === dia.idCalendario,
      );
      const renderedValue = options.mapper.mapCelda(celda, options.modo);

      cell.value = renderedValue;
      applyBodyCellStyle(cell, {
        centered: true,
        bold: Boolean(celda?.valorVisual),
        fillArgb: resolveDayBodyFill(
          options,
          celda,
          dia.esFinSemana,
          dia.esFeriado,
          renderedValue,
        ),
        fontSize: BODY_FONT_SIZE,
      });
    });

    const totalColumn = ADMIN_COLUMNS.length + matriz.dias.length + 1;
    const horarioColumn = totalColumn + 1;
    const observacionColumn = horarioColumn + 1;

    worksheet.getCell(rowNumber, totalColumn).value = fila.totalHorasMes;
    worksheet.getCell(rowNumber, horarioColumn).value = (
      fila.horarioResumen || ''
    ).replaceAll(',', '\n');
    worksheet.getCell(rowNumber, observacionColumn).value =
      fila.observacionMensual ?? '';

    applyBodyCellStyle(worksheet.getCell(rowNumber, totalColumn), {
      centered: true,
      fillArgb: useColor && fila.esJefatura ? 'FFF4F8FC' : null,
      fontSize: BODY_FONT_SIZE,
    });
    applyBodyCellStyle(worksheet.getCell(rowNumber, horarioColumn), {
      centered: true,
      fillArgb: useColor && fila.esJefatura ? 'FFF4F8FC' : null,
      fontSize: BODY_FONT_SIZE,
    });
    applyBodyCellStyle(worksheet.getCell(rowNumber, observacionColumn), {
      fillArgb: useColor && fila.esJefatura ? 'FFF4F8FC' : null,
      fontSize: BODY_FONT_SIZE,
    });

    worksheet.getRow(rowNumber).height = estimateRowHeight(fila);
  });
}

function buildLegend(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  ultimaFilaCuerpo: number = 6 + matriz.filas.length,
): void {
  const useColor = options.estilo === 'color';
  const legendEntries = options.mapper.buildLegend(matriz, options.modo);
  const hasHolidays = matriz.dias.some((dia) => dia.esFeriado);
  const startRow = ultimaFilaCuerpo + 2;
  const legendEndColumn = ADMIN_COLUMNS.length;
  const legendCodeEndColumn = 2;
  const legendDescriptionStartColumn = legendCodeEndColumn + 1;

  worksheet.mergeCells(startRow, 1, startRow, legendEndColumn);
  worksheet.getCell(startRow, 1).value = 'LEYENDA';
  applyInstitutionTitleStyle(worksheet.getCell(startRow, 1), {
    size: TITLE_FONT_SIZES.legend,
    centered: false,
  });

  legendEntries.forEach((entry, index) => {
    const rowNumber = startRow + index + 1;
    worksheet.mergeCells(rowNumber, 1, rowNumber, legendCodeEndColumn);
    worksheet.mergeCells(
      rowNumber,
      legendDescriptionStartColumn,
      rowNumber,
      legendEndColumn,
    );

    const codeCell = worksheet.getCell(rowNumber, 1);
    codeCell.value = entry.codigo;
    applyHeaderCellStyle(codeCell, {
      centered: true,
      fillArgb: useColor ? 'FFF8FAFC' : null,
      noFill: !useColor,
      fontSize: HEADER_FONT_SIZE,
    });

    const descriptionCell = worksheet.getCell(
      rowNumber,
      legendDescriptionStartColumn,
    );
    descriptionCell.value = entry.descripcion;
    applyBodyCellStyle(descriptionCell, { fontSize: BODY_FONT_SIZE });
    worksheet.getRow(rowNumber).height = estimateLegendRowHeight(
      entry.descripcion,
    );
  });

  if (hasHolidays) {
    const noteRow = startRow + legendEntries.length + 2;
    worksheet.mergeCells(noteRow, 1, noteRow, legendEndColumn);
    const noteCell = worksheet.getCell(noteRow, 1);
    noteCell.value =
      'F/FN/FR/FI en la cabecera indica que el dia es feriado. La asignacion de turnos depende de cada unidad.';
    applyBodyCellStyle(noteCell, { fontSize: BODY_FONT_SIZE });
    worksheet.getRow(noteRow).height = estimateLegendRowHeight(
      String(noteCell.value ?? ''),
    );
  }
}

function buildHolidayHeaderLabel(
  dia: MatrizMensualPlanificacionResponseDto['dias'][number],
) {
  const holidayCode = resolveHolidayHeaderCode(
    dia.esFeriado,
    dia.codigoFeriado,
  );
  return holidayCode ? `${dia.diaMes}\n${holidayCode}` : dia.diaMes;
}

function resolveHolidayHeaderCode(
  isHoliday: boolean,
  persistedCode: string | null,
) {
  if (!isHoliday) {
    return null;
  }

  return persistedCode && ['F', 'FN', 'FR', 'FI'].includes(persistedCode)
    ? persistedCode
    : 'F';
}

function estimateRowHeight(
  fila: MatrizMensualPlanificacionResponseDto['filas'][number],
): number {
  const horarioText = (fila.horarioResumen || '').replaceAll(',', '\n');
  const lineCount = Math.max(
    countWrappedLines(
      `${fila.apellidoPaterno || ''} ${fila.apellidoMaterno || ''} ${wrapPersonalNames(fila.nombres || '')}`.trim(),
      28,
    ),
    countWrappedLines(fila.cargoActual || '', 24),
    countWrappedLines(fila.observacionMensual || '', 32),
    countWrappedLines(horarioText, 16),
    1,
  );

  return Math.max(20, Math.min(18 + (lineCount - 1) * 12, 72));
}

function estimateLegendRowHeight(text: string): number {
  const lineCount = countWrappedLines(text, 36);
  return Math.max(16, Math.min(14 + (lineCount - 1) * 10, 60));
}
