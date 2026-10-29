import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CrearPersonalDto } from '../dto/crear-personal.dto';
import { PersonalResponseDto } from '../dto/personal-response.dto';
import { Personal } from '../../domain/entities/personal';
import { PersonalRepository } from '../../domain/repositories/personal.repository';

@Injectable()
export class CrearPersonalUseCase {
  private readonly logger = new Logger(CrearPersonalUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: CrearPersonalDto,
  ): Promise<PersonalResponseDto> {
    assertPuedeGestionarPersonal(actor);

    this.logger.log(
      `Creando personal con documento=${input.documentoIdentidad} por actor=${actor.username}.`,
    );

    const personal = await this.personalRepository.crearPersonal({
      codigoPersonal: input.codigoPersonal,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      documentoIdentidad: input.documentoIdentidad,
      idNivelCargo: input.idNivelCargo,
    });

    return mapPersonalToResponse(personal);
  }
}

function assertPuedeGestionarPersonal(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarPersonal) {
    throw new ForbiddenException('No tienes permiso para gestionar personal.');
  }
}

function mapPersonalToResponse(personal: Personal): PersonalResponseDto {
  return {
    id: personal.id,
    codigoPersonal: personal.codigoPersonal,
    nombres: personal.nombres,
    apellidoPaterno: personal.apellidoPaterno,
    apellidoMaterno: personal.apellidoMaterno,
    documentoIdentidad: personal.documentoIdentidad,
    idNivelCargo: personal.idNivelCargo,
    codigoNivelCargo: personal.codigoNivelCargo,
    nombreNivelCargo: personal.nombreNivelCargo,
    tieneAsignacionActiva: personal.tieneAsignacionActiva,
    activo: personal.activo,
    nombreCompleto: [
      personal.nombres,
      personal.apellidoPaterno,
      personal.apellidoMaterno,
    ]
      .filter((value) => Boolean(value))
      .join(' '),
  };
}

export { mapPersonalToResponse };
