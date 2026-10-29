import { Injectable, Logger } from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ListarPersonalQueryDto } from '../dto/listar-personal-query.dto';
import { PersonalResponseDto } from '../dto/personal-response.dto';

@Injectable()
export class ListarPersonalUseCase {
  private readonly logger = new Logger(ListarPersonalUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    query: ListarPersonalQueryDto,
  ): Promise<CollectionResponse<PersonalResponseDto>> {
    const paginacionSolicitada = query.paginacionSolicitada;
    const page = paginacionSolicitada ? query.pageNormalizada : undefined;
    const pageSize = paginacionSolicitada
      ? query.pageSizeNormalizada
      : undefined;
    this.logger.log(
      `Listando personal${query.idServicioNormalizado ? ` para id_servicio_principal=${query.idServicioNormalizado}` : ''}${query.idDepartamentoNormalizado ? ` para id_departamento=${query.idDepartamentoNormalizado}` : ''}${query.idNivelCargoNormalizado ? ` para id_nivel_cargo=${query.idNivelCargoNormalizado}` : ''}${typeof query.activo === 'boolean' ? ` con activo=${query.activo}` : ''}.`,
    );

    const personal = await this.personalRepository.listar({
      idServicio: query.idServicioNormalizado,
      idDepartamento: query.idDepartamentoNormalizado,
      idNivelCargo: query.idNivelCargoNormalizado,
      rolFuncionalCodigo: query.rolFuncionalNormalizado,
      nombre: query.nombreNormalizado,
      activo: query.activo,
      page,
      pageSize,
    });
    const total = await this.resolveTotal({
      idServicio: query.idServicioNormalizado,
      idDepartamento: query.idDepartamentoNormalizado,
      idNivelCargo: query.idNivelCargoNormalizado,
      rolFuncionalCodigo: query.rolFuncionalNormalizado,
      nombre: query.nombreNormalizado,
      activo: query.activo,
    });

    this.logger.log(`Personal encontrado: ${personal.length}.`);

    return {
      data: personal.map((persona) => ({
        id: persona.id,
        codigoPersonal: persona.codigoPersonal,
        nombres: persona.nombres,
        apellidoPaterno: persona.apellidoPaterno,
        apellidoMaterno: persona.apellidoMaterno,
        documentoIdentidad: persona.documentoIdentidad,
        idNivelCargo: persona.idNivelCargo,
        codigoNivelCargo: persona.codigoNivelCargo,
        nombreNivelCargo: persona.nombreNivelCargo,
        tieneAsignacionActiva: persona.tieneAsignacionActiva,
        activo: persona.activo,
        nombreCompleto: [
          persona.nombres,
          persona.apellidoPaterno,
          persona.apellidoMaterno,
        ]
          .filter((value) => Boolean(value))
          .join(' '),
      })),
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
    idServicio?: number;
    idDepartamento?: number;
    idNivelCargo?: number;
    rolFuncionalCodigo?: string;
    nombre?: string;
    activo?: boolean;
  }): Promise<number> {
    const repository = this.personalRepository as PersonalRepository & {
      contar?: (filtro: typeof input) => Promise<number>;
    };

    if (typeof repository.contar === 'function') {
      return repository.contar(input);
    }

    const fallback = await this.personalRepository.listar(input);
    return fallback.length;
  }
}
