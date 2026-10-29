import type ExcelJS from 'exceljs';
import type { MatrizMensualPlanificacionResponseDto } from '../../../dto/matriz-mensual-planificacion-response.dto';
import { type RolTurnosExportBuildOptions } from '../turno-export-code.mapper';
import { applyBodyCellStyle } from '../styles/excel-style.helpers';
import { agruparFilaPorHorario } from '../rol-turnos-agrupacion-horario';
import { countWrappedLines } from './rol-turnos-2026-cell.helpers';

type FilaMatriz = MatrizMensualPlanificacionResponseDto['filas'][number];

/**
 * Version multi-horario del cuerpo de RolTurnosTemplateDefault: misma idea
 * que la plantilla 2026 (una fila por turno unico del mes, con columnas de
 * identidad/total fusionadas y dias de incidencia fusionados), pero sobre
 * el layout mas simple de 6 columnas administrativas + dias. No aplica
 * color de fondo en las celdas de dia porque la plantilla default tampoco
 * lo hace en su formato de una fila.
 */
export function buildTableBodyDefaultMultiHorario(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  startRow: number,
): number {
  let rowNumber = startRow;

  matriz.filas.forEach((fila) => {
    const agrupada = agruparFilaPorHorario(fila);
    const filasDelBloque =
      agrupada.tipo === 'simple' ? 1 : agrupada.grupos.length;
    const filaInicioBloque = rowNumber;
    const filaFinBloque = filaInicioBloque + filasDelBloque - 1;

    writeColumnasIdentidad(worksheet, fila, filaInicioBloque, filaFinBloque);

    if (agrupada.tipo === 'simple') {
      writeCelda(worksheet, filaInicioBloque, 5, fila.horarioResumen || '');
      matriz.dias.forEach((dia, dayIndex) => {
        const celda = fila.dias.find(
          (item) => item.idCalendario === dia.idCalendario,
        );
        writeDiaCell(worksheet, celda, options, rowNumber, dayIndex);
      });
      worksheet.getRow(rowNumber).height = estimateRowHeight(
        fila.nombreCompleto,
        fila.horarioResumen,
      );
      rowNumber += 1;
      return;
    }

    matriz.dias.forEach((dia, dayIndex) => {
      const celda = agrupada.diasIncidencia.get(dia.idCalendario);

      if (!celda) {
        return;
      }

      const column = 7 + dayIndex;
      if (filaFinBloque > filaInicioBloque) {
        worksheet.mergeCells(filaInicioBloque, column, filaFinBloque, column);
      }
      const cell = worksheet.getCell(filaInicioBloque, column);
      cell.value = options.mapper.mapCelda(celda, options.modo);
      applyBodyCellStyle(cell, { centered: true, fontSize: BODY_FONT_SIZE });
    });

    const alturas = estimateAlturasBloque(fila, agrupada.grupos);

    agrupada.grupos.forEach((grupo, grupoIndex) => {
      writeCelda(worksheet, rowNumber, 5, grupo.horarioResumen);

      matriz.dias.forEach((dia, dayIndex) => {
        if (agrupada.diasIncidencia.has(dia.idCalendario)) {
          return;
        }
        const celda = grupo.dias.get(dia.idCalendario);
        writeDiaCell(worksheet, celda, options, rowNumber, dayIndex);
      });

      worksheet.getRow(rowNumber).height = alturas[grupoIndex];
      rowNumber += 1;
    });
  });

  return rowNumber - 1;
}

const BODY_FONT_SIZE = 9;

function writeColumnasIdentidad(
  worksheet: ExcelJS.Worksheet,
  fila: FilaMatriz,
  filaInicioBloque: number,
  filaFinBloque: number,
): void {
  writeCeldaFusionada(
    worksheet,
    fila.numeroFila,
    filaInicioBloque,
    filaFinBloque,
    1,
    {
      centered: true,
    },
  );
  writeCeldaFusionada(
    worksheet,
    fila.nroItem ?? '',
    filaInicioBloque,
    filaFinBloque,
    2,
    {
      centered: true,
    },
  );
  writeCeldaFusionada(
    worksheet,
    fila.cargaHorariaCodigo ?? '',
    filaInicioBloque,
    filaFinBloque,
    3,
    { centered: true },
  );
  writeCeldaFusionada(
    worksheet,
    fila.nombreCompleto,
    filaInicioBloque,
    filaFinBloque,
    4,
    { centered: false },
  );
  writeCeldaFusionada(
    worksheet,
    fila.totalHorasMes,
    filaInicioBloque,
    filaFinBloque,
    6,
    { centered: true },
  );
}

function writeCeldaFusionada(
  worksheet: ExcelJS.Worksheet,
  value: string | number,
  filaInicioBloque: number,
  filaFinBloque: number,
  column: number,
  style: Parameters<typeof applyBodyCellStyle>[1],
): void {
  if (filaFinBloque > filaInicioBloque) {
    worksheet.mergeCells(filaInicioBloque, column, filaFinBloque, column);
  }

  const cell = worksheet.getCell(filaInicioBloque, column);
  cell.value = value;
  applyBodyCellStyle(cell, { ...style, fontSize: BODY_FONT_SIZE });
}

function writeCelda(
  worksheet: ExcelJS.Worksheet,
  row: number,
  column: number,
  value: string,
): void {
  const cell = worksheet.getCell(row, column);
  cell.value = value;
  applyBodyCellStyle(cell, { centered: true, fontSize: BODY_FONT_SIZE });
}

function writeDiaCell(
  worksheet: ExcelJS.Worksheet,
  celda: FilaMatriz['dias'][number] | undefined,
  options: RolTurnosExportBuildOptions,
  row: number,
  dayIndex: number,
): void {
  const column = 7 + dayIndex;
  const cell = worksheet.getCell(row, column);
  cell.value = celda ? options.mapper.mapCelda(celda, options.modo) : '';
  applyBodyCellStyle(cell, { centered: true, fontSize: BODY_FONT_SIZE });
}

function estimateAlturasBloque(
  fila: FilaMatriz,
  grupos: Array<{ horarioResumen: string }>,
): number[] {
  const alturaIdentidad = estimateRowHeight(fila.nombreCompleto, '');
  const alturasPropias = grupos.map((grupo) =>
    estimateRowHeight('', grupo.horarioResumen),
  );
  const sumaPropia = alturasPropias.reduce(
    (total, altura) => total + altura,
    0,
  );

  if (sumaPropia < alturaIdentidad) {
    alturasPropias[0] += alturaIdentidad - sumaPropia;
  }

  return alturasPropias;
}

function estimateRowHeight(
  nombreCompleto: string,
  horarioResumen: string,
): number {
  const horarioText = (horarioResumen || '').replaceAll(',', '\n');
  const lineCount = Math.max(
    countWrappedLines(nombreCompleto || '', 24),
    countWrappedLines(horarioText, 16),
    1,
  );

  return Math.max(20, Math.min(18 + (lineCount - 1) * 12, 72));
}
