import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { CambiarMiPasswordDto } from '../dto/cambiar-mi-password.dto';

@Injectable()
export class CambiarMiPasswordUseCase {
  private readonly logger = new Logger(CambiarMiPasswordUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: CambiarMiPasswordDto,
  ): Promise<void> {
    this.logger.log(`Cambiando password propio de username=${actor.username}.`);

    const autenticable =
      await this.usuarioRepository.obtenerSesionAutenticablePorUsername(
        actor.username,
      );

    if (!autenticable?.passwordHash) {
      throw new UnauthorizedException(
        'El usuario actual no tiene credenciales locales habilitadas.',
      );
    }

    const passwordActualValido = await compare(
      input.passwordActual,
      autenticable.passwordHash,
    );

    if (!passwordActualValido) {
      throw new UnauthorizedException('La contrasena actual es incorrecta.');
    }

    const passwordHash = await hash(input.passwordNuevo, 10);

    await this.usuarioRepository.actualizarPassword(actor.id, passwordHash);
  }
}
