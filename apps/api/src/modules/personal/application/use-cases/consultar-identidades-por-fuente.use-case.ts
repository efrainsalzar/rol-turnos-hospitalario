import { Injectable } from '@nestjs/common';
import {
  FuenteExternaPersonal,
  IdentidadesPorFuente,
} from '../../domain/entities/identidad-fuente-externa';
import { PersonalFuenteRepository } from '../../domain/repositories/personal-fuente.repository';

@Injectable()
export class ConsultarIdentidadesPorFuenteUseCase {
  constructor(
    private readonly personalFuenteRepository: PersonalFuenteRepository,
  ) {}

  execute(fuente: FuenteExternaPersonal): Promise<IdentidadesPorFuente> {
    return this.personalFuenteRepository.obtenerIdentidadesPorFuente(fuente);
  }
}
