import { Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { SesionEdicionPlanificacionResponseDto } from '../dto/sesion-edicion-planificacion-response.dto';
import { mapSesionEdicionToResponse } from '../mappers/sesion-edicion-planificacion-response.mapper';
import { asegurarControlEdicionPlanificacion } from './helpers/asegurar-control-edicion-planificacion.helper';

@Injectable()
export class RegistrarLatidoSesionEdicionPlanificacionUseCase {
  private readonly logger = new Logger(
    RegistrarLatidoSesionEdicionPlanificacionUseCase.name,
  );

  constructor(
    private readonly sesionEdicionPlanificacionRepository: SesionEdicionPlanificacionRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
  ): Promise<SesionEdicionPlanificacionResponseDto> {
    await asegurarControlEdicionPlanificacion(
      this.sesionEdicionPlanificacionRepository,
      actor.id,
      idPlanificacion,
    );

    this.logger.log(
      `Latido de sesion de edicion registrado: planificacion=${idPlanificacion}, actor=${actor.username}.`,
    );

    const sesion =
      await this.sesionEdicionPlanificacionRepository.obtenerActiva(
        idPlanificacion,
      );

    return mapSesionEdicionToResponse(actor, sesion);
  }
}
