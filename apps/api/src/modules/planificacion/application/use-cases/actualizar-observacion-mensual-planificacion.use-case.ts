import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ActualizarObservacionMensualPlanificacionDto } from '../dto/actualizar-observacion-mensual-planificacion.dto';
import type { ObservacionMensualPlanificacionResponseDto } from '../dto/observacion-mensual-planificacion-response.dto';
import { mapObservacionMensualPlanificacionToResponse } from '../mappers/observacion-mensual-planificacion-response.mapper';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ObservacionPlanificacionRepository } from '../../domain/repositories/observacion-planificacion.repository';
import { assertPlanificacionEditable } from './helpers/planificacion-business-rules';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ActualizarObservacionMensualPlanificacionUseCase {
  private readonly logger = new Logger(
    ActualizarObservacionMensualPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
    private readonly observacionPlanificacionRepository: ObservacionPlanificacionRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    idAsignacionPersonal: number,
    input: ActualizarObservacionMensualPlanificacionDto,
    idUsuarioOperacion: number,
  ): Promise<ObservacionMensualPlanificacionResponseDto | null> {
    this.logger.log(
      `Actualizando observacion mensual para planificacion=${idPlanificacion}, asignacion=${idAsignacionPersonal}.`,
    );

    const [planificacion, usuarioExiste] = await Promise.all([
      this.planificacionRepository.obtenerPorId(idPlanificacion),
      this.planificacionRepository.existeUsuario(idUsuarioOperacion),
    ]);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ActualizarObservacionMensualPlanificacionUseCase.name,
      );
    }

    assertPlanificacionEditable(
      planificacion,
      'actualizar observaciones mensuales',
    );

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        idUsuarioOperacion,
        ActualizarObservacionMensualPlanificacionUseCase.name,
      );
    }

    const asignacionValida =
      planificacion.idServicio !== null
        ? await this.rolTurnoRepository.existeAsignacionPersonalEnServicio(
            idAsignacionPersonal,
            planificacion.idServicio,
          )
        : await this.rolTurnoRepository.existeAsignacionPersonalEnDepartamento(
            idAsignacionPersonal,
            planificacion.idDepartamento!,
          );

    if (!asignacionValida) {
      throw new NotFoundException(
        'La persona seleccionada ya no pertenece a esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    const observacion =
      await this.observacionPlanificacionRepository.upsertObservacionMensual({
        idPlanificacion,
        idAsignacionPersonal,
        tipoObservacion: input.tipoObservacion?.trim() || 'GENERAL',
        descripcion: input.descripcion.trim(),
        idUsuarioOperacion,
      });

    return observacion
      ? mapObservacionMensualPlanificacionToResponse(observacion)
      : null;
  }
}
