import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import type { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { mapUsuarioSesionToResponse } from '../mappers/usuario-sesion-response.mapper';

@Injectable()
export class ObtenerSesionActualUseCase {
  private readonly logger = new Logger(ObtenerSesionActualUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(tokenSesion: string): Promise<UsuarioSesionResponseDto> {
    this.logger.log('Resolviendo sesion activa persistida.');

    const session =
      await this.usuarioRepository.obtenerSesionPorToken(tokenSesion);

    if (!session) {
      throw new UnauthorizedException(
        'La sesion activa no es valida o ya fue cerrada.',
      );
    }

    return mapUsuarioSesionToResponse(session);
  }
}
