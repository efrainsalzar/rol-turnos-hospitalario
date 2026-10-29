import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { GuardarRolSeguridadDto } from '../dto/guardar-rol-seguridad.dto';
import { RolSeguridadResponseDto } from '../dto/rol-seguridad-response.dto';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { assertAlcancePermitido } from '../helpers/alcance-planificacion.helper';

@Injectable()
export class ActualizarRolSeguridadUseCase {
  private readonly logger = new Logger(ActualizarRolSeguridadUseCase.name);

  constructor(
    private readonly rolSeguridadRepository: RolSeguridadRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idRolSeguridad: number,
    input: GuardarRolSeguridadDto,
  ): Promise<RolSeguridadResponseDto> {
    assertPuedeGestionarUsuarios(actor);

    const rolActual =
      await this.rolSeguridadRepository.obtenerPorId(idRolSeguridad);

    if (!rolActual) {
      throw noEncontrado(
        'rolSeguridad',
        idRolSeguridad,
        ActualizarRolSeguridadUseCase.name,
      );
    }

    // Se valida tanto el alcance actual del rolSeguridad como el nuevo: un actor no
    // debe poder tocar un rolSeguridad que ya esta por encima de su propio alcance,
    // ni escalarlo a uno superior.
    assertAlcancePermitido(
      actor.alcancePlanificacion,
      rolActual.alcancePlanificacion,
    );
    assertAlcancePermitido(
      actor.alcancePlanificacion,
      input.alcancePlanificacion,
    );

    this.logger.log(
      `Actualizando rol de seguridad id=${idRolSeguridad} alcance=${input.alcancePlanificacion} por actor=${actor.username}.`,
    );

    return this.rolSeguridadRepository.actualizar(idRolSeguridad, input);
  }
}

function assertPuedeGestionarUsuarios(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarUsuarios) {
    throw new ForbiddenException(
      'No tienes permisos para gestionar roles de seguridad.',
    );
  }
}
