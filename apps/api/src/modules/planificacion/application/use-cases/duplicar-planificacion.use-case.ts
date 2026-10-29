import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { DuplicarPlanificacionDto } from '../dto/duplicar-planificacion.dto';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';
import { buildMonthlyUtcPeriod } from '../helpers/monthly-period';
import { assertCalendarioMesGenerado } from './helpers/assert-calendario-generado';
import { assertPeriodoPlanificable } from './helpers/periodo-planificable';
import {
  assertPlanificacionActualizable,
  assertPlanificacionCopiableComoBase,
} from './helpers/planificacion-business-rules';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { nombrePeriodo } from './helpers/planificacion-mensajes';

@Injectable()
export class DuplicarPlanificacionUseCase {
  private readonly logger = new Logger(DuplicarPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly calendarioRepository: CalendarioRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    input: DuplicarPlanificacionDto,
    idUsuarioOperacion: number,
  ): Promise<PlanificacionResponseDto> {
    this.logger.log(
      `Duplicando planificacion id=${idPlanificacion} hacia ${input.anio}-${input.mes}.`,
    );

    const [planificacion, usuarioExiste] = await Promise.all([
      this.planificacionRepository.obtenerPorId(idPlanificacion),
      this.planificacionRepository.existeUsuario(idUsuarioOperacion),
    ]);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        DuplicarPlanificacionUseCase.name,
      );
    }

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        idUsuarioOperacion,
        DuplicarPlanificacionUseCase.name,
      );
    }

    assertPlanificacionActualizable(planificacion);
    assertPeriodoPlanificable(input.anio, input.mes);

    const existePeriodoActivo =
      await this.planificacionRepository.existePlanificacionActivaPeriodo({
        idServicio: planificacion.idServicio,
        idDepartamento: planificacion.idDepartamento,
        anio: input.anio,
        mes: input.mes,
      });

    if (existePeriodoActivo) {
      const unidad =
        planificacion.idServicio !== null
          ? `el servicio "${planificacion.nombreServicio}"`
          : `el departamento "${planificacion.nombreDepartamento}"`;
      throw new ConflictException(
        `Ya existe una planificacion activa para ${unidad} en ${nombrePeriodo(input.anio, input.mes)}.`,
      );
    }

    const { fechaInicio, fechaFin } = buildMonthlyUtcPeriod(
      input.anio,
      input.mes,
    );

    await assertCalendarioMesGenerado(
      this.calendarioRepository,
      input.anio,
      input.mes,
    );
    const version = await this.planificacionRepository.obtenerSiguienteVersion(
      planificacion.idServicio,
      planificacion.idDepartamento,
      input.anio,
      input.mes,
    );

    const nuevaPlanificacion = await this.planificacionRepository.crearBorrador(
      {
        idServicio: planificacion.idServicio,
        idDepartamento: planificacion.idDepartamento,
        anio: input.anio,
        mes: input.mes,
        version,
        fechaInicio,
        fechaFin,
        idUsuarioCreador: idUsuarioOperacion,
      },
    );

    if (input.copiarRolTurno ?? true) {
      assertPlanificacionCopiableComoBase(planificacion);
      await this.rolTurnoRepository.copiarRegistrosDesdePlanificacionBase({
        idPlanificacionObjetivo: nuevaPlanificacion.id,
        idPlanificacionBase: planificacion.id,
        idUsuarioOperacion,
        modoCarga: 'REEMPLAZAR',
      });
    }

    return mapPlanificacionToResponse(nuevaPlanificacion);
  }
}
