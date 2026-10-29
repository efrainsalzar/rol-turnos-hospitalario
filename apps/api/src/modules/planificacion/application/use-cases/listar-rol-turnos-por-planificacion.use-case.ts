import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarRolTurnosPorPlanificacionQueryDto } from '../dto/listar-rol-turnos-por-planificacion-query.dto';
import { RolTurnoPlanificacionResponseDto } from '../dto/rol-turno-planificacion-response.dto';
import { mapRolTurnoPlanificacionToResponse } from '../mappers/rol-turno-planificacion-response.mapper';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ListarRolTurnosPorPlanificacionUseCase {
  private readonly logger = new Logger(
    ListarRolTurnosPorPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    query: ListarRolTurnosPorPlanificacionQueryDto,
  ): Promise<RolTurnoPlanificacionResponseDto[]> {
    const fragments: string[] = [];

    if (query.id_asignacion_personal) {
      fragments.push(`id_asignacion_personal=${query.id_asignacion_personal}`);
    }

    if (query.id_calendario) {
      fragments.push(`id_calendario=${query.id_calendario}`);
    }

    this.logger.log(
      `Listando rol_turnos de planificacion id=${idPlanificacion}${fragments.length > 0 ? ` con filtros ${fragments.join(', ')}` : ''}.`,
    );

    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ListarRolTurnosPorPlanificacionUseCase.name,
      );
    }

    const registros = await this.rolTurnoRepository.listarPorPlanificacion(
      idPlanificacion,
      {
        idAsignacionPersonal: query.id_asignacion_personal,
        idCalendario: query.id_calendario,
      },
    );

    this.logger.log(
      `Registros de rol_turno encontrados para planificacion id=${idPlanificacion}: ${registros.length}.`,
    );

    return registros.map(mapRolTurnoPlanificacionToResponse);
  }
}
