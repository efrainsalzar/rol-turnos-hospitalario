import { Injectable } from '@nestjs/common';
import { PlanificacionExcelExportService } from './export/planificacion-excel-export.service';
import type { MatrizMensualPlanificacionResponseDto } from '../dto/matriz-mensual-planificacion-response.dto';
import {
  resolveEstiloExportacion,
  resolveFormatoExportacion,
  resolveModoExportacion,
  type ModoExportacionRolTurnos,
  type RolTurnosExportOptions,
} from './export/turno-export-code.mapper';
import { TurnoExportCodeCatalogService } from './export/turno-export-code-catalog.service';
import { agruparFilaPorHorario } from './export/rol-turnos-agrupacion-horario';
import type { TurnoExportCodeMapper } from './export/turno-export-code.mapper';
import { readInstitutionEnv } from '../../../../infrastructure/config/institution-env';
import {
  buildPlanificacionEtiquetaCorta,
  buildPlanificacionTituloExportacion,
} from './export/planificacion-unidad.helper';

type FilaMatriz = MatrizMensualPlanificacionResponseDto['filas'][number];
type DiaFilaMatriz = FilaMatriz['dias'][number];

const EXPORT_COLOR_TOKENS = {
  headerNormal: '#EDF4FB',
  headerWeekend: '#EEF1F4',
  headerHoliday: '#FDF1C7',
  bodyWeekend: '#F4F6F8',
  bodyHoliday: '#FFF7CC',
  incidenciaBackground: '#E6FBF5',
  incidenciaText: '#0F766E',
  holidayText: '#846400',
  textModeHolidayHeader: '#D9D9D9',
  textModeHolidayBody: '#EFEFEF',
} as const;

@Injectable()
export class PlanificacionMatrizExportService {
  constructor(
    private readonly planificacionExcelExportService: PlanificacionExcelExportService,
    private readonly turnoExportCodeCatalogService: TurnoExportCodeCatalogService,
  ) {}

  async buildExcelBuffer(
    data: MatrizMensualPlanificacionResponseDto,
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<Buffer> {
    return this.planificacionExcelExportService.buildWorkbookBuffer(
      data,
      options,
    );
  }

  async buildExcelBufferMany(
    data: MatrizMensualPlanificacionResponseDto[],
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<Buffer> {
    return this.planificacionExcelExportService.buildWorkbookBufferMany(
      data,
      options,
    );
  }

  async buildPrintableHtml(
    data: MatrizMensualPlanificacionResponseDto,
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<string> {
    const modo = resolveModoExportacion(options?.modo);
    const estilo = resolveEstiloExportacion(options?.estilo);
    const formato = resolveFormatoExportacion(options?.formato);
    const useColor = estilo === 'color';
    const institution = readInstitutionEnv();
    const mapper = await this.turnoExportCodeCatalogService.buildMapper(
      data.planificacion.id,
    );
    const legend = mapper.buildLegend(data, modo);
    const dayNumberHeaders = data.dias
      .map((dia) => {
        const holidayCode = resolveHolidayHeaderCode(
          dia.esFeriado,
          dia.codigoFeriado,
        );
        const holidayTitle = buildHolidayHeaderTitle(
          dia.esFeriado,
          dia.codigoFeriado,
          dia.nombreFeriado,
          holidayCode,
        );

        return `
          <th class="day ${dia.esFinSemana ? 'weekend' : ''} ${dia.esFeriado ? 'holiday' : ''}" title="${escapeHtml(
            holidayTitle,
          )}">
            <div class="day-number">${dia.diaMes}</div>${
              holidayCode
                ? `<div class="holiday-code">${escapeHtml(holidayCode)}</div>`
                : ''
            }
          </th>`;
      })
      .join('');
    const dayWeekdayHeaders = data.dias
      .map(
        (dia) => `
          <th class="day ${dia.esFinSemana ? 'weekend' : ''} ${dia.esFeriado ? 'holiday' : ''}">
            <div class="day-code">${dia.abreviaturaDiaSemana}</div>
          </th>`,
      )
      .join('');

    const rows =
      formato === 'multi-horario'
        ? buildRowsMultiHorario(data, mapper, modo, useColor)
        : buildRowsUnaFila(data, mapper, modo, useColor);

    const legendItems = legend
      .map(
        (entry) =>
          `<tr>
            <td class="legend-code"><strong>${escapeHtml(entry.codigo)}</strong></td>
            <td class="legend-description">${escapeHtml(entry.descripcion)}</td>
          </tr>`,
      )
      .join('');

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(buildPlanificacionTituloExportacion(data.planificacion))}</title>
    <style>
      @page { size: 13in 8.5in; margin: 0.2in; }
      html, body { margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #1f2937; }
      h1, h2, h3, p { margin: 0; }
      .report-shell { padding: 4px 2px 0; box-sizing: border-box; }
      .header-grid { display: grid; grid-template-columns: 1.15fr 1.85fr; gap: 8px; align-items: start; }
      .header-left p { font-size: 9px; font-weight: 700; line-height: 1.2; }
      .header-center { text-align: center; }
      .header-center h1 { font-size: 15px; }
      .header-center h2 { font-size: 12px; margin-top: 2px; line-height: 1.15; }
      .header-date {
        margin-top: 4px;
        padding: 3px 6px;
        border: 2px solid #102a43;
        font-size: 12px;
        font-weight: 700;
        display: inline-block;
        background: #fff;
      }
      .table-wrap {
        margin-top: 8px;
        overflow-x: auto;
        overflow-y: auto;
        max-width: 100%;
        border: 1px solid #d9e2ec;
        background: #ffffff;
      }
      table {
        width: max-content;
        min-width: 100%;
        border-collapse: collapse;
        table-layout: auto;
        font-size: 8px;
      }
      th, td { border: 1px solid #b8c2cc; padding: 1px 2px; text-align: center; vertical-align: middle; line-height: 1.05; }
      thead th { background: ${useColor ? EXPORT_COLOR_TOKENS.headerNormal : 'transparent'}; font-weight: 700; }
      thead .top-header th { border-bottom-width: 1px; }
      thead .sub-header th { border-top-width: 1px; }
      .day-number { font-weight: 700; line-height: 1.05; display: block; }
      .day-code { font-size: 7px; color: #51606f; line-height: 1; }
      .holiday-code { color: ${useColor ? EXPORT_COLOR_TOKENS.holidayText : '#1f2937'}; font-weight: 800; letter-spacing: 0.1px; font-size: 0.68em; line-height: 0.95; display: block; }
      th.day.weekend { background: ${useColor ? EXPORT_COLOR_TOKENS.headerWeekend : 'transparent'} !important; }
      th.day.holiday { background: ${useColor ? EXPORT_COLOR_TOKENS.headerHoliday : EXPORT_COLOR_TOKENS.textModeHolidayHeader} !important; }
      td.day-cell.weekend { background: ${useColor ? EXPORT_COLOR_TOKENS.bodyWeekend : 'transparent'}; }
      td.day-cell.holiday { background: ${useColor ? EXPORT_COLOR_TOKENS.bodyHoliday : EXPORT_COLOR_TOKENS.textModeHolidayBody}; }
      .left { background: ${useColor ? '#f8fafc' : 'transparent'}; text-align: left; }
      .right { background: ${useColor ? '#f8fafc' : 'transparent'}; }
      .no { min-width: 22px; width: 22px; text-align: center; }
      .item { min-width: 52px; max-width: 58px; }
      .ch, .ci, .itemcode { min-width: 34px; max-width: 40px; text-align: center; }
      .ap, .am { min-width: 72px; max-width: 76px; white-space: normal; word-break: break-word; }
      .names { min-width: 74px; max-width: 80px; white-space: normal; word-break: break-word; }
      .cargo { min-width: 74px; max-width: 82px; white-space: normal; word-break: break-word; }
      .total { min-width: 38px; max-width: 42px; }
      .horario { min-width: 54px; max-width: 62px; white-space: normal; word-break: break-word; }
      .observacion { min-width: 86px; max-width: 96px; text-align: left; white-space: normal; word-break: break-word; }
      .day, .day-cell { min-width: 20px; width: 20px; max-width: 20px; }
      .legend-block { margin-top: 8px; max-width: 44%; }
      .legend-title { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
      .legend-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8px; }
      .legend-table td { border: 1px solid #b8c2cc; padding: 2px 3px; vertical-align: top; text-align: left; }
      .legend-code { width: 22%; text-align: center !important; font-weight: 700; background: ${useColor ? '#f8fafc' : '#ffffff'}; }
      .legend-description { width: 78%; white-space: normal; word-break: break-word; line-height: 1.15; }
      .holiday-note { margin-top: 6px; font-size: 8px; color: #5b6470; line-height: 1.1; }
      @media print {
        body { margin: 0; }
        .report-shell { padding: 0; }
        .table-wrap {
          overflow: visible;
          max-width: none;
          border: 1px solid #d9e2ec;
        }
        thead { display: table-header-group; }
        tr, td, th {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div class="report-shell">
    <div class="header-grid">
      <div class="header-left">
        ${institution.headerLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
      </div>
      <div class="header-center">
        <h1>${escapeHtml(institution.name)}</h1>
        <h2>${escapeHtml(buildPlanificacionEtiquetaCorta(data.planificacion).toUpperCase())}</h2>
        <div class="header-date">${escapeHtml(
          buildMonthRangeLabelForHtml(
            data.planificacion.anio,
            data.planificacion.mes,
            data.dias.length,
          ),
        )}</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr class="top-header">
            <th rowspan="2">No.</th>
            <th rowspan="2">Nro. ITEM</th>
            <th rowspan="2">C/H</th>
            <th rowspan="2">C.I.</th>
            <th rowspan="2">ITEM TGN, MIN ASSO</th>
            <th colspan="2">APELLIDO</th>
            <th rowspan="2">Nombres</th>
            <th rowspan="2">Cargo Actual</th>
            ${dayNumberHeaders}
            <th rowspan="2">Total Hrs<br/>Mes</th>
            <th rowspan="2">Horario<br/>Resumen</th>
            <th rowspan="2">Observaciones</th>
          </tr>
          <tr class="sub-header">
            <th>Paterno</th>
            <th>Materno</th>
            ${dayWeekdayHeaders}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="legend-block">
      <div class="legend-title">LEYENDA</div>
      <table class="legend-table">
        <tbody>${legendItems}</tbody>
      </table>
    </div>
    <div class="holiday-note">F/FN/FR/FI en la cabecera indica que el dia es feriado. La asignacion de turnos depende de cada unidad.</div>
    </div>
  </body>
</html>`;
  }

  async buildPrintableHtmlMany(
    data: MatrizMensualPlanificacionResponseDto[],
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<string> {
    const pages = await Promise.all(
      data.map((matriz) => this.buildPrintableHtml(matriz, options)),
    );

    const normalizedPages = pages.map((html) => extractBodyContent(html));

    return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Rol de turnos multiple</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #ffffff; }
      .page-break { page-break-after: always; break-after: page; }
      .page-break:last-child { page-break-after: auto; break-after: auto; }
    </style>
  </head>
  <body>
    ${normalizedPages
      .map((content) => `<section class="page-break">${content}</section>`)
      .join('')}
  </body>
</html>`;
  }
}

function buildRowsUnaFila(
  data: MatrizMensualPlanificacionResponseDto,
  mapper: TurnoExportCodeMapper,
  modo: ModoExportacionRolTurnos,
  useColor: boolean,
): string {
  return data.filas
    .map((fila) => buildFilaRowHtml(fila, data, mapper, modo, useColor))
    .join('');
}

/**
 * Version multi-horario de la vista previa: una persona con un solo turno
 * en el mes se renderiza igual que hoy (buildFilaRowHtml). Una persona con
 * varios turnos distintos ocupa un bloque de N <tr>, con rowspan en las
 * columnas de identidad/total/observaciones y en los dias de incidencia
 * (sin turno), para que esos datos aparezcan una sola vez por persona.
 */
function buildRowsMultiHorario(
  data: MatrizMensualPlanificacionResponseDto,
  mapper: TurnoExportCodeMapper,
  modo: ModoExportacionRolTurnos,
  useColor: boolean,
): string {
  return data.filas
    .map((fila) => {
      const agrupada = agruparFilaPorHorario(fila);

      if (agrupada.tipo === 'simple') {
        return buildFilaRowHtml(fila, data, mapper, modo, useColor);
      }

      const totalFilas = agrupada.grupos.length;

      return agrupada.grupos
        .map((grupo, grupoIndex) => {
          const esPrimeraFila = grupoIndex === 0;

          const dayCells = data.dias
            .map((dia) => {
              if (agrupada.diasIncidencia.has(dia.idCalendario)) {
                if (!esPrimeraFila) {
                  return '';
                }
                return buildDayCellHtml(
                  dia,
                  agrupada.diasIncidencia.get(dia.idCalendario),
                  mapper,
                  modo,
                  useColor,
                  totalFilas,
                );
              }

              return buildDayCellHtml(
                dia,
                grupo.dias.get(dia.idCalendario),
                mapper,
                modo,
                useColor,
              );
            })
            .join('');

          const identityCells = esPrimeraFila
            ? buildIdentityCellsHtml(fila, totalFilas)
            : '';
          const trailingMergedCells = esPrimeraFila
            ? buildTotalYObservacionHtml(fila, totalFilas)
            : '';

          return `
          <tr>
            ${identityCells}
            ${dayCells}
            <td class="sticky right horario">${escapeHtml(grupo.horarioResumen)}</td>
            ${trailingMergedCells}
          </tr>`;
        })
        .join('');
    })
    .join('');
}

function buildFilaRowHtml(
  fila: FilaMatriz,
  data: MatrizMensualPlanificacionResponseDto,
  mapper: TurnoExportCodeMapper,
  modo: ModoExportacionRolTurnos,
  useColor: boolean,
): string {
  const dayCells = data.dias
    .map((dia) => {
      const celda = fila.dias.find(
        (item) => item.idCalendario === dia.idCalendario,
      );
      return buildDayCellHtml(dia, celda, mapper, modo, useColor);
    })
    .join('');

  return `
          <tr>
            ${buildIdentityCellsHtml(fila)}
            ${dayCells}
            <td class="sticky right total">${fila.totalHorasMes}</td>
            <td class="sticky right horario">${escapeHtml(fila.horarioResumen)}</td>
            <td class="sticky right observacion">${escapeHtml(fila.observacionMensual ?? '')}</td>
          </tr>`;
}

function buildIdentityCellsHtml(fila: FilaMatriz, rowspan?: number): string {
  const rowspanAttr = rowspan ? ` rowspan="${rowspan}"` : '';

  return `
            <td class="sticky left no"${rowspanAttr}>${fila.numeroFila}</td>
            <td class="sticky left item"${rowspanAttr}>${escapeHtml(fila.nroItem ?? '')}</td>
            <td class="sticky left ch"${rowspanAttr}>${escapeHtml(fila.cargaHorariaCodigo ?? '')}</td>
            <td class="sticky left ci"${rowspanAttr}>${escapeHtml(fila.ci ?? '')}</td>
            <td class="sticky left itemcode"${rowspanAttr}>${escapeHtml(fila.tipoContratoCodigo ?? fila.codigoFuenteItem ?? '')}</td>
            <td class="sticky left ap"${rowspanAttr}>${escapeHtml(fila.apellidoPaterno ?? '')}</td>
            <td class="sticky left am"${rowspanAttr}>${escapeHtml(fila.apellidoMaterno ?? '')}</td>
            <td class="sticky left names"${rowspanAttr}>${formatNamesHtml(fila.nombres ?? '')}</td>
            <td class="sticky left cargo"${rowspanAttr}>${escapeHtml(fila.cargoActual ?? '')}</td>`;
}

function buildTotalYObservacionHtml(fila: FilaMatriz, rowspan: number): string {
  return `
            <td class="sticky right total" rowspan="${rowspan}">${fila.totalHorasMes}</td>
            <td class="sticky right observacion" rowspan="${rowspan}">${escapeHtml(fila.observacionMensual ?? '')}</td>`;
}

function buildDayCellHtml(
  dia: MatrizMensualPlanificacionResponseDto['dias'][number],
  celda: DiaFilaMatriz | undefined,
  mapper: TurnoExportCodeMapper,
  modo: ModoExportacionRolTurnos,
  useColor: boolean,
  rowspan?: number,
): string {
  const configuredColor =
    celda?.registros
      .map((registro) => mapper.resolveColor(registro.codigo))
      .find(Boolean) ?? null;
  const incidenciaColor = hasIncidenciaRegistros(celda?.registros)
    ? EXPORT_COLOR_TOKENS.incidenciaBackground
    : null;
  const incidenciaTextColor = hasIncidenciaRegistros(celda?.registros)
    ? EXPORT_COLOR_TOKENS.incidenciaText
    : null;
  const tooltip = (celda?.registros ?? [])
    .map((registro) =>
      `${mapper.mapRegistro(registro, modo)} ${registro.nombre ?? ''} ${formatHorario(
        registro.horaInicio,
        registro.horaFin,
      )}`.trim(),
    )
    .join(' | ');
  const rowspanAttr = rowspan ? ` rowspan="${rowspan}"` : '';

  return `<td class="day-cell ${dia.esFinSemana ? 'weekend' : ''} ${
    dia.esFeriado ? 'holiday' : ''
  }"${rowspanAttr} style="${
    useColor && (incidenciaColor || configuredColor)
      ? `background:${escapeHtml(incidenciaColor || configuredColor || '')};${
          incidenciaTextColor ? `color:${escapeHtml(incidenciaTextColor)};` : ''
        }`
      : ''
  }" title="${escapeHtml(tooltip)}">${escapeHtml(
    mapper.mapCelda(celda, modo),
  )}</td>`;
}

function extractBodyContent(html: string): string {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match?.[1]?.trim() ?? html;
}

function buildMonthRangeLabelForHtml(
  anio: number,
  mes: number,
  totalDias: number,
) {
  const monthName = new Intl.DateTimeFormat('es-BO', {
    month: 'long',
    timeZone: 'UTC',
  })
    .format(new Date(Date.UTC(anio, mes - 1, 1)))
    .toUpperCase();

  return `01 DE ${monthName} AL ${String(totalDias).padStart(
    2,
    '0',
  )} DE ${monthName} DE ${anio}`;
}

function formatHorario(horaInicio: string | null, horaFin: string | null) {
  if (!horaInicio || !horaFin) {
    return '';
  }

  return `${horaInicio.slice(0, 5)}-${horaFin.slice(0, 5)}`;
}

function formatNamesHtml(nombres: string) {
  return escapeHtml(wrapPersonalNames(nombres)).replaceAll('\n', '<br/>');
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

function buildHolidayHeaderTitle(
  isHoliday: boolean,
  persistedCode: string | null,
  holidayName: string | null,
  holidayCode: string | null,
) {
  if (!isHoliday) {
    return '';
  }

  if (holidayName) {
    return `${persistedCode || holidayCode || 'F'} · ${holidayName}`;
  }

  return `Feriado ${persistedCode || holidayCode || 'F'}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function wrapPersonalNames(nombres: string): string {
  const normalized = nombres
    .split(/\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalized.length <= 1) {
    return normalized.join(' ');
  }

  return `${normalized[0]}\n${normalized.slice(1).join(' ')}`;
}

function hasIncidenciaRegistros(
  registros:
    | MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number]['registros']
    | undefined,
) {
  return (registros ?? []).some((registro) =>
    isIncidenciaCodigo((registro.codigo || '').trim().toUpperCase()),
  );
}

function isIncidenciaCodigo(codigo: string) {
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
