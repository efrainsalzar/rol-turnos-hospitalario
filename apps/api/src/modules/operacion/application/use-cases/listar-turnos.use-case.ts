import { Injectable, Logger } from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { TurnoRepository } from '../../domain/repositories/turno.repository';
import { ListarTurnosQueryDto } from '../dto/listar-turnos-query.dto';
import { TurnoResponseDto } from '../dto/turno-response.dto';
import { mapTurnoToResponse } from '../mappers/operacion-response.mappers';

@Injectable()
export class ListarTurnosUseCase {
  private readonly logger = new Logger(ListarTurnosUseCase.name);

  constructor(private readonly turnoRepository: TurnoRepository) {}

  async execute(
    query: ListarTurnosQueryDto,
  ): Promise<CollectionResponse<TurnoResponseDto>> {
    const paginacionSolicitada = query.paginacionSolicitada;
    const page = paginacionSolicitada ? query.pageNormalizada : undefined;
    const pageSize = paginacionSolicitada
      ? query.pageSizeNormalizada
      : undefined;
    const fragments: string[] = [];

    if (query.id_departamento) {
      fragments.push(`id_departamento=${query.id_departamento}`);
    }

    if (query.id_servicio) {
      fragments.push(`id_servicio=${query.id_servicio}`);
    }

    if (typeof query.activo === 'boolean') {
      fragments.push(`activo=${query.activo}`);
    }

    this.logger.log(
      `Listando turnos${fragments.length > 0 ? ` con filtros ${fragments.join(', ')}` : ''}.`,
    );

    const filtro = {
      idDepartamento: query.id_departamento,
      idServicio: query.id_servicio,
      activo: query.activo,
      page,
      pageSize,
    };

    const turnos = await this.turnoRepository.listar(filtro);
    const total = await this.turnoRepository.contar({
      idDepartamento: query.id_departamento,
      idServicio: query.id_servicio,
      activo: query.activo,
    });

    this.logger.log(`Turnos encontrados: ${turnos.length}.`);

    return {
      data: turnos.map(mapTurnoToResponse),
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
}
