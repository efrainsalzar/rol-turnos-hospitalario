import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { ActualizarUsuarioDto } from '../dto/actualizar-usuario.dto';
import { UsuarioResponseDto } from '../dto/usuario-response.dto';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { mapUsuarioToResponse } from './crear-usuario.use-case';
import { assertAlcancePermitido } from '../helpers/alcance-planificacion.helper';

@Injectable()
export class ActualizarUsuarioUseCase {
  private readonly logger = new Logger(ActualizarUsuarioUseCase.name);

  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly rolSeguridadRepository: RolSeguridadRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idUsuario: number,
    input: ActualizarUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    assertPuedeGestionarUsuarios(actor);

    if (input.idRolSeguridad) {
      const rolSeguridad = await this.rolSeguridadRepository.obtenerPorId(
        input.idRolSeguridad,
      );

      if (!rolSeguridad) {
        throw noEncontrado(
          'rolSeguridad',
          input.idRolSeguridad,
          ActualizarUsuarioUseCase.name,
        );
      }

      assertAlcancePermitido(
        actor.alcancePlanificacion,
        rolSeguridad.alcancePlanificacion,
      );
    }

    this.logger.log(
      `Actualizando usuario id=${idUsuario} por actor=${actor.username}.`,
    );

    const usuario = await this.usuarioRepository.actualizar(idUsuario, {
      idPersonal: input.idPersonal,
      idRolSeguridad: input.idRolSeguridad,
      tipoUsuario: input.tipoUsuario,
      username: input.username,
      password: input.password,
    });

    return mapUsuarioToResponse(usuario);
  }
}

function assertPuedeGestionarUsuarios(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarUsuarios) {
    throw new ForbiddenException('No tienes permisos para gestionar usuarios.');
  }
}
