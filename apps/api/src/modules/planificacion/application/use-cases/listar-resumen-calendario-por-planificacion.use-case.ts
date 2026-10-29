import { Injectable, Logger } from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { ListarResumenCalendarioPorPlanificacionQueryDto } from '../dto/listar-resumen-calendario-por-planificacion-query.dto';
import { ResumenPlanificacionCalendarioResponseDto } from '../dto/resumen-planificacion-calendario-response.dto';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ListarResumenCalendarioPorPlanificacionUseCase {
  private readonly logger = new Logger(
    ListarResumenCalendarioPorPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    query: ListarResumenCalendarioPorPlanificacionQueryDto,
  ): Promise<ResumenPlanificacionCalendarioResponseDto[]> {
    this.logger.log(
      `Listando resumen de calendario para planificacion id=${idPlanificacion}${query.id_calendario ? ` con id_calendario=${query.id_calendario}` : ''}.`,
    );

    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ListarResumenCalendarioPorPlanificacionUseCase.name,
      );
    }

    const resumen =
      await this.rolTurnoRepository.listarResumenCalendarioPorPlanificacion(
        idPlanificacion,
        {
          idCalendario: query.id_calendario,
        },
      );

    this.logger.log(
      `Resumenes de calendario encontrados para planificacion id=${idPlanificacion}: ${resumen.length}.`,
    );

    return resumen.map((item) => ({
      idCalendario: item.idCalendario,
      fecha: item.fecha.toISOString(),
      anio: item.anio,
      mes: item.mes,
      diaMes: item.diaMes,
      diaSemanaNombre: item.diaSemanaNombre,
      esFinSemana: item.esFinSemana,
      esFeriado: item.esFeriado,
      codigoFeriado: item.codigoFeriado,
      nombreFeriado: item.nombreFeriado,
      totalRegistros: item.totalRegistros,
      totalTurnos: item.totalTurnos,
      totalIncidenciasPersonales: item.totalIncidenciasPersonales,
      totalPersonasProgramadas: item.totalPersonasProgramadas,
      totalHorasProgramadas: item.totalHorasProgramadas,
    }));
  }
}
