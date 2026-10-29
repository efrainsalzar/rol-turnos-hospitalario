import type ExcelJS from 'exceljs';
import type { MatrizMensualPlanificacionResponseDto } from '../../../dto/matriz-mensual-planificacion-response.dto';
import { type RolTurnosExportBuildOptions } from '../turno-export-code.mapper';
import { applyBodyCellStyle } from '../styles/excel-style.helpers';
import {
  agruparFilaPorHorario,
  type FilaAgrupadaPorHorario,
} from '../rol-turnos-agrupacion-horario';
import {
  countWrappedLines,
  resolveDayBodyFill,
  wrapPersonalNames,
} from './rol-turnos-2026-cell.helpers';

type FilaMatriz = MatrizMensualPlanificacionResponseDto['filas'][number];

interface MultiHorarioLayoutOptions {
  adminColumnCount: number;
  bodyFontSize: number;
  startRow: number;
}

/**
 * Cuerpo de la tabla para formato=multi-horario: una persona con un solo
 * turno en el mes ocupa una fila, igual que hoy. Una persona con varios
 * turnos distintos ocupa un bloque de N filas (una por turno), fusionando
 * verticalmente las columnas que no varian por horario (identidad, total,
 * observaciones) y los dias de incidencia (sin turno), para que esos datos
 * aparezcan una sola vez por persona en vez de repetirse en cada fila.
 * Devuelve el numero de la ultima fila escrita, para que la leyenda se
 * ubique despues del cuerpo real (que puede tener mas filas que personas).
 */
export function buildTableBodyMultiHorario(
  worksheet: ExcelJS.Worksheet,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  layout: MultiHorarioLayoutOptions,
): number {
  let rowNumber = layout.startRow;

  matriz.filas.forEach((fila) => {
    const agrupada = agruparFilaPorHorario(fila);
    const filasDelBloque =
      agrupada.tipo === 'simple' ? 1 : agrupada.grupos.length;
    const filaInicioBloque = rowNumber;
    const filaFinBloque = filaInicioBloque + filasDelBloque - 1;

    writeColumnasIdentidad(
      worksheet,
      fila,
      filaInicioBloque,
      filaFinBloque,
      layout,
    );

    if (agrupada.tipo === 'simple') {
      writeDiasFilaCompleta(
        worksheet,
        fila,
        matriz,
        options,
        rowNumber,
        layout,
      );
      worksheet.getRow(rowNumber).height = estimateRowHeight(
        fila,
        fila.horarioResumen,
      );
      rowNumber += 1;
      return;
    }

    writeTotalYObservacionFusionados(
      worksheet,
      fila,
      filaInicioBloque,
      filaFinBloque,
      layout,
      matriz.dias.length,
    );

    writeDiasIncidenciaFusionados(
      worksheet,
      agrupada,
      matriz,
      options,
      filaInicioBloque,
      filaFinBloque,
      layout,
    );

    const alturasGrupo = estimateAlturasBloque(fila, agrupada.grupos);

    agrupada.grupos.forEach((grupo, grupoIndex) => {
      writeDiasGrupo(
        worksheet,
        grupo,
        agrupada.diasIncidencia,
        matriz,
        options,
        rowNumber,
        layout,
      );

      const horarioColumn = layout.adminColumnCount + matriz.dias.length + 2;
      const horarioCell = worksheet.getCell(rowNumber, horarioColumn);
      horarioCell.value = grupo.horarioResumen.replaceAll(',', '\n');
      applyBodyCellStyle(horarioCell, {
        centered: true,
        fontSize: layout.bodyFontSize,
      });

      worksheet.getRow(rowNumber).height = alturasGrupo[grupoIndex];
      rowNumber += 1;
    });
  });

  return rowNumber - 1;
}

function writeColumnasIdentidad(
  worksheet: ExcelJS.Worksheet,
  fila: FilaMatriz,
  filaInicioBloque: number,
  filaFinBloque: number,
  layout: MultiHorarioLayoutOptions,
): void {
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
    const column = valueIndex + 1;

    if (filaFinBloque > filaInicioBloque) {
      worksheet.mergeCells(filaInicioBloque, column, filaFinBloque, column);
    }

    const cell = worksheet.getCell(filaInicioBloque, column);
    cell.value = value;
    applyBodyCellStyle(cell, {
      centered: valueIndex <= 4,
      fontSize: layout.bodyFontSize,
    });
  });
}

function writeTotalYObservacionFusionados(
  worksheet: ExcelJS.Worksheet,
  fila: FilaMatriz,
  filaInicioBloque: number,
  filaFinBloque: number,
  layout: MultiHorarioLayoutOptions,
  dayCount: number,
): void {
  const totalColumn = layout.adminColumnCount + dayCount + 1;
  const observacionColumn = totalColumn + 2;

  writeCeldaFusionada(
    worksheet,
    fila.totalHorasMes,
    filaInicioBloque,
    filaFinBloque,
    totalColumn,
    { centered: true, fontSize: layout.bodyFontSize },
  );
  writeCeldaFusionada(
    worksheet,
    fila.observacionMensual ?? '',
    filaInicioBloque,
    filaFinBloque,
    observacionColumn,
    { fontSize: layout.bodyFontSize },
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
  applyBodyCellStyle(cell, style);
}

function writeDiasFilaCompleta(
  worksheet: ExcelJS.Worksheet,
  fila: FilaMatriz,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  rowNumber: number,
  layout: MultiHorarioLayoutOptions,
): void {
  matriz.dias.forEach((dia, dayIndex) => {
    const celda = fila.dias.find(
      (item) => item.idCalendario === dia.idCalendario,
    );
    writeDiaCell(
      worksheet,
      celda,
      dia,
      matriz,
      options,
      rowNumber,
      dayIndex,
      layout,
    );
  });

  const totalColumn = layout.adminColumnCount + matriz.dias.length + 1;
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
    fontSize: layout.bodyFontSize,
  });
  applyBodyCellStyle(worksheet.getCell(rowNumber, horarioColumn), {
    centered: true,
    fontSize: layout.bodyFontSize,
  });
  applyBodyCellStyle(worksheet.getCell(rowNumber, observacionColumn), {
    fontSize: layout.bodyFontSize,
  });
}

function writeDiasGrupo(
  worksheet: ExcelJS.Worksheet,
  grupo: { dias: Map<number, FilaMatriz['dias'][number]> },
  diasIncidencia: Map<number, FilaMatriz['dias'][number]>,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  rowNumber: number,
  layout: MultiHorarioLayoutOptions,
): void {
  matriz.dias.forEach((dia, dayIndex) => {
    if (diasIncidencia.has(dia.idCalendario)) {
      // Esta columna ya quedo fusionada verticalmente por
      // writeDiasIncidenciaFusionados: escribir aca pisaria esa celda
      // fusionada, porque ExcelJS redirige cualquier escritura sobre una
      // celda esclava de un merge hacia la celda maestra.
      return;
    }

    const celda = grupo.dias.get(dia.idCalendario);
    writeDiaCell(
      worksheet,
      celda,
      dia,
      matriz,
      options,
      rowNumber,
      dayIndex,
      layout,
    );
  });
}

function writeDiasIncidenciaFusionados(
  worksheet: ExcelJS.Worksheet,
  agrupada: Extract<FilaAgrupadaPorHorario, { tipo: 'multiple' }>,
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  filaInicioBloque: number,
  filaFinBloque: number,
  layout: MultiHorarioLayoutOptions,
): void {
  matriz.dias.forEach((dia, dayIndex) => {
    const celda = agrupada.diasIncidencia.get(dia.idCalendario);

    if (!celda) {
      return;
    }

    const column = layout.adminColumnCount + dayIndex + 1;

    if (filaFinBloque > filaInicioBloque) {
      worksheet.mergeCells(filaInicioBloque, column, filaFinBloque, column);
    }

    const renderedValue = options.mapper.mapCelda(celda, options.modo);
    const cell = worksheet.getCell(filaInicioBloque, column);
    cell.value = renderedValue;
    applyBodyCellStyle(cell, {
      centered: true,
      bold: Boolean(celda.valorVisual),
      fillArgb: resolveDayBodyFill(
        options,
        celda,
        dia.esFinSemana,
        dia.esFeriado,
        renderedValue,
      ),
      fontSize: layout.bodyFontSize,
    });
  });
}

function writeDiaCell(
  worksheet: ExcelJS.Worksheet,
  celda: FilaMatriz['dias'][number] | undefined,
  dia: MatrizMensualPlanificacionResponseDto['dias'][number],
  matriz: MatrizMensualPlanificacionResponseDto,
  options: RolTurnosExportBuildOptions,
  rowNumber: number,
  dayIndex: number,
  layout: MultiHorarioLayoutOptions,
): void {
  const column = layout.adminColumnCount + dayIndex + 1;
  const cell = worksheet.getCell(rowNumber, column);
  const renderedValue = celda
    ? options.mapper.mapCelda(celda, options.modo)
    : '';

  if (celda) {
    cell.value = renderedValue;
  }

  // Una celda en blanco (dia que no corresponde al turno de esta fila) igual
  // debe resolver el fondo de feriado/fin de semana, igual que en el formato
  // de una fila: resolveDayBodyFill ya soporta celda=undefined.
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
    fontSize: layout.bodyFontSize,
  });
}

function estimateRowHeight(fila: FilaMatriz, horarioResumen: string): number {
  const horarioText = (horarioResumen || '').replaceAll(',', '\n');
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

/**
 * Altura por fila del bloque multi-horario. Cada fila de grupo se
 * dimensiona por su propio texto de horario, pero como las columnas de
 * identidad (apellidos, cargo, observaciones) quedan fusionadas a lo largo
 * de todo el bloque, la suma de alturas del bloque debe alcanzar al menos
 * lo que esas columnas necesitan; si falta espacio, el excedente se agrega
 * a la primera fila del bloque.
 */
function estimateAlturasBloque(
  fila: FilaMatriz,
  grupos: Array<{ horarioResumen: string }>,
): number[] {
  const alturaIdentidad = estimateIdentityHeight(fila);
  const alturasPropias = grupos.map((grupo) =>
    estimateGrupoHeight(grupo.horarioResumen),
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

function estimateIdentityHeight(fila: FilaMatriz): number {
  const lineCount = Math.max(
    countWrappedLines(
      `${fila.apellidoPaterno || ''} ${fila.apellidoMaterno || ''} ${wrapPersonalNames(fila.nombres || '')}`.trim(),
      28,
    ),
    countWrappedLines(fila.cargoActual || '', 24),
    countWrappedLines(fila.observacionMensual || '', 32),
    1,
  );

  return Math.max(20, Math.min(18 + (lineCount - 1) * 12, 72));
}

function estimateGrupoHeight(horarioResumen: string): number {
  const horarioText = (horarioResumen || '').replaceAll(',', '\n');
  const lineCount = Math.max(countWrappedLines(horarioText, 16), 1);

  return Math.max(20, Math.min(18 + (lineCount - 1) * 12, 72));
}
