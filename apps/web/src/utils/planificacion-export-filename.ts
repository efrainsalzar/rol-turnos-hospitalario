import type { EstiloExportacionRolTurnos, FormatoExportacionRolTurnos, ModoExportacionRolTurnos, Planificacion } from 'types/api';

export function buildPlanificacionExcelFilename(
  planificacion: Pick<
    Planificacion,
    | 'anio'
    | 'mes'
    | 'version'
    | 'idServicio'
    | 'idDepartamento'
    | 'codigoDepartamento'
    | 'nombreDepartamento'
    | 'codigoServicio'
    | 'nombreServicio'
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos,
  formato: FormatoExportacionRolTurnos = 'una-fila'
) {
  return buildPlanificacionExportFilename(planificacion, modo, estilo, 'xlsx', formato);
}

export function buildPlanificacionPdfFilename(
  planificacion: Pick<
    Planificacion,
    | 'anio'
    | 'mes'
    | 'version'
    | 'idServicio'
    | 'idDepartamento'
    | 'codigoDepartamento'
    | 'nombreDepartamento'
    | 'codigoServicio'
    | 'nombreServicio'
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos
) {
  return buildPlanificacionExportFilename(planificacion, modo, estilo, 'pdf');
}

export function buildPlanificacionEtiquetaCorta(
  planificacion: Pick<
    Planificacion,
    'idServicio' | 'idDepartamento' | 'codigoDepartamento' | 'nombreDepartamento' | 'codigoServicio' | 'nombreServicio'
  >
) {
  const unidad = resolvePlanificacionUnidad(planificacion);
  return `${unidad.tipo} ${unidad.etiqueta}`;
}

export function buildPlanificacionesLoteExcelFilename(
  planificaciones: Array<
    Pick<Planificacion, 'anio' | 'mes' | 'codigoDepartamento' | 'nombreDepartamento' | 'codigoServicio' | 'nombreServicio'>
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos,
  formato: FormatoExportacionRolTurnos = 'una-fila'
) {
  return buildPlanificacionesLoteExportFilename(planificaciones, modo, estilo, 'xlsx', formato);
}

export function buildPlanificacionesLotePdfFilename(
  planificaciones: Array<
    Pick<Planificacion, 'anio' | 'mes' | 'codigoDepartamento' | 'nombreDepartamento' | 'codigoServicio' | 'nombreServicio'>
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos
) {
  return buildPlanificacionesLoteExportFilename(planificaciones, modo, estilo, 'pdf');
}

function buildPlanificacionExportFilename(
  planificacion: Pick<
    Planificacion,
    | 'anio'
    | 'mes'
    | 'version'
    | 'idServicio'
    | 'idDepartamento'
    | 'codigoDepartamento'
    | 'nombreDepartamento'
    | 'codigoServicio'
    | 'nombreServicio'
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos,
  extension: 'xlsx' | 'pdf',
  formato?: FormatoExportacionRolTurnos
) {
  const timestamp = buildTimestamp();
  const unidad = resolvePlanificacionUnidad(planificacion);
  const unidadSegmento = normalizeSegment(`${unidad.tipo}_${unidad.codigo || unidad.nombre || unidad.etiqueta}`);
  const periodo = `${planificacion.anio}-${String(planificacion.mes).padStart(2, '0')}`;
  const version = `v${planificacion.version}`;
  const formatoSegment = formato && formato !== 'una-fila' ? [formato] : [];

  return ['rol-turnos', unidadSegmento, periodo, version, modo, estilo, ...formatoSegment, timestamp].join('_') + `.${extension}`;
}

function buildPlanificacionesLoteExportFilename(
  planificaciones: Array<
    Pick<Planificacion, 'anio' | 'mes' | 'codigoDepartamento' | 'nombreDepartamento' | 'codigoServicio' | 'nombreServicio'>
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos,
  extension: 'xlsx' | 'pdf',
  formato?: FormatoExportacionRolTurnos
) {
  const timestamp = buildTimestamp();
  const primera = planificaciones[0];
  const periodo = primera ? `${primera.anio}-${String(primera.mes).padStart(2, '0')}` : 'sin-periodo';
  const formatoSegment = formato && formato !== 'una-fila' ? [formato] : [];

  return (
    ['rol-turnos', 'lote', `${planificaciones.length}-planificaciones`, periodo, modo, estilo, ...formatoSegment, timestamp].join('_') +
    `.${extension}`
  );
}

function buildTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function normalizeSegment(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();

  return normalized || 'SIN_DATO';
}

function resolvePlanificacionUnidad(
  planificacion: Pick<
    Planificacion,
    'idServicio' | 'idDepartamento' | 'codigoDepartamento' | 'nombreDepartamento' | 'codigoServicio' | 'nombreServicio'
  >
) {
  if (planificacion.idServicio !== null) {
    return {
      tipo: 'SERVICIO',
      codigo: planificacion.codigoServicio,
      nombre: planificacion.nombreServicio,
      etiqueta: planificacion.nombreServicio || planificacion.codigoServicio || 'Servicio'
    };
  }

  return {
    tipo: 'DEPARTAMENTO',
    codigo: planificacion.codigoDepartamento,
    nombre: planificacion.nombreDepartamento,
    etiqueta: planificacion.nombreDepartamento || planificacion.codigoDepartamento || 'Departamento'
  };
}
