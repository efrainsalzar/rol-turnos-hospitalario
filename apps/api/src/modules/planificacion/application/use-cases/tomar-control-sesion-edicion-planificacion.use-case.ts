import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { SesionEdicionPlanificacionResponseDto } from '../dto/sesion-edicion-planificacion-response.dto';
import { mapSesionEdicionToResponse } from '../mappers/sesion-edicion-planificacion-response.mapper';
import { puedeTomarControl } from './helpers/jerarquia-edicion-planificacion.helper';

@Injectable()
export class TomarControlSesionEdicionPlanificacionUseCase {
  private readonly logger = new Logger(
    TomarControlSesionEdicionPlanificacionUseCase.name,
  );

  constructor(
    private readonly sesionEdicionPlanificacionRepository: SesionEdicionPlanificacionRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
  ): Promise<SesionEdicionPlanificacionResponseDto> {
    const actual =
      await this.sesionEdicionPlanificacionRepository.obtenerActiva(
        idPlanificacion,
      );

    if (
      actual &&
      actual.idUsuarioEditor !== actor.id &&
      !puedeTomarControl(actor, actual.codigoRolEditor)
    ) {
      this.logger.warn(
        `Actor ${actor.username} (${actor.id}) intento tomar el control de la planificacion ${idPlanificacion} sin rango suficiente sobre ${actual.nombreUsuarioEditor}.`,
      );
      throw new ForbiddenException(
        `Tu rol no tiene rango suficiente para tomar el control de esta planificacion; la esta editando ${actual.nombreUsuarioEditor}.`,
      );
    }

    const sesion =
      await this.sesionEdicionPlanificacionRepository.forzarControl(
        idPlanificacion,
        actor.id,
      );

    this.logger.log(
      `Control de edicion tomado: planificacion=${idPlanificacion}, actor=${actor.username}.`,
    );

    return mapSesionEdicionToResponse(actor, sesion);
  }
}
