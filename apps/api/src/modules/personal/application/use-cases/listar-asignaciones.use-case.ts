import { Injectable, Logger } from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';
import { ListarAsignacionesQueryDto } from '../dto/listar-asignaciones-query.dto';
import { mapAsignacionToResponse } from '../mappers/asignacion-response.mapper';

@Injectable()
export class ListarAsignacionesUseCase {
  private readonly logger = new Logger(ListarAsignacionesUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    query: ListarAsignacionesQueryDto,
  ): Promise<CollectionResponse<AsignacionResponseDto>> {
    const paginacionSolicitada = query.paginacionSolicitada;
    const page = paginacionSolicitada ? query.pageNormalizada : undefined;
    const pageSize = paginacionSolicitada
      ? query.pageSizeNormalizada
      : undefined;
    this.logger.log('Listando asignaciones.');

    const asignaciones = await this.personalRepository.listarAsignaciones({
      idDepartamento: query.idDepartamentoNormalizado,
      idServicio: query.idServicioNormalizado,
      idPersonal: query.idPersonalNormalizado,
      rolFuncionalCodigo: query.rolFuncionalNormalizado,
      nombre: query.nombreNormalizado,
      activo: query.activo,
      page,
      pageSize,
    });
    const total = await this.resolveTotal({
      idDepartamento: query.idDepartamentoNormalizado,
      idServicio: query.idServicioNormalizado,
      idPersonal: query.idPersonalNormalizado,
      rolFuncionalCodigo: query.rolFuncionalNormalizado,
      nombre: query.nombreNormalizado,
      activo: query.activo,
    });

    return {
      data: asignaciones.map(mapAsignacionToResponse),
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

  private async resolveTotal(input: {
    idDepartamento?: number;
    idServicio?: number;
    idPersonal?: number;
    rolFuncionalCodigo?: string;
    nombre?: string;
    activo?: boolean;
  }): Promise<number> {
    const repository = this.personalRepository as PersonalRepository & {
      contarAsignaciones?: (filtro: typeof input) => Promise<number>;
    };

    if (typeof repository.contarAsignaciones === 'function') {
      return repository.contarAsignaciones(input);
    }

    const fallback = await this.personalRepository.listarAsignaciones(input);
    return fallback.length;
  }
}
