import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { CrearUsuarioDto } from '../dto/crear-usuario.dto';
import { UsuarioResponseDto } from '../dto/usuario-response.dto';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { Usuario } from '../../domain/entities/usuario';
import { assertAlcancePermitido } from '../helpers/alcance-planificacion.helper';

@Injectable()
export class CrearUsuarioUseCase {
  private readonly logger = new Logger(CrearUsuarioUseCase.name);

  constructor(
    private readonly usuarioRepository: UsuarioRepository,
    private readonly rolSeguridadRepository: RolSeguridadRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: CrearUsuarioDto,
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
          CrearUsuarioUseCase.name,
        );
      }

      assertAlcancePermitido(
        actor.alcancePlanificacion,
        rolSeguridad.alcancePlanificacion,
      );
    }

    this.logger.log(
      `Creando usuario username=${input.username} por actor=${actor.username}.`,
    );

    const usuario = await this.usuarioRepository.crear({
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

function mapUsuarioToResponse(usuario: Usuario): UsuarioResponseDto {
  return {
    id: usuario.id,
    username: usuario.username,
    tipoUsuario: usuario.tipoUsuario,
    proveedorAutenticacion: usuario.proveedorAutenticacion,
    sujetoAutenticacion: usuario.sujetoAutenticacion,
    identidadLocalHabilitada: usuario.identidadLocalHabilitada,
    activo: usuario.activo,
    rolSeguridad: {
      id: usuario.idRolSeguridad,
      codigo: usuario.rolCodigo,
      nombre: usuario.rolNombre,
    },
    personal: {
      id: usuario.idPersonal,
      codigoPersonal: usuario.codigoPersonal,
      nombreCompleto: usuario.nombreCompleto,
    },
  };
}

export { mapUsuarioToResponse };
