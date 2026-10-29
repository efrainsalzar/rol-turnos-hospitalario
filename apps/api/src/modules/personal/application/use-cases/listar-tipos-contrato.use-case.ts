import { Injectable, Logger } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { TipoContratoResponseDto } from '../dto/tipo-contrato-response.dto';

@Injectable()
export class ListarTiposContratoUseCase {
  private readonly logger = new Logger(ListarTiposContratoUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(): Promise<TipoContratoResponseDto[]> {
    this.logger.log('Listando tipos de contrato.');
    return this.personalRepository.listarTiposContrato();
  }
}
