type PlanificacionUnidadSource = {
  idServicio: number | null;
  idDepartamento: number | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
};

export type TipoPlanificacionUnidad = 'SERVICIO' | 'DEPARTAMENTO';

export interface PlanificacionUnidadExportada {
  tipo: TipoPlanificacionUnidad;
  codigo: string | null;
  nombre: string | null;
  etiqueta: string;
}

export function resolverPlanificacionUnidad(
  planificacion: PlanificacionUnidadSource,
): PlanificacionUnidadExportada {
  if (planificacion.idServicio !== null) {
    return {
      tipo: 'SERVICIO',
      codigo: planificacion.codigoServicio,
      nombre: planificacion.nombreServicio,
      etiqueta:
        planificacion.nombreServicio ||
        planificacion.codigoServicio ||
        'Servicio',
    };
  }

  return {
    tipo: 'DEPARTAMENTO',
    codigo: planificacion.codigoDepartamento,
    nombre: planificacion.nombreDepartamento,
    etiqueta:
      planificacion.nombreDepartamento ||
      planificacion.codigoDepartamento ||
      'Departamento',
  };
}

export function buildPlanificacionTituloExportacion(
  planificacion: PlanificacionUnidadSource,
): string {
  const unidad = resolverPlanificacionUnidad(planificacion);
  return `ROL DE TURNOS ${unidad.tipo} ${unidad.etiqueta}`;
}

export function buildPlanificacionNombreHoja(
  planificacion: PlanificacionUnidadSource,
): string {
  const unidad = resolverPlanificacionUnidad(planificacion);
  return sanitizeWorksheetName(
    unidad.codigo || unidad.nombre || unidad.etiqueta || unidad.tipo,
  );
}

export function buildPlanificacionEtiquetaCorta(
  planificacion: PlanificacionUnidadSource,
): string {
  const unidad = resolverPlanificacionUnidad(planificacion);
  return `${unidad.tipo} ${unidad.etiqueta}`;
}

function sanitizeWorksheetName(value: string | null | undefined): string {
  const normalized = (value || 'Rol turnos')
    .replace(/[\\/*?:[\]]/g, ' ')
    .trim();

  return normalized.slice(0, 31) || 'Rol turnos';
}
