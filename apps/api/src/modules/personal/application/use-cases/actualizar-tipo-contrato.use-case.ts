import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ActualizarTipoContratoDto } from '../dto/actualizar-tipo-contrato.dto';
import { TipoContratoResponseDto } from '../dto/tipo-contrato-response.dto';

@Injectable()
export class ActualizarTipoContratoUseCase {
  private readonly logger = new Logger(ActualizarTipoContratoUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    idTipoContrato: number,
    input: ActualizarTipoContratoDto,
    username: string,
  ): Promise<TipoContratoResponseDto> {
    const actual =
      await this.personalRepository.obtenerTipoContratoPorId(idTipoContrato);

    if (!actual) {
      this.logger.warn(
        `Actualizacion de tipo de contrato inexistente: id=${idTipoContrato} por ${username}.`,
      );
      throw new NotFoundException(
        'El tipo de contrato seleccionado ya no existe. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    const actualizado = await this.personalRepository.actualizarTipoContrato(
      idTipoContrato,
      { nombre: input.nombre, descripcion: input.descripcion || null },
    );

    this.logger.log(
      `Tipo de contrato actualizado: id=${idTipoContrato} codigo=${actual.codigo} ` +
        `nombre "${actual.nombre}" -> "${actualizado.nombre}" por ${username}.`,
    );

    return actualizado;
  }
}
