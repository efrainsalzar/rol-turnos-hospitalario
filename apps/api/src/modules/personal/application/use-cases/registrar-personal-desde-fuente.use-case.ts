import { Injectable, Logger } from '@nestjs/common';
import {
  FuenteExternaPersonal,
  OpcionesRegistroPersonalDesdeFuente,
  RegistroPersonalDesdeFuente,
  ResultadoRegistroPersonalDesdeFuente,
} from '../../domain/entities/identidad-fuente-externa';
import { PersonalFuenteRepository } from '../../domain/repositories/personal-fuente.repository';

// Punto de entrada del modulo integracion hacia personal. No verifica
// `puedeGestionarPersonal`: quien dispara la sincronizacion (consola o un
// endpoint con su propio permiso) ya fue autorizado por el modulo integracion.
@Injectable()
export class RegistrarPersonalDesdeFuenteUseCase {
  private readonly logger = new Logger(
    RegistrarPersonalDesdeFuenteUseCase.name,
  );

  constructor(
    private readonly personalFuenteRepository: PersonalFuenteRepository,
  ) {}

  async execute(
    fuente: FuenteExternaPersonal,
    lote: RegistroPersonalDesdeFuente[],
    opciones: OpcionesRegistroPersonalDesdeFuente,
  ): Promise<ResultadoRegistroPersonalDesdeFuente[]> {
    const resultados =
      await this.personalFuenteRepository.registrarLoteDesdeFuente(
        fuente,
        lote,
        opciones,
      );
    const creados = resultados.filter((r) => r.resultado === 'CREADO').length;

    this.logger.log(
      `Registro desde ${fuente.sourceSystem}/${fuente.sourceEntity}: ` +
        `${creados} creados de ${lote.length} en el lote.`,
    );

    return resultados;
  }
}
