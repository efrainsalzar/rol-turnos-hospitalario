import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';

@Injectable()
export class ActivarUsuarioUseCase {
  private readonly logger = new Logger(ActivarUsuarioUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idUsuario: number,
  ): Promise<void> {
    assertPuedeGestionarUsuarios(actor);

    this.logger.log(
      `Activando usuario id=${idUsuario} por actor=${actor.username}.`,
    );

    await this.usuarioRepository.activar(idUsuario);
  }
}

function assertPuedeGestionarUsuarios(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarUsuarios) {
    throw new ForbiddenException('No tienes permisos para gestionar usuarios.');
  }
}
