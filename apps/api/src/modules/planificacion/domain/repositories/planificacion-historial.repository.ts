import type { ObservacionDiariaPlanificacion } from '../entities/observacion-diaria-planificacion';
import { Planificacion } from '../entities/planificacion';
import type { RolTurnoPlanificacion } from '../entities/rol-turno-planificacion';

export type OrigenCierrePlanificacion = 'MANUAL' | 'AUTOMATICO';

export interface CerrarYMaterializarHistorialInput {
  idPlanificacion: number;
  origenCierre: OrigenCierrePlanificacion;
  idUsuarioCierre: number | null;
}

export abstract class PlanificacionHistorialRepository {
  abstract existeHistorial(idPlanificacion: number): Promise<boolean>;

  abstract cerrarYMaterializar(
    input: CerrarYMaterializarHistorialInput,
  ): Promise<Planificacion>;

  /**
   * Ids de planificaciones cuyo periodo real ya paso (fecha_fin en el
   * pasado) pero que todavia no quedaron CERRADA. Base para el cierre
   * automatico por vencimiento.
   */
  abstract listarIdsVencidasNoCerradas(): Promise<number[]>;

  /**
   * Registros de celda (`rol_turno`) ya congelados, en la misma forma que
   * `RolTurnoRepository.listarPorPlanificacion()`, para que la matriz de una
   * planificacion CERRADA se construya con el mismo codigo sin depender de
   * `turno`/`personal`/`codigo_operativo_servicio` en vivo.
   *
   * `vista` resuelve cual de las dos versiones congeladas en el cierre se
   * lee — ORIGINAL (la aprobada, sin traslados) o EFECTIVA (con los
   * traslados ya resueltos aplicados) — igual que en vivo
   * (docs/database/decisiones-tecnicas.md seccion 146). Los historiales
   * creados antes de que existiera esta distincion no tienen `vista` propia
   * (NULL = aplica a ambas) y devuelven los mismos registros sin importar
   * cual se pida.
   */
  abstract listarRegistrosHistorial(
    idPlanificacion: number,
    vista?: 'ORIGINAL' | 'EFECTIVA',
  ): Promise<RolTurnoPlanificacion[]>;

  /**
   * Observaciones diarias ya congeladas, en la misma forma que
   * `ObservacionPlanificacionRepository.listarObservacionesDiariasPorPlanificacion()`.
   */
  abstract listarObservacionesDiariasHistorial(
    idPlanificacion: number,
  ): Promise<ObservacionDiariaPlanificacion[]>;
}
