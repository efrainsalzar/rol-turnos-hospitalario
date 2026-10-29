import { ObservacionMensualPlanificacion } from '../entities/observacion-mensual-planificacion';

export interface UpsertObservacionMensualPlanificacionInput {
  idPlanificacion: number;
  idAsignacionPersonal: number;
  tipoObservacion: string;
  descripcion: string;
  idUsuarioOperacion: number;
}

export abstract class ObservacionPlanificacionRepository {
  abstract upsertObservacionMensual(
    input: UpsertObservacionMensualPlanificacionInput,
  ): Promise<ObservacionMensualPlanificacion | null>;
}
