import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { TurnoRepository } from '../../domain/repositories/turno.repository';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class DesactivarTurnoUseCase {
  private readonly logger = new Logger(DesactivarTurnoUseCase.name);

  constructor(
    private readonly turnoRepository: TurnoRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
    confirmarLimpieza = false,
  ): Promise<void> {
    const turno = await this.turnoRepository.obtenerPorId(id);

    if (!turno) {
      await this.turnoRepository.desactivar(id);
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

    const impacto = await this.turnoRepository.obtenerImpactoUso(id);

    if (impacto.totalCeldas > 0 && !confirmarLimpieza) {
      throw new ConflictException({
        status: 'error',
        message:
          'El horario esta asignado en planificaciones que aun no se cierran. Confirma que quieres quitar esas asignaciones para desactivarlo.',
        impacto,
      });
    }

    if (impacto.totalCeldas > 0) {
      const resultado = await this.turnoRepository.limpiarCeldasAsociadas(id);
      this.logger.log(
        `Limpiadas ${resultado.celdasEliminadas} celda(s) en ${resultado.planificacionesAfectadas} planificacion(es) al desactivar turno id=${id}, por actor=${actor.username}.`,
      );
    }

    this.logger.log(`Desactivando turno id=${id} por actor=${actor.username}.`);
    await this.turnoRepository.desactivar(id);
  }
}
