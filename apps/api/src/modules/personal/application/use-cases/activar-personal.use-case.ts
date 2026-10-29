import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { PersonalRepository } from '../../domain/repositories/personal.repository';

@Injectable()
export class ActivarPersonalUseCase {
  private readonly logger = new Logger(ActivarPersonalUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idPersonal: number,
  ): Promise<void> {
    assertPuedeGestionarPersonal(actor);

    this.logger.log(
      `Activando personal id=${idPersonal} por actor=${actor.username}.`,
    );

    const detalle = await this.personalRepository.obtenerDetalle(idPersonal);

    if (!detalle) {
      throw noEncontrado('personal', idPersonal, ActivarPersonalUseCase.name);
    }

    await this.personalRepository.activarPersonal(idPersonal);
  }
}

function assertPuedeGestionarPersonal(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarPersonal) {
    throw new ForbiddenException('No tienes permiso para gestionar personal.');
  }
}
