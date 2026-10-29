import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';

@Injectable()
export class CambiarEstadoTipoContratoUseCase {
  private readonly logger = new Logger(CambiarEstadoTipoContratoUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  // Baja logica: las asignaciones que ya usan el tipo lo conservan; solo deja
  // de ofrecerse para registros nuevos.
  async execute(
    idTipoContrato: number,
    activo: boolean,
    username: string,
  ): Promise<void> {
    const actual =
      await this.personalRepository.obtenerTipoContratoPorId(idTipoContrato);

    if (!actual) {
      this.logger.warn(
        `Cambio de estado de tipo de contrato inexistente: id=${idTipoContrato} por ${username}.`,
      );
      throw new NotFoundException(
        'El tipo de contrato seleccionado ya no existe. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    await this.personalRepository.cambiarEstadoTipoContrato(
      idTipoContrato,
      activo,
    );

    this.logger.log(
      `Tipo de contrato ${activo ? 'activado' : 'desactivado'}: id=${idTipoContrato} ` +
        `codigo=${actual.codigo} por ${username}.`,
    );
  }
}
