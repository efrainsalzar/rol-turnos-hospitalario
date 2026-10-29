import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ObtenerPlanificacionUseCase {
  private readonly logger = new Logger(ObtenerPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
  ) {}

  async execute(id: number): Promise<PlanificacionResponseDto> {
    this.logger.log(`Obteniendo planificacion id=${id}.`);

    const planificacion = await this.planificacionRepository.obtenerPorId(id);

    if (!planificacion) {
      throw noEncontrado('planificacion', id, ObtenerPlanificacionUseCase.name);
    }

    this.logger.log(`Planificacion id=${id} encontrada.`);

    return mapPlanificacionToResponse(planificacion);
  }
}
