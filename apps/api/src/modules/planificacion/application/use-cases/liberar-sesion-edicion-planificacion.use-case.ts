import { Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';

@Injectable()
export class LiberarSesionEdicionPlanificacionUseCase {
  private readonly logger = new Logger(
    LiberarSesionEdicionPlanificacionUseCase.name,
  );

  constructor(
    private readonly sesionEdicionPlanificacionRepository: SesionEdicionPlanificacionRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
  ): Promise<void> {
    // liberar() ya esta acotado por id_usuario_editor = actor.id: si el
    // control es de otro usuario, esta llamada simplemente no borra nada.
    await this.sesionEdicionPlanificacionRepository.liberar(
      idPlanificacion,
      actor.id,
    );

    this.logger.log(
      `Sesion de edicion liberada: planificacion=${idPlanificacion}, actor=${actor.username}.`,
    );
  }

  /** Libera cualquier sesion de edicion abierta del actor, sin importar la planificacion (logout). */
  async executeTodas(actor: UsuarioSesionResponseDto): Promise<void> {
    await this.sesionEdicionPlanificacionRepository.liberarTodasDeUsuario(
      actor.id,
    );

    this.logger.log(
      `Todas las sesiones de edicion del actor=${actor.username} fueron liberadas (logout).`,
    );
  }
}
