import { Injectable, Logger } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { NivelCargoResponseDto } from '../dto/nivel-cargo-response.dto';

@Injectable()
export class ListarNivelesCargoUseCase {
  private readonly logger = new Logger(ListarNivelesCargoUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(): Promise<NivelCargoResponseDto[]> {
    this.logger.log('Listando niveles de cargo.');
    return this.personalRepository.listarNivelesCargo();
  }
}
