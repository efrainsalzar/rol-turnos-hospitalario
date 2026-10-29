import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { CrearTipoContratoDto } from '../dto/crear-tipo-contrato.dto';
import { TipoContratoResponseDto } from '../dto/tipo-contrato-response.dto';

@Injectable()
export class CrearTipoContratoUseCase {
  private readonly logger = new Logger(CrearTipoContratoUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    input: CrearTipoContratoDto,
    username: string,
  ): Promise<TipoContratoResponseDto> {
    // El codigo se normaliza a mayusculas y queda fijo: se copia en
    // codigo_tipo_contrato del historial de planificacion y en las
    // exportaciones, asi que cambiarlo despues desalinearia esos registros.
    const codigo = input.codigo.toUpperCase();

    if (await this.personalRepository.existeTipoContratoConCodigo(codigo)) {
      throw new ConflictException(
        `Ya existe un tipo de contrato con el codigo ${codigo}. Usa otro codigo.`,
      );
    }

    const creado = await this.personalRepository.crearTipoContrato({
      codigo,
      nombre: input.nombre,
      descripcion: input.descripcion || null,
    });

    this.logger.log(
      `Tipo de contrato creado: id=${creado.id} codigo=${creado.codigo} por ${username}.`,
    );

    return creado;
  }
}
