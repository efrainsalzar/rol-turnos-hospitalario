import { Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { TurnoRepository } from '../../domain/repositories/turno.repository';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ActivarTurnoUseCase {
  private readonly logger = new Logger(ActivarTurnoUseCase.name);

  constructor(
    private readonly turnoRepository: TurnoRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(actor: UsuarioSesionResponseDto, id: number): Promise<void> {
    const turno = await this.turnoRepository.obtenerPorId(id);

    if (!turno) {
      return;
    }

    if (turno.idServicio) {
      this.accessPolicy.assertPuedeGestionarTurnoServicio(
        actor,
        turno.idServicio,
      );
    } else if (turno.idDepartamento) {
      this.accessPolicy.assertPuedeGestionarTurnoDepartamento(
        actor,
        turno.idDepartamento,
      );
    }

    this.logger.log(`Activando turno id=${id} por actor=${actor.username}.`);
    await this.turnoRepository.activar(id);
  }
}
