import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { compare } from 'bcryptjs';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import type { SesionAutenticadaResponseDto } from '../dto/sesion-autenticada-response.dto';
import { mapSesionActivaToResponse } from '../mappers/sesion-autenticada-response.mapper';

@Injectable()
export class IniciarSesionPasswordUseCase {
  private readonly logger = new Logger(IniciarSesionPasswordUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  // Mismo mensaje para usuario inexistente, sin credenciales locales o con
  // contrasena incorrecta: mensajes distintos permitirian averiguar desde el
  // login que nombres de usuario existen. El motivo real queda en el log.
  private credencialesInvalidas(username: string, motivo: string) {
    this.logger.warn(
      `Inicio de sesion rechazado: username=${username} (${motivo}).`,
    );
    return new UnauthorizedException('Usuario o contrasena incorrectos.');
  }

  async execute(
    username: string,
    password: string,
    metadata?: {
      ipOrigen?: string | null;
      userAgent?: string | null;
    },
  ): Promise<SesionAutenticadaResponseDto> {
    this.logger.log(`Iniciando sesion MVP para username=${username}.`);

    const autenticable =
      await this.usuarioRepository.obtenerSesionAutenticablePorUsername(
        username,
      );

    if (!autenticable) {
      throw this.credencialesInvalidas(username, 'sin usuario activo');
    }

    if (!autenticable.passwordHash) {
      throw this.credencialesInvalidas(username, 'sin credenciales locales');
    }

    const passwordValido = await compare(password, autenticable.passwordHash);

    if (!passwordValido) {
      throw this.credencialesInvalidas(username, 'contrasena incorrecta');
    }

    const sesionActiva = await this.usuarioRepository.crearSesionActiva({
      idUsuario: autenticable.session.id,
      ipOrigen: metadata?.ipOrigen ?? null,
      userAgent: metadata?.userAgent ?? null,
    });

    return mapSesionActivaToResponse(sesionActiva);
  }
}
