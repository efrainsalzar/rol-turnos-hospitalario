import { Injectable, Logger } from '@nestjs/common';
import { ListarFeriadosQueryDto } from '../dto/listar-feriados-query.dto';
import { FeriadoResponseDto } from '../dto/feriado-response.dto';
import { FeriadoRepository } from '../../domain/repositories/feriado.repository';
import { mapFeriadoToResponse } from '../mappers/feriado-response.mapper';

@Injectable()
export class ListarFeriadosUseCase {
  private readonly logger = new Logger(ListarFeriadosUseCase.name);

  constructor(private readonly feriadoRepository: FeriadoRepository) {}

  async execute(query: ListarFeriadosQueryDto): Promise<FeriadoResponseDto[]> {
    this.logger.log(
      `Listando feriados${query.anio ? ` anio=${query.anio}` : ''}${query.mes ? ` mes=${query.mes}` : ''}.`,
    );

    const feriados = await this.feriadoRepository.listar({
      anio: query.anio,
      mes: query.mes,
    });

    return feriados.map(mapFeriadoToResponse);
  }
}
