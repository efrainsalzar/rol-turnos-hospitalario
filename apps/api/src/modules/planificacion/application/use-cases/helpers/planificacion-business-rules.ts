import { BadRequestException, ConflictException } from '@nestjs/common';
import { Planificacion } from '../../../domain/entities/planificacion';
import {
  capitalizar,
  condicionEstadoPlanificacion,
  describirPlanificacion,
  nombreEstadoPlanificacion,
} from './planificacion-mensajes';

export function assertPlanificacionEditable(
  planificacion: Planificacion,
  accion: string,
): void {
  if (
    planificacion.estado !== 'BORRADOR' &&
    planificacion.estado !== 'REVISION'
  ) {
    throw new ConflictException(
      `No se puede ${accion} porque ${describirPlanificacion(planificacion)} esta ${condicionEstadoPlanificacion(planificacion.estado)}.`,
    );
  }
}

export function assertPlanificacionPublicable(
  planificacion: Planificacion,
): void {
  if (
    planificacion.estado !== 'BORRADOR' &&
    planificacion.estado !== 'REVISION'
  ) {
    throw new ConflictException(
      `${capitalizar(describirPlanificacion(planificacion))} no puede aprobarse porque esta ${condicionEstadoPlanificacion(planificacion.estado)}.`,
    );
  }
}

export function assertPlanificacionCerrable(
  planificacion: Planificacion,
): void {
  if (planificacion.estado !== 'APROBADA') {
    throw new ConflictException(
      `${capitalizar(describirPlanificacion(planificacion))} no puede cerrarse porque esta ${condicionEstadoPlanificacion(planificacion.estado)}.`,
    );
  }
}

export function assertPlanificacionActualizable(
  planificacion: Planificacion,
): void {
  if (planificacion.estado !== 'BORRADOR') {
    throw new ConflictException(
      `${capitalizar(describirPlanificacion(planificacion))} no puede editarse porque esta ${condicionEstadoPlanificacion(planificacion.estado)}.`,
    );
  }
}

export function assertPlanificacionCopiableComoBase(
  planificacion: Planificacion,
): void {
  if (
    planificacion.estado !== 'APROBADA' &&
    planificacion.estado !== 'CERRADA'
  ) {
    throw new ConflictException(
      `${capitalizar(describirPlanificacion(planificacion))} solo puede copiarse cuando esta aprobada o cerrada; ahora esta ${condicionEstadoPlanificacion(planificacion.estado)}.`,
    );
  }
}

export function assertPlanificacionEliminable(
  planificacion: Planificacion,
): void {
  if (planificacion.estado !== 'BORRADOR') {
    throw new ConflictException(
      `${capitalizar(describirPlanificacion(planificacion))} no puede eliminarse porque esta ${condicionEstadoPlanificacion(planificacion.estado)}.`,
    );
  }
}

export function assertTransicionEstadoValida(
  actual: Planificacion['estado'],
  siguiente: Planificacion['estado'],
): void {
  const allowedTransitions: Record<
    Planificacion['estado'],
    Planificacion['estado'][]
  > = {
    BORRADOR: ['REVISION'],
    REVISION: ['BORRADOR', 'APROBADA'],
    // Una vez aprobada, nunca vuelve a REVISION — decision del usuario,
    // docs/database/decisiones-tecnicas.md seccion 147. Solo puede avanzar a
    // CERRADA.
    APROBADA: ['CERRADA'],
    CERRADA: [],
  };

  if (!allowedTransitions[actual].includes(siguiente)) {
    throw new ConflictException(
      `La planificacion no puede pasar de ${nombreEstadoPlanificacion(actual)} a ${nombreEstadoPlanificacion(siguiente)}.`,
    );
  }
}

export function assertExactlyOneTurnoOrIncidenciaPersonal(input: {
  idTurno?: number | null;
  idIncidenciaPersonal?: number | null;
}): void {
  const hasTurno = input.idTurno !== undefined && input.idTurno !== null;
  const hasIncidenciaPersonal =
    input.idIncidenciaPersonal !== undefined &&
    input.idIncidenciaPersonal !== null;

  if (hasTurno === hasIncidenciaPersonal) {
    throw new BadRequestException(
      'Indica un horario o una incidencia de personal (solo uno de los dos).',
    );
  }
}
