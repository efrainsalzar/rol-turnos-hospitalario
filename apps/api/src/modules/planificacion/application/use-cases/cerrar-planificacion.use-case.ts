import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { CerrarPlanificacionDto } from '../dto/cerrar-planificacion.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';
import {
  assertPlanificacionCerrable,
  assertTransicionEstadoValida,
} from './helpers/planificacion-business-rules';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class CerrarPlanificacionUseCase {
  private readonly logger = new Logger(CerrarPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly planificacionHistorialRepository: PlanificacionHistorialRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    input: CerrarPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    this.logger.log(
      `Cerrando planificacion id=${idPlanificacion} por usuario=${input.idUsuarioCierre}.`,
    );

    const [planificacion, usuarioExiste] = await Promise.all([
      this.planificacionRepository.obtenerPorId(idPlanificacion),
      this.planificacionRepository.existeUsuario(input.idUsuarioCierre),
    ]);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        CerrarPlanificacionUseCase.name,
      );
    }

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        input.idUsuarioCierre,
        CerrarPlanificacionUseCase.name,
      );
    }

    // Igual que CambiarEstadoPlanificacionUseCase: la maquina de estados rige
    // para todo actor, incluido SISTEMA. El cierre nunca espera a que se
    // resuelva un traslado de asignacion: ese registro es bitacora pura, no
    // bloquea nada (docs/database/decisiones-tecnicas.md seccion 147).
    assertTransicionEstadoValida(planificacion.estado, 'CERRADA');
    assertPlanificacionCerrable(planificacion);

    const cerrada =
      await this.planificacionHistorialRepository.cerrarYMaterializar({
        idPlanificacion,
        origenCierre: 'MANUAL',
        idUsuarioCierre: input.idUsuarioCierre,
      });

    this.logger.log(
      `Planificacion cerrada id=${idPlanificacion} con historial materializado.`,
    );

    return mapPlanificacionToResponse(cerrada);
  }
}
