import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CerrarPlanificacionesVencidasUseCase } from '../../application/use-cases/cerrar-planificaciones-vencidas.use-case';

const INTERVALO_MS = 60 * 60 * 1000;

/**
 * Corre el cierre automatico por vencimiento cada hora, ademas del chequeo
 * defensivo que ya corre al acceder a una planificacion puntual (ver
 * `planificacion-vencimiento.helper.ts`). Es el respaldo para
 * planificaciones vencidas que nadie vuelve a abrir.
 *
 * No se uso `@nestjs/schedule` para no agregar una dependencia nueva solo
 * para un chequeo periodico simple; `setInterval` alcanza para esta escala.
 */
@Injectable()
export class CerrarPlanificacionesVencidasScheduler
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    CerrarPlanificacionesVencidasScheduler.name,
  );
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly cerrarPlanificacionesVencidasUseCase: CerrarPlanificacionesVencidasUseCase,
  ) {}

  onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      void this.ejecutar();
    }, INTERVALO_MS);

    void this.ejecutar();
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }

  private async ejecutar(): Promise<void> {
    try {
      const resultado =
        await this.cerrarPlanificacionesVencidasUseCase.execute();

      if (resultado.cerradas.length > 0) {
        this.logger.log(
          `Cierre automatico por vencimiento: ${resultado.cerradas.length} planificacion(es) cerrada(s) (ids: ${resultado.cerradas.join(', ')}).`,
        );
      }

      if (resultado.fallidas.length > 0) {
        this.logger.error(
          `Cierre automatico por vencimiento: ${resultado.fallidas.length} planificacion(es) fallaron.`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Error ejecutando el cierre automatico de planificaciones vencidas.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
