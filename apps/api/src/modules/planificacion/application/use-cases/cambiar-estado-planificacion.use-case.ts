import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { CambiarEstadoPlanificacionDto } from '../dto/cambiar-estado-planificacion.dto';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';
import {
  assertPlanificacionCerrable,
  assertPlanificacionPublicable,
  assertTransicionEstadoValida,
} from './helpers/planificacion-business-rules';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import {
  capitalizar,
  describirPlanificacion,
} from './helpers/planificacion-mensajes';

@Injectable()
export class CambiarEstadoPlanificacionUseCase {
  private readonly logger = new Logger(CambiarEstadoPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly planificacionHistorialRepository: PlanificacionHistorialRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    input: CambiarEstadoPlanificacionDto,
    idUsuarioOperacion: number,
  ): Promise<PlanificacionResponseDto> {
    this.logger.log(
      `Cambiando estado de planificacion id=${idPlanificacion} a ${input.estado}.`,
    );

    const [planificacion, usuarioExiste] = await Promise.all([
      this.planificacionRepository.obtenerPorId(idPlanificacion),
      this.planificacionRepository.existeUsuario(idUsuarioOperacion),
    ]);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        CambiarEstadoPlanificacionUseCase.name,
      );
    }

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        idUsuarioOperacion,
        CambiarEstadoPlanificacionUseCase.name,
      );
    }

    assertTransicionEstadoValida(planificacion.estado, input.estado);

    if (input.estado === 'APROBADA') {
      assertPlanificacionPublicable(planificacion);

      const totalRegistros =
        await this.rolTurnoRepository.contarPorPlanificacion(idPlanificacion);

      if (totalRegistros === 0) {
        throw new ConflictException(
          `${capitalizar(describirPlanificacion(planificacion))} no puede aprobarse porque su matriz no tiene registros.`,
        );
      }
    }

    if (input.estado === 'CERRADA') {
      assertPlanificacionCerrable(planificacion);

      const cerrada =
        await this.planificacionHistorialRepository.cerrarYMaterializar({
          idPlanificacion,
          origenCierre: 'MANUAL',
          idUsuarioCierre: idUsuarioOperacion,
        });

      return mapPlanificacionToResponse(cerrada);
    }

    const actualizada = await this.planificacionRepository.cambiarEstado(
      idPlanificacion,
      input.estado,
      idUsuarioOperacion,
    );

    return mapPlanificacionToResponse(actualizada);
  }
}
