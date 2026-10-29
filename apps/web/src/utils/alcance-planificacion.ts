import type { AlcancePlanificacionUsuario } from 'types/api';

// Espejo del orden de poder definido en el backend
// (apps/api/.../seguridad/application/helpers/alcance-planificacion.helper.ts).
// Un actor solo puede otorgar o editar roles de un alcance estrictamente inferior
// al propio (evita que un jefe nombre a otro jefe de su misma jerarquia).
// SISTEMA es la unica excepcion: si puede otorgar su propio alcance.
const ALCANCE_RANK: Record<AlcancePlanificacionUsuario, number> = {
  SISTEMA: 4,
  DEPARTAMENTO: 3,
  SERVICIO: 2,
  LECTURA: 1
};

const ALCANCE_ORDEN: AlcancePlanificacionUsuario[] = ['SISTEMA', 'DEPARTAMENTO', 'SERVICIO', 'LECTURA'];

export function puedeOtorgarAlcance(
  alcanceActor: AlcancePlanificacionUsuario | undefined,
  alcanceObjetivo: AlcancePlanificacionUsuario
): boolean {
  if (!alcanceActor) return false;
  if (alcanceActor === 'SISTEMA') return true;
  return ALCANCE_RANK[alcanceActor] > ALCANCE_RANK[alcanceObjetivo];
}

/** Alcances que el actor puede otorgar a un rolSeguridad, en el mismo orden de poder (mayor a menor). */
export function obtenerAlcancesOtorgables(alcanceActor: AlcancePlanificacionUsuario | undefined): AlcancePlanificacionUsuario[] {
  return ALCANCE_ORDEN.filter((alcance) => puedeOtorgarAlcance(alcanceActor, alcance));
}
