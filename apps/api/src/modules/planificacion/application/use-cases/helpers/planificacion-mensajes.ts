import type {
  EstadoPlanificacion,
  Planificacion,
} from '../../../domain/entities/planificacion';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const NOMBRE_ESTADO: Record<EstadoPlanificacion, string> = {
  BORRADOR: 'borrador',
  REVISION: 'revision',
  APROBADA: 'aprobada',
  CERRADA: 'cerrada',
};

// "esta en borrador" / "esta aprobada": BORRADOR y REVISION son etapas, no
// adjetivos, y necesitan la preposicion.
const CONDICION_ESTADO: Record<EstadoPlanificacion, string> = {
  BORRADOR: 'en borrador',
  REVISION: 'en revision',
  APROBADA: 'aprobada',
  CERRADA: 'cerrada',
};

export function nombrePeriodo(anio: number, mes: number): string {
  return `${MESES[mes - 1] ?? mes} ${anio}`;
}

/** "la planificacion de Emergencias de octubre 2026". */
export function describirPlanificacion(
  planificacion: Pick<
    Planificacion,
    'nombreServicio' | 'nombreDepartamento' | 'anio' | 'mes'
  >,
): string {
  const unidad =
    planificacion.nombreServicio ?? planificacion.nombreDepartamento;
  const periodo = nombrePeriodo(planificacion.anio, planificacion.mes);

  return unidad
    ? `la planificacion de ${unidad} de ${periodo}`
    : `la planificacion de ${periodo}`;
}

/** "borrador", "revision": para transiciones ("de borrador a revision"). */
export function nombreEstadoPlanificacion(estado: EstadoPlanificacion): string {
  return NOMBRE_ESTADO[estado] ?? estado;
}

/** "en borrador", "aprobada": para "esta ...". */
export function condicionEstadoPlanificacion(
  estado: EstadoPlanificacion,
): string {
  return CONDICION_ESTADO[estado] ?? estado;
}

export function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
