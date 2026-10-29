import { Inject, Injectable, Logger } from '@nestjs/common';
import { AsignacionPlanificacionDisponibleResponseDto } from '../dto/asignacion-planificacion-disponible-response.dto';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ListarAsignacionesDisponiblesPorPlanificacionUseCase {
  private readonly logger = new Logger(
    ListarAsignacionesDisponiblesPorPlanificacionUseCase.name,
  );

  constructor(
    @Inject(PlanificacionRepository)
    private readonly planificacionRepository: PlanificacionRepository,
    @Inject(RolTurnoRepository)
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
  ): Promise<AsignacionPlanificacionDisponibleResponseDto[]> {
    this.logger.log(
      `Listando asignaciones disponibles para planificacion id=${idPlanificacion}.`,
    );

    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ListarAsignacionesDisponiblesPorPlanificacionUseCase.name,
      );
    }

    const data =
      planificacion.idServicio !== null
        ? await this.rolTurnoRepository.listarAsignacionesDisponiblesPorServicio(
            planificacion.idServicio,
          )
        : await this.rolTurnoRepository.listarAsignacionesDisponiblesPorDepartamento(
            planificacion.idDepartamento!,
          );

    return data.map((item) => ({
      idAsignacionPersonal: item.idAsignacionPersonal,
      idPersonal: item.idPersonal,
      codigoPersonal: item.codigoPersonal,
      nombreCompleto: item.nombreCompleto,
      esPrincipal: item.esPrincipal,
    }));
  }
}
