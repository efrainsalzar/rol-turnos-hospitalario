import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { PublicarPlanificacionDto } from '../dto/publicar-planificacion.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';
import {
  assertPlanificacionPublicable,
  assertTransicionEstadoValida,
} from './helpers/planificacion-business-rules';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import {
  capitalizar,
  describirPlanificacion,
} from './helpers/planificacion-mensajes';

@Injectable()
export class PublicarPlanificacionUseCase {
  private readonly logger = new Logger(PublicarPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    input: PublicarPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    this.logger.log(
      `Publicando planificacion id=${idPlanificacion} por usuario=${input.idUsuarioPublicador}.`,
    );

    const [planificacion, usuarioExiste, totalRegistros] = await Promise.all([
      this.planificacionRepository.obtenerPorId(idPlanificacion),
      this.planificacionRepository.existeUsuario(input.idUsuarioPublicador),
      this.rolTurnoRepository.contarPorPlanificacion(idPlanificacion),
    ]);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        PublicarPlanificacionUseCase.name,
      );
    }

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        input.idUsuarioPublicador,
        PublicarPlanificacionUseCase.name,
      );
    }

    // Igual que CambiarEstadoPlanificacionUseCase: la maquina de estados
    // (BORRADOR solo puede pasar a REVISION, nunca directo a APROBADA) rige
    // para todo actor, incluido SISTEMA — assertPuedeCambiarEstadoPlanificacion
    // en el controller solo exime a SISTEMA de la matriz de roles, no de esto.
    assertTransicionEstadoValida(planificacion.estado, 'APROBADA');
    assertPlanificacionPublicable(planificacion);

    if (totalRegistros === 0) {
      throw new ConflictException(
        `${capitalizar(describirPlanificacion(planificacion))} no puede aprobarse porque su matriz no tiene registros.`,
      );
    }

    const publicada = await this.planificacionRepository.publicar(
      idPlanificacion,
      input.idUsuarioPublicador,
    );

    this.logger.log(`Planificacion publicada id=${idPlanificacion}.`);

    return mapPlanificacionToResponse(publicada);
  }
}
