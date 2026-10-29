import { ConflictException, Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { IncidenciaPersonalRepository } from '../../domain/repositories/incidencia-personal.repository';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class DesactivarIncidenciaPersonalUseCase {
  private readonly logger = new Logger(
    DesactivarIncidenciaPersonalUseCase.name,
  );

  constructor(
    private readonly incidenciaPersonalRepository: IncidenciaPersonalRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
    confirmarLimpieza = false,
  ): Promise<void> {
    this.accessPolicy.assertPuedeGestionarIncidenciasPersonales(actor);

    const impacto =
      await this.incidenciaPersonalRepository.obtenerImpactoUso(id);

    if (impacto.totalCeldas > 0 && !confirmarLimpieza) {
      throw new ConflictException({
        status: 'error',
        message:
          'La incidencia de personal esta asignada en planificaciones que aun no se cierran. Confirma que quieres quitar esas asignaciones para desactivarla.',
        impacto,
      });
    }

    if (impacto.totalCeldas > 0) {
      const resultado =
        await this.incidenciaPersonalRepository.limpiarCeldasAsociadas(id);
      this.logger.log(
        `Limpiadas ${resultado.celdasEliminadas} celda(s) en ${resultado.planificacionesAfectadas} planificacion(es) al desactivar incidencia de personal id=${id}, por actor=${actor.username}.`,
      );
    }

    this.logger.log(
      `Desactivando incidencia de personal id=${id} por actor=${actor.username}.`,
    );
    await this.incidenciaPersonalRepository.desactivar(id);
  }
}
