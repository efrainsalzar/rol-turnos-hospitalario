import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarResumenPersonalPorPlanificacionQueryDto } from '../dto/listar-resumen-personal-por-planificacion-query.dto';
import { ResumenPlanificacionPersonalResponseDto } from '../dto/resumen-planificacion-personal-response.dto';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ListarResumenPersonalPorPlanificacionUseCase {
  private readonly logger = new Logger(
    ListarResumenPersonalPorPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    query: ListarResumenPersonalPorPlanificacionQueryDto,
  ): Promise<ResumenPlanificacionPersonalResponseDto[]> {
    this.logger.log(
      `Listando resumen de personal para planificacion id=${idPlanificacion}${query.id_asignacion_personal ? ` con id_asignacion_personal=${query.id_asignacion_personal}` : ''}.`,
    );

    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ListarResumenPersonalPorPlanificacionUseCase.name,
      );
    }

    const resumen =
      await this.rolTurnoRepository.listarResumenPersonalPorPlanificacion(
        idPlanificacion,
        {
          idAsignacionPersonal: query.id_asignacion_personal,
        },
      );

    this.logger.log(
      `Resumenes de personal encontrados para planificacion id=${idPlanificacion}: ${resumen.length}.`,
    );

    return resumen.map((item) => ({
      idAsignacionPersonal: item.idAsignacionPersonal,
      idPersonal: item.idPersonal,
      codigoPersonal: item.codigoPersonal,
      nombreCompleto: item.nombreCompleto,
      idServicio: item.idServicio,
      codigoServicio: item.codigoServicio,
      nombreServicio: item.nombreServicio,
      totalRegistros: item.totalRegistros,
      totalTurnos: item.totalTurnos,
      totalIncidenciasPersonales: item.totalIncidenciasPersonales,
      totalDiasProgramados: item.totalDiasProgramados,
      totalHorasProgramadas: item.totalHorasProgramadas,
      primeraFecha: item.primeraFecha ? item.primeraFecha.toISOString() : null,
      ultimaFecha: item.ultimaFecha ? item.ultimaFecha.toISOString() : null,
    }));
  }
}
