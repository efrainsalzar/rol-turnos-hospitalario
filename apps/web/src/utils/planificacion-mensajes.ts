import type { EstadoPlanificacion, Planificacion } from 'types/api';
import { formatHumanPeriod } from 'utils/periodo-planificacion';

type PlanificacionEtiquetable = Pick<
  Planificacion,
  'nombreServicio' | 'codigoServicio' | 'nombreDepartamento' | 'codigoDepartamento' | 'anio' | 'mes'
>;

const ACCION_POR_ESTADO: Record<EstadoPlanificacion, string> = {
  BORRADOR: 'devuelta a borrador',
  REVISION: 'enviada a revisión',
  APROBADA: 'aprobada',
  CERRADA: 'cerrada'
};

/** "Emergencias — Octubre 2026" (estándar de notificaciones: nombre, nunca id). */
export function etiquetaPlanificacion(planificacion: PlanificacionEtiquetable): string {
  const unidad =
    planificacion.nombreServicio || planificacion.codigoServicio || planificacion.nombreDepartamento || planificacion.codigoDepartamento;
  const periodo = formatHumanPeriod(planificacion.anio, planificacion.mes);

  return unidad ? `${unidad} — ${periodo}` : periodo;
}

export function mensajeCambioEstadoPlanificacion(planificacion: PlanificacionEtiquetable, estado: EstadoPlanificacion): string {
  return `Planificación "${etiquetaPlanificacion(planificacion)}" ${ACCION_POR_ESTADO[estado]} correctamente.`;
}
