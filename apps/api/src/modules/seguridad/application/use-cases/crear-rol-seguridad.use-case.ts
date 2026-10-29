import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { GuardarRolSeguridadDto } from '../dto/guardar-rol-seguridad.dto';
import { RolSeguridadResponseDto } from '../dto/rol-seguridad-response.dto';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { assertAlcancePermitido } from '../helpers/alcance-planificacion.helper';

@Injectable()
export class CrearRolSeguridadUseCase {
  private readonly logger = new Logger(CrearRolSeguridadUseCase.name);

  constructor(
    private readonly rolSeguridadRepository: RolSeguridadRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: GuardarRolSeguridadDto,
  ): Promise<RolSeguridadResponseDto> {
    assertPuedeGestionarUsuarios(actor);
    assertAlcancePermitido(
      actor.alcancePlanificacion,
      input.alcancePlanificacion,
    );

    this.logger.log(
      `Creando rol de seguridad codigo=${input.codigo} alcance=${input.alcancePlanificacion} por actor=${actor.username}.`,
    );

    return this.rolSeguridadRepository.crear(input);
  }
}

function assertPuedeGestionarUsuarios(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarUsuarios) {
    throw new ForbiddenException(
      'No tienes permisos para gestionar roles de seguridad.',
    );
  }
}
