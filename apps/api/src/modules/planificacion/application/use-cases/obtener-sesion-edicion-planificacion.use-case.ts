import { Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { SesionEdicionPlanificacionResponseDto } from '../dto/sesion-edicion-planificacion-response.dto';
import { mapSesionEdicionToResponse } from '../mappers/sesion-edicion-planificacion-response.mapper';

@Injectable()
export class ObtenerSesionEdicionPlanificacionUseCase {
  constructor(
    private readonly sesionEdicionPlanificacionRepository: SesionEdicionPlanificacionRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
  ): Promise<SesionEdicionPlanificacionResponseDto> {
    const sesion =
      await this.sesionEdicionPlanificacionRepository.obtenerActiva(
        idPlanificacion,
      );

    return mapSesionEdicionToResponse(actor, sesion);
  }
}
