import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';

export interface ResultadoCierrePlanificacionesVencidas {
  cerradas: number[];
  fallidas: Array<{ idPlanificacion: number; error: string }>;
}

/**
 * Cierra en lote toda planificacion cuyo periodo real ya paso y que
 * todavia no este CERRADA, sin importar en que estado de flujo se haya
 * quedado (BORRADOR/REVISION/APROBADA). Pensado para correr periodicamente
 * (ver `CerrarPlanificacionesVencidasScheduler`) como respaldo del chequeo
 * defensivo que ya corre al acceder a una planificacion puntual.
 */
@Injectable()
export class CerrarPlanificacionesVencidasUseCase {
  private readonly logger = new Logger(
    CerrarPlanificacionesVencidasUseCase.name,
  );

  constructor(
    private readonly planificacionHistorialRepository: PlanificacionHistorialRepository,
  ) {}

  async execute(): Promise<ResultadoCierrePlanificacionesVencidas> {
    const ids =
      await this.planificacionHistorialRepository.listarIdsVencidasNoCerradas();

    const resultado: ResultadoCierrePlanificacionesVencidas = {
      cerradas: [],
      fallidas: [],
    };

    for (const idPlanificacion of ids) {
      try {
        await this.planificacionHistorialRepository.cerrarYMaterializar({
          idPlanificacion,
          origenCierre: 'AUTOMATICO',
          idUsuarioCierre: null,
        });
        resultado.cerradas.push(idPlanificacion);
      } catch (error) {
        this.logger.error(
          `No se pudo cerrar automaticamente la planificacion ${idPlanificacion}.`,
          error instanceof Error ? error.stack : String(error),
        );
        resultado.fallidas.push({
          idPlanificacion,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return resultado;
  }
}
