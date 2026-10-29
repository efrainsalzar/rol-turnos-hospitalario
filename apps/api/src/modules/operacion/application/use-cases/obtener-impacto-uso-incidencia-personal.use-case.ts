import { Injectable } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { ImpactoUsoCatalogo } from '../../domain/entities/impacto-uso-catalogo';
import { IncidenciaPersonalRepository } from '../../domain/repositories/incidencia-personal.repository';

@Injectable()
export class ObtenerImpactoUsoIncidenciaPersonalUseCase {
  constructor(
    private readonly incidenciaPersonalRepository: IncidenciaPersonalRepository,
  ) {}

  async execute(id: number): Promise<ImpactoUsoCatalogo> {
    const incidenciaPersonal =
      await this.incidenciaPersonalRepository.obtenerPorId(id);

    if (!incidenciaPersonal) {
      throw noEncontrado(
        'incidenciaPersonal',
        id,
        ObtenerImpactoUsoIncidenciaPersonalUseCase.name,
      );
    }

    return this.incidenciaPersonalRepository.obtenerImpactoUso(id);
  }
}
