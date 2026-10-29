import { Planificacion } from '../../../domain/entities/planificacion';
import { PlanificacionHistorialRepository } from '../../../domain/repositories/planificacion-historial.repository';

/**
 * Una planificacion vencida es una que ya paso su periodo real y todavia
 * no quedo CERRADA. El mes ya paso en la realidad, sin importar en que
 * estado de flujo (BORRADOR/REVISION/APROBADA) haya quedado.
 *
 * Se compara contra el primer dia del mes SIGUIENTE al periodo (anio/mes),
 * no contra `fechaFin`: `fechaFin` representa la medianoche del ULTIMO dia
 * del mes (ver `monthly-period.ts`), por lo que compararla directamente
 * cerraria la planificacion un dia antes de que el mes realmente termine.
 */
export function estaVencida(planificacion: Planificacion): boolean {
  if (planificacion.estado === 'CERRADA') {
    return false;
  }

  const primerDiaMesSiguiente = Date.UTC(
    planificacion.anio,
    planificacion.mes,
    1,
    0,
    0,
    0,
    0,
  );

  return primerDiaMesSiguiente <= Date.now();
}

/**
 * Chequeo defensivo invocado al acceder a una planificacion puntual (leer
 * matriz, pintar celda, cambiar estado). Si esta vencida, la cierra y
 * materializa su historial en el momento, sin esperar al job programado.
 * Esta transicion es especial: no pasa por `assertTransicionEstadoValida`
 * porque el cierre por vencimiento real puede alcanzarse desde cualquier
 * estado, no solo desde APROBADA.
 */
export async function cerrarSiVencida(
  planificacionHistorialRepository: PlanificacionHistorialRepository,
  planificacion: Planificacion,
): Promise<Planificacion> {
  if (!estaVencida(planificacion)) {
    return planificacion;
  }

  try {
    return await planificacionHistorialRepository.cerrarYMaterializar({
      idPlanificacion: planificacion.id,
      origenCierre: 'AUTOMATICO',
      idUsuarioCierre: null,
    });
  } catch (error) {
    // Una solicitud concurrente ya pudo haber materializado el historial
    // primero; se refleja el cierre en vez de fallar esta operacion.
    const yaExiste = await planificacionHistorialRepository.existeHistorial(
      planificacion.id,
    );

    if (yaExiste) {
      return { ...planificacion, estado: 'CERRADA' };
    }

    throw error;
  }
}
