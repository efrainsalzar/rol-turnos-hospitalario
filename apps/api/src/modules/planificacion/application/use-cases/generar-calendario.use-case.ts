import { Injectable, Logger } from '@nestjs/common';
import { GenerarCalendarioDto } from '../dto/generar-calendario.dto';
import { ResultadoGeneracionCalendarioResponseDto } from '../dto/resultado-generacion-calendario-response.dto';
import { CalendarioRepository } from '../../domain/repositories/calendario.repository';

@Injectable()
export class GenerarCalendarioUseCase {
  private readonly logger = new Logger(GenerarCalendarioUseCase.name);

  constructor(private readonly calendarioRepository: CalendarioRepository) {}

  async execute(
    input: GenerarCalendarioDto,
  ): Promise<ResultadoGeneracionCalendarioResponseDto> {
    this.logger.log(
      `Generando calendario para anio=${input.anio}${input.mes ? `, mes=${input.mes}` : ''}.`,
    );

    if (input.mes) {
      return this.calendarioRepository.asegurarMes(input.anio, input.mes);
    }

    return this.calendarioRepository.asegurarAnio(input.anio);
  }
}
