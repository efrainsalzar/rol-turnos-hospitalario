import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ActualizarPersonalDto } from '../dto/actualizar-personal.dto';
import { PersonalResponseDto } from '../dto/personal-response.dto';
import { mapPersonalToResponse } from './crear-personal.use-case';

@Injectable()
export class ActualizarPersonalUseCase {
  private readonly logger = new Logger(ActualizarPersonalUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idPersonal: number,
    input: ActualizarPersonalDto,
  ): Promise<PersonalResponseDto> {
    assertPuedeGestionarPersonal(actor);

    this.logger.log(
      `Actualizando personal id=${idPersonal} por actor=${actor.username}.`,
    );

    const personal = await this.personalRepository.actualizarPersonal(
      idPersonal,
      {
        codigoPersonal: input.codigoPersonal,
        nombres: input.nombres,
        apellidoPaterno: input.apellidoPaterno,
        apellidoMaterno: input.apellidoMaterno,
        documentoIdentidad: input.documentoIdentidad,
        idNivelCargo: input.idNivelCargo,
      },
    );

    return mapPersonalToResponse(personal);
  }
}

function assertPuedeGestionarPersonal(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarPersonal) {
    throw new ForbiddenException('No tienes permiso para gestionar personal.');
  }
}
