import { Injectable, Logger } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';

@Injectable()
export class CerrarSesionActualUseCase {
  private readonly logger = new Logger(CerrarSesionActualUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(tokenSesion: string): Promise<void> {
    this.logger.log('Cerrando sesion local activa.');
    await this.usuarioRepository.revocarSesionPorToken(
      tokenSesion,
      'LOGOUT_MANUAL',
    );
  }
}
