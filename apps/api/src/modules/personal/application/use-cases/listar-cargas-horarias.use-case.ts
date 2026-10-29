import { Injectable, Logger } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { CargaHorariaResponseDto } from '../dto/carga-horaria-response.dto';

@Injectable()
export class ListarCargasHorariasUseCase {
  private readonly logger = new Logger(ListarCargasHorariasUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(): Promise<CargaHorariaResponseDto[]> {
    this.logger.log('Listando cargas horarias.');
    return this.personalRepository.listarCargasHorarias();
  }
}
