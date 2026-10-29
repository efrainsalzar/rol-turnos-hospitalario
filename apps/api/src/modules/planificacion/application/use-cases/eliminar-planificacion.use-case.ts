import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { assertPlanificacionEliminable } from './helpers/planificacion-business-rules';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class EliminarPlanificacionUseCase {
  private readonly logger = new Logger(EliminarPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
  ) {}

  async execute(idPlanificacion: number): Promise<void> {
    this.logger.log(
      `Eliminando logicamente planificacion id=${idPlanificacion}.`,
    );

    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        EliminarPlanificacionUseCase.name,
      );
    }

    assertPlanificacionEliminable(planificacion);
    await this.planificacionRepository.eliminarLogico(idPlanificacion);
  }
}
