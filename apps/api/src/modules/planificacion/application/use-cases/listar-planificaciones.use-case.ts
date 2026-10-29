import { Injectable, Logger } from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import {
  ListarPlanificacionesFiltro,
  PlanificacionRepository,
} from '../../domain/repositories/planificacion.repository';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';

@Injectable()
export class ListarPlanificacionesUseCase {
  private readonly logger = new Logger(ListarPlanificacionesUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
  ) {}

  async execute(
    filtro: ListarPlanificacionesFiltro,
  ): Promise<CollectionResponse<PlanificacionResponseDto>> {
    const { page, pageSize } = filtro;
    const fragments: string[] = [];

    if (filtro.idServicio) {
      fragments.push(`id_servicio=${filtro.idServicio}`);
    }

    if (filtro.idDepartamento) {
      fragments.push(`id_departamento=${filtro.idDepartamento}`);
    }

    if (filtro.idPersonal) {
      fragments.push(`id_personal=${filtro.idPersonal}`);
    }

    if (filtro.anio) {
      fragments.push(`anio=${filtro.anio}`);
    }

    if (filtro.mes) {
      fragments.push(`mes=${filtro.mes}`);
    }

    if (filtro.estado) {
      fragments.push(`estado=${filtro.estado}`);
    }

    this.logger.log(
      `Listando planificaciones${fragments.length > 0 ? ` con filtros ${fragments.join(', ')}` : ''}.`,
    );

    const planificaciones = await this.planificacionRepository.listar(filtro);
    const total = await this.resolveTotal(filtro);

    this.logger.log(`Planificaciones encontradas: ${planificaciones.length}.`);

    return {
      data: planificaciones.map(mapPlanificacionToResponse),
      meta: {
        total,
        ...(page !== undefined && pageSize !== undefined
          ? {
              page,
              pageSize,
              totalPages: Math.max(1, Math.ceil(total / pageSize)),
              hasMore: page * pageSize < total,
            }
          : {}),
      },
    };
  }

  private async resolveTotal(
    filtro: ListarPlanificacionesFiltro,
  ): Promise<number> {
    const repository = this
      .planificacionRepository as PlanificacionRepository & {
      contar?: (filtro: ListarPlanificacionesFiltro) => Promise<number>;
    };

    if (typeof repository.contar === 'function') {
      return repository.contar(filtro);
    }

    const fallback = await this.planificacionRepository.listar({
      ...filtro,
      page: undefined,
      pageSize: undefined,
    });
    return fallback.length;
  }
}
