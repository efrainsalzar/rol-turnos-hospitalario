import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';

@Injectable()
export class DesactivarUsuarioUseCase {
  private readonly logger = new Logger(DesactivarUsuarioUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idUsuario: number,
  ): Promise<void> {
    assertPuedeGestionarUsuarios(actor);

    const sesionObjetivo =
      await this.usuarioRepository.obtenerSesionPorId(idUsuario);
    const esAdministradorSistemaActivo =
      sesionObjetivo?.activo &&
      sesionObjetivo.alcancePlanificacion === 'SISTEMA' &&
      sesionObjetivo.permisos.puedeGestionarUsuarios;

    if (esAdministradorSistemaActivo) {
      const totalAdministradores =
        await this.usuarioRepository.contarAdministradoresSistemaActivos();

      if (totalAdministradores <= 1) {
        throw new ConflictException(
          'No se puede desactivar al unico administrador de sistema activo. Asigna el rol de administrador de sistema a otro usuario antes de continuar.',
        );
      }
    }

    this.logger.log(
      `Desactivando usuario id=${idUsuario} por actor=${actor.username}.`,
    );

    await this.usuarioRepository.desactivar(idUsuario);
  }
}

function assertPuedeGestionarUsuarios(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarUsuarios) {
    throw new ForbiddenException('No tienes permisos para gestionar usuarios.');
  }
}
