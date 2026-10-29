import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ObtenerMatrizMensualPlanificacionUseCase } from './obtener-matriz-mensual-planificacion.use-case';
import type { MatrizMensualPlanificacionResponseDto } from '../dto/matriz-mensual-planificacion-response.dto';

type Fila = MatrizMensualPlanificacionResponseDto['filas'][number];
type DiaCalendario = MatrizMensualPlanificacionResponseDto['dias'][number];
type DiaFila = Fila['dias'][number];
type Registro = DiaFila['registros'][number];

const MES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

@Injectable()
export class GenerarReportePersonalUseCase {
  private readonly logger = new Logger(GenerarReportePersonalUseCase.name);

  constructor(
    private readonly obtenerMatrizMensualPlanificacionUseCase: ObtenerMatrizMensualPlanificacionUseCase,
  ) {}

  async execute(
    idPlanificacion: number,
    idAsignacion: number,
  ): Promise<string> {
    this.logger.log(
      `Generando reporte personal: planificacion=${idPlanificacion}, asignacion=${idAsignacion}.`,
    );

    const matriz =
      await this.obtenerMatrizMensualPlanificacionUseCase.execute(
        idPlanificacion,
      );

    const fila = matriz.filas.find(
      (f) => f.idAsignacionPersonal === idAsignacion,
    );

    if (!fila) {
      throw new NotFoundException(
        'La persona seleccionada ya no pertenece a esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    return buildHtml(matriz, fila);
  }
}

function buildHtml(
  matriz: MatrizMensualPlanificacionResponseDto,
  fila: Fila,
): string {
  const { planificacion, dias } = matriz;
  const mesNombre =
    MES_NOMBRES[planificacion.mes - 1] ?? String(planificacion.mes);
  const periodoLabel = `${mesNombre} ${planificacion.anio}`;
  const nombreServicio =
    planificacion.nombreServicio || planificacion.codigoServicio || '—';
  const nombreCompleto = fila.nombreCompleto || '—';
  const ci = fila.ci || '—';
  const cargo = fila.cargoActual || '—';
  const cargaHoraria = fila.cargaHorariaCodigo || '—';
  const generadoEl = buildFechaGeneracion();

  const diaFilaMap = new Map<number, DiaFila>(
    fila.dias.map((d) => [d.idCalendario, d]),
  );

  let diasConTurno = 0;
  let diasConIncidencia = 0;
  let diasSinAsignacion = 0;
  let feriados = 0;

  const rows = dias
    .map((dia, index) => {
      const diaFila = diaFilaMap.get(dia.idCalendario);
      const registros = diaFila?.registros ?? [];

      if (dia.esFeriado) feriados++;

      const tieneTurno = registros.some((r) => r.tipo === 'TURNO');
      const tieneIncidencia = registros.some((r) => r.tipo === 'TIPO_DIA');

      if (registros.length === 0) {
        diasSinAsignacion++;
      } else if (tieneTurno) {
        diasConTurno++;
      } else if (tieneIncidencia) {
        diasConIncidencia++;
      }

      const primerRegistro = registros[0] ?? null;
      return buildRow(index + 1, dia, primerRegistro);
    })
    .join('\n');

  const totalHoras = fila.totalHorasMes;
  const horasLabel = Number.isInteger(totalHoras)
    ? String(totalHoras)
    : totalHoras.toFixed(1);

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Rol de Turno - ${escapeHtml(nombreCompleto)} - ${escapeHtml(periodoLabel)}</title>
<style>
@page { size: letter portrait; margin: 1.5cm 1.5cm 1.2cm 1.5cm; }
*,*::before,*::after { box-sizing: border-box; }
html,body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; }
h1,p { margin: 0; padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 7px; }
.institution p { font-size: 8pt; font-weight: 700; line-height: 1.5; text-transform: uppercase; }
.gen-date { text-align: right; font-size: 7.5pt; white-space: nowrap; }
.gen-date strong { display: block; font-size: 7pt; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; margin-bottom: 2px; }
.report-title { text-align: center; margin-bottom: 8px; }
.report-title h1 { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.report-title .rule { width: 70px; height: 2px; margin: 6px auto 0; background: #000; }
.info { border: 1px solid #000; padding: 7px 11px; margin-bottom: 8px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 20px; }
.info-row { display: flex; gap: 6px; font-size: 8.5pt; }
.info-label { font-weight: 700; min-width: 64px; flex-shrink: 0; }
.section-label { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.section-label::after { content: ""; flex: 1; height: 1px; background: #000; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; }
thead th { background: #fff; color: #000; padding: 4px 4px; text-align: center; font-weight: 700; border: 1px solid #000; border-bottom-width: 2px; font-size: 7.5pt; }
tbody tr.weekend { background: #e7ebef; }
tbody tr.feriado { background: #f3ead0; }
tbody td { padding: 3px 4px; border: 1px solid #bbb; text-align: center; vertical-align: middle; }
.col-dia { text-align: left; padding-left: 8px !important; }
.col-etiqueta { text-align: left; padding-left: 6px !important; }
.col-horario { text-align: left; padding-left: 6px !important; font-size: 8pt; }
.summary { margin-top: 10px; }
.summary table { table-layout: fixed; }
.summary th, .summary td { border: 1px solid #000; padding: 5px 6px; font-size: 8pt; }
.summary th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; text-align: left; width: 26%; }
.summary td { text-align: right; font-weight: 700; }
@media print { body { margin: 0; } thead { display: table-header-group; } }
</style>
</head>
<body>

<div class="page-header">
  <div class="institution">
    <p>Sistema de Roles y Turnos Hospitalarios</p>
  </div>
  <div class="gen-date"><strong>Generado</strong>${escapeHtml(generadoEl)}</div>
</div>

<div class="report-title">
  <h1>Rol de Turnos &middot; Reporte Individual</h1>
  <div class="rule"></div>
</div>

<div class="info">
  <div class="info-grid">
    <div class="info-row"><span class="info-label">Personal:</span><span>${escapeHtml(nombreCompleto)}</span></div>
    <div class="info-row"><span class="info-label">Servicio:</span><span>${escapeHtml(nombreServicio)}</span></div>
    <div class="info-row"><span class="info-label">C.I.:</span><span>${escapeHtml(ci)}</span></div>
    <div class="info-row"><span class="info-label">Cargo:</span><span>${escapeHtml(cargo)}</span></div>
    <div class="info-row"><span class="info-label">Carga H.:</span><span>${escapeHtml(cargaHoraria)}</span></div>
    <div class="info-row"><span class="info-label">Periodo:</span><span>${escapeHtml(periodoLabel)}</span></div>
  </div>
</div>

<div class="section-label">Detalle diario</div>
<table>
  <thead>
    <tr>
      <th style="width:26px">N&deg;</th>
      <th style="width:68px">Dia</th>
      <th style="width:54px">Fecha</th>
      <th style="width:44px">Codigo</th>
      <th>Nombre / etiqueta</th>
      <th>Horario</th>
      <th style="width:40px">Horas</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>

<div class="summary">
  <div class="section-label">Resumen del periodo</div>
  <table>
    <tbody>
      <tr>
        <th>Concepto</th>
        <td>Dias del mes</td>
        <td>Con turno</td>
        <td>Incidencias</td>
        <td>Sin asignar</td>
        <td>Feriados</td>
      </tr>
      <tr>
        <th>Cantidad</th>
        <td>${dias.length}</td>
        <td>${diasConTurno}</td>
        <td>${diasConIncidencia}</td>
        <td>${diasSinAsignacion}</td>
        <td>${feriados}</td>
      </tr>
      <tr>
        <th>Total horas del periodo</th>
        <td colspan="5">${horasLabel} horas</td>
      </tr>
    </tbody>
  </table>
</div>

</body>
</html>`;
}

function buildRow(
  numero: number,
  dia: DiaCalendario,
  registro: Registro | null,
): string {
  const rowClasses = [
    dia.esFinSemana ? 'weekend' : '',
    dia.esFeriado ? 'feriado' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const codigo = registro ? escapeHtml(buildCodigo(registro)) : '—';
  const etiqueta = registro ? escapeHtml(registro.nombre?.trim() || '—') : '—';
  const horario = registro
    ? escapeHtml(buildHorario(registro))
    : 'Sin asignacion';
  const horas =
    registro && registro.horasProgramadas > 0
      ? Number.isInteger(registro.horasProgramadas)
        ? String(registro.horasProgramadas)
        : registro.horasProgramadas.toFixed(1)
      : '—';

  const trClass = rowClasses ? ` class="${rowClasses}"` : '';

  return `    <tr${trClass}>
      <td>${numero}</td>
      <td class="col-dia">${escapeHtml(dia.diaSemanaNombre)}</td>
      <td>${formatFecha(dia.fecha)}</td>
      <td>${codigo}</td>
      <td class="col-etiqueta">${etiqueta}</td>
      <td class="col-horario">${horario}</td>
      <td>${horas}</td>
    </tr>`;
}

/**
 * Un codigo real (M, T, VA, LI...) mide como maximo 4 caracteres (limite ya
 * impuesto en el formulario de horarios). Si el turno/tipo de dia nunca tuvo
 * un codigo visual configurado, el valor resuelto cae al patron interno
 * "HHMM-HHMM" — no es apto para mostrar en un reporte impreso, se prefiere
 * un guion antes que ese codigo tecnico.
 */
function buildCodigo(registro: Registro): string {
  const codigo = registro.codigo?.trim();
  return codigo && codigo.length <= 4 ? codigo : '—';
}

function buildHorario(registro: Registro): string {
  if (registro.tipo === 'TIPO_DIA') {
    return '—';
  }

  if (registro.tramos && registro.tramos.length > 0) {
    return registro.tramos
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((t) => `${t.horaInicio.slice(0, 5)} - ${t.horaFin.slice(0, 5)}`)
      .join(' / ');
  }

  if (registro.horaInicio && registro.horaFin) {
    return `${registro.horaInicio.slice(0, 5)} - ${registro.horaFin.slice(0, 5)}`;
  }

  return '—';
}

function formatFecha(isoDate: string): string {
  const dateStr = isoDate.slice(0, 10);
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function buildFechaGeneracion(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
