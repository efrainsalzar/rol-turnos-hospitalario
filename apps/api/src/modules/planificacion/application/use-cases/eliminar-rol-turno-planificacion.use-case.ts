import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { assertPlanificacionEditable } from './helpers/planificacion-business-rules';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class EliminarRolTurnoPlanificacionUseCase {
  private readonly logger = new Logger(
    EliminarRolTurnoPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    idRolTurno: number,
    idUsuarioOperacion: number,
  ): Promise<void> {
    this.logger.log(
      `Eliminando rol_turno id=${idRolTurno} en planificacion=${idPlanificacion} por usuario=${idUsuarioOperacion}.`,
    );

    const [planificacion, usuarioExiste, registro] = await Promise.all([
      this.planificacionRepository.obtenerPorId(idPlanificacion),
      this.planificacionRepository.existeUsuario(idUsuarioOperacion),
      this.rolTurnoRepository.obtenerPorIdEnPlanificacion(
        idPlanificacion,
        idRolTurno,
      ),
    ]);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        EliminarRolTurnoPlanificacionUseCase.name,
      );
    }

    assertPlanificacionEditable(
      planificacion,
      'eliminar registros de la matriz',
    );

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        idUsuarioOperacion,
        EliminarRolTurnoPlanificacionUseCase.name,
      );
    }

    if (!registro) {
      throw noEncontrado(
        'rolTurno',
        idRolTurno,
        EliminarRolTurnoPlanificacionUseCase.name,
      );
    }

    await this.rolTurnoRepository.eliminar(idPlanificacion, idRolTurno);

    this.logger.log(
      `Rol_turno eliminado id=${idRolTurno} en planificacion=${idPlanificacion}.`,
    );
  }
}
