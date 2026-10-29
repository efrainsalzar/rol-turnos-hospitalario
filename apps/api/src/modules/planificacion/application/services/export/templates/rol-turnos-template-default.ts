import { Injectable } from '@nestjs/common';
import type ExcelJS from 'exceljs';
import type { MatrizMensualPlanificacionResponseDto } from '../../../dto/matriz-mensual-planificacion-response.dto';
import type { RolTurnosExcelTemplate } from './rol-turnos-template.interface';
import { type RolTurnosExportBuildOptions } from '../turno-export-code.mapper';
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
import { buildTableBodyDefaultMultiHorario } from './rol-turnos-template-default-multi-horario';
import {
  buildPlanificacionEtiquetaCorta,
  buildPlanificacionNombreHoja,
} from '../planificacion-unidad.helper';

const DAY_COLUMN_WIDTH = 3;
const HEADER_FONT_SIZE = 10;
const BODY_FONT_SIZE = 9;
const DEFAULT_TEXT_MODE_HOLIDAY_HEADER = 'FFCFCFCF';

@Injectable()
export class RolTurnosTemplateDefault implements RolTurnosExcelTemplate {
  supports(): boolean {
    return true;
  }

  build(
    workbook: ExcelJS.Workbook,
    matriz: MatrizMensualPlanificacionResponseDto,
    options: RolTurnosExportBuildOptions,
  ): void {
    const useColor = options.estilo === 'color';
    const worksheet = workbook.addWorksheet(
      buildUniqueWorksheetName(
        workbook,
        buildPlanificacionNombreHoja(matriz.planificacion),
        `${matriz.planificacion.mes}-${matriz.planificacion.anio}`,
      ),
    );
    configureWorksheetForPrint(worksheet, { freezeRows: 4 });

    const totalColumns = 6 + matriz.dias.length;

    worksheet.mergeCells(1, 1, 1, totalColumns);
    worksheet.getCell(1, 1).value = 'ROL DE TURNOS';
    applyInstitutionTitleStyle(worksheet.getCell(1, 1), { size: 12 });

    worksheet.mergeCells(2, 1, 2, totalColumns);
    worksheet.getCell(2, 1).value =
      `${buildPlanificacionEtiquetaCorta(matriz.planificacion)} - ${buildMonthRangeLabel(
        matriz.planificacion.anio,
        matriz.planificacion.mes,
        matriz.dias.length,
      )}`;
    applyInstitutionTitleStyle(worksheet.getCell(2, 1), { size: 10 });

    worksheet.getColumn(1).width = 5.5;
    worksheet.getColumn(2).width = 10.5;
    worksheet.getColumn(3).width = 8;
    worksheet.getColumn(4).width = 16;
    worksheet.getColumn(5).width = 12;
    worksheet.getColumn(6).width = 7;

    worksheet.getCell(3, 1).value = 'No.';
    worksheet.getCell(3, 2).value = 'Item';
    worksheet.getCell(3, 3).value = 'C/H';
    worksheet.getCell(3, 4).value = 'Personal';
    worksheet.getCell(3, 5).value = 'Horario';
    worksheet.getCell(3, 6).value = 'Total';

    for (let column = 1; column <= 6; column += 1) {
      applyHeaderCellStyle(worksheet.getCell(3, column), {
        centered: true,
        noFill: !useColor,
        fontSize: HEADER_FONT_SIZE,
      });
    }

    matriz.dias.forEach((dia, index) => {
      const column = 7 + index;
      worksheet.getColumn(column).width = DAY_COLUMN_WIDTH;
      worksheet.getCell(3, column).value = buildHolidayHeaderLabel(dia);
      worksheet.getCell(4, column).value = dia.abreviaturaDiaSemana;
      applyHeaderCellStyle(worksheet.getCell(3, column), {
        centered: true,
        noFill: !useColor && !dia.esFeriado,
        fillArgb:
          useColor || !dia.esFeriado ? null : DEFAULT_TEXT_MODE_HOLIDAY_HEADER,
        fontSize: dia.esFeriado ? HEADER_FONT_SIZE - 1 : HEADER_FONT_SIZE,
      });
      applyHeaderCellStyle(worksheet.getCell(4, column), {
        centered: true,
        noFill: !useColor && !dia.esFeriado,
        fillArgb:
          useColor || !dia.esFeriado ? null : DEFAULT_TEXT_MODE_HOLIDAY_HEADER,
        fontSize: HEADER_FONT_SIZE,
      });
    });
    worksheet.getRow(3).height = 24;
    worksheet.getRow(4).height = 18;

    let ultimaFilaCuerpo = 4 + matriz.filas.length;

    if (options.formato === 'multi-horario') {
      ultimaFilaCuerpo = buildTableBodyDefaultMultiHorario(
        worksheet,
        matriz,
        options,
        5,
      );
    } else {
      matriz.filas.forEach((fila, index) => {
        const row = 5 + index;
        worksheet.getCell(row, 1).value = fila.numeroFila;
        worksheet.getCell(row, 2).value = fila.nroItem ?? '';
        worksheet.getCell(row, 3).value = fila.cargaHorariaCodigo ?? '';
        worksheet.getCell(row, 4).value = fila.nombreCompleto;
        worksheet.getCell(row, 5).value = fila.horarioResumen || '';
        worksheet.getCell(row, 6).value = fila.totalHorasMes;

        for (let column = 1; column <= 6; column += 1) {
          applyBodyCellStyle(worksheet.getCell(row, column), {
            centered: column !== 4,
            fontSize: BODY_FONT_SIZE,
          });
        }

        matriz.dias.forEach((dia, dayIndex) => {
          const column = 7 + dayIndex;
          const celda = fila.dias.find(
            (item) => item.idCalendario === dia.idCalendario,
          );
          worksheet.getCell(row, column).value = options.mapper.mapCelda(
            celda,
            options.modo,
          );
          applyBodyCellStyle(worksheet.getCell(row, column), {
            centered: true,
            fontSize: BODY_FONT_SIZE,
          });
        });

        worksheet.getRow(row).height = estimateRowHeight(fila);
      });
    }

    buildLegend(worksheet, matriz, options, totalColumns, ultimaFilaCuerpo);
  }
}

function buildLegend(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  totalColumns: number,
  ultimaFilaCuerpo: number,
): void {
  const legendEntries = options.mapper.buildLegend(matriz, options.modo);
  const hasHolidays = matriz.dias.some((dia) => dia.esFeriado);

  if (legendEntries.length === 0 && !hasHolidays) {
    return;
  }

  const startRow = ultimaFilaCuerpo + 2;
  worksheet.mergeCells(startRow, 1, startRow, totalColumns);
  worksheet.getCell(startRow, 1).value = 'LEYENDA';
  applyInstitutionTitleStyle(worksheet.getCell(startRow, 1), {
    size: 11,
    centered: false,
  });

  legendEntries.forEach((entry, index) => {
    const row = startRow + index + 1;
    worksheet.mergeCells(row, 1, row, 2);
    worksheet.mergeCells(row, 3, row, totalColumns);

    const codeCell = worksheet.getCell(row, 1);
    codeCell.value = entry.codigo;
    applyHeaderCellStyle(codeCell, {
      centered: true,
      noFill: options.estilo !== 'color',
      fillArgb: options.estilo === 'color' ? 'FFF8FAFC' : null,
      fontSize: HEADER_FONT_SIZE,
    });

    const descriptionCell = worksheet.getCell(row, 3);
    descriptionCell.value = entry.descripcion;
    applyBodyCellStyle(descriptionCell, { fontSize: BODY_FONT_SIZE });
  });

  if (hasHolidays) {
    const noteRow = startRow + legendEntries.length + 2;
    worksheet.mergeCells(noteRow, 1, noteRow, totalColumns);
    worksheet.getCell(noteRow, 1).value =
      'F/FN/FR/FI en la cabecera indica que el dia es feriado. La asignacion de turnos depende de cada unidad.';
    applyBodyCellStyle(worksheet.getCell(noteRow, 1), {
      fontSize: BODY_FONT_SIZE,
    });
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
    countWrappedLines(fila.nombreCompleto || '', 24),
    countWrappedLines(horarioText, 16),
    1,
  );

  return Math.max(20, Math.min(18 + (lineCount - 1) * 12, 72));
}

function countWrappedLines(text: string, approxCharsPerLine: number): number {
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
