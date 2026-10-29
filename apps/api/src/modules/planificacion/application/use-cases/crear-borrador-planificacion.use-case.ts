import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CrearBorradorPlanificacionDto } from '../dto/crear-borrador-planificacion.dto';
import { PlanificacionResponseDto } from '../dto/planificacion-response.dto';
import { mapPlanificacionToResponse } from '../mappers/planificacion-response.mapper';
import { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { buildMonthlyUtcPeriod } from '../helpers/monthly-period';
import { assertCalendarioMesGenerado } from './helpers/assert-calendario-generado';
import { assertPeriodoPlanificable } from './helpers/periodo-planificable';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { nombrePeriodo } from './helpers/planificacion-mensajes';

@Injectable()
export class CrearBorradorPlanificacionUseCase {
  private readonly logger = new Logger(CrearBorradorPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly calendarioRepository: CalendarioRepository,
  ) {}

  async execute(
    input: CrearBorradorPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    const esScopeServicio = !!input.idServicio;
    const esScopeDepartamento = !!input.idDepartamento && !input.idServicio;

    if (!esScopeServicio && !esScopeDepartamento) {
      throw new BadRequestException(
        'Selecciona un servicio o un departamento para crear la planificacion.',
      );
    }

    const idServicio = esScopeServicio ? input.idServicio! : null;
    const idDepartamento = esScopeDepartamento ? input.idDepartamento! : null;

    this.logger.log(
      esScopeServicio
        ? `Creando borrador de planificacion para servicio=${idServicio}, anio=${input.anio}, mes=${input.mes}, usuario=${input.idUsuarioCreador}.`
        : `Creando borrador de planificacion departamental para departamento=${idDepartamento}, anio=${input.anio}, mes=${input.mes}, usuario=${input.idUsuarioCreador}.`,
    );

    const usuarioExiste = await this.planificacionRepository.existeUsuario(
      input.idUsuarioCreador,
    );

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        input.idUsuarioCreador,
        CrearBorradorPlanificacionUseCase.name,
      );
    }

    let nombreUnidad: string | null;

    if (esScopeServicio) {
      nombreUnidad = await this.planificacionRepository.obtenerNombreServicio(
        idServicio!,
      );

      if (nombreUnidad === null) {
        throw noEncontrado(
          'servicio',
          idServicio!,
          CrearBorradorPlanificacionUseCase.name,
        );
      }

      const tienePersonal =
        await this.planificacionRepository.existePersonalActivoEnServicio(
          idServicio!,
        );

      if (!tienePersonal) {
        throw new BadRequestException(
          `El servicio "${nombreUnidad}" no tiene personal activo asignado. Asigna personal antes de crear una planificacion.`,
        );
      }
    } else {
      nombreUnidad =
        await this.planificacionRepository.obtenerNombreDepartamento(
          idDepartamento!,
        );

      if (nombreUnidad === null) {
        throw noEncontrado(
          'departamento',
          idDepartamento!,
          CrearBorradorPlanificacionUseCase.name,
        );
      }

      const tienePersonal =
        await this.planificacionRepository.existePersonalActivoEnDepartamento(
          idDepartamento!,
        );

      if (!tienePersonal) {
        throw new BadRequestException(
          `El departamento "${nombreUnidad}" no tiene personal activo asignado directamente. Asigna personal antes de crear una planificacion departamental.`,
        );
      }
    }

    assertPeriodoPlanificable(input.anio, input.mes);

    const existePeriodoActivo =
      await this.planificacionRepository.existePlanificacionActivaPeriodo({
        idServicio,
        idDepartamento,
        anio: input.anio,
        mes: input.mes,
      });

    if (existePeriodoActivo) {
      const unidad = esScopeServicio ? 'servicio' : 'departamento';
      throw new ConflictException(
        `Ya existe una planificacion activa para el ${unidad} "${nombreUnidad}" en ${nombrePeriodo(input.anio, input.mes)}.`,
      );
    }

    const version = await this.planificacionRepository.obtenerSiguienteVersion(
      idServicio,
      idDepartamento,
      input.anio,
      input.mes,
    );

    const { fechaInicio, fechaFin } = buildMonthlyUtcPeriod(
      input.anio,
      input.mes,
    );

    await assertCalendarioMesGenerado(
      this.calendarioRepository,
      input.anio,
      input.mes,
    );

    const planificacion = await this.planificacionRepository.crearBorrador({
      idServicio,
      idDepartamento,
      anio: input.anio,
      mes: input.mes,
      version,
      fechaInicio,
      fechaFin,
      idUsuarioCreador: input.idUsuarioCreador,
    });

    this.logger.log(
      `Borrador de planificacion creado id=${planificacion.id}, version=${planificacion.version}.`,
    );

    return mapPlanificacionToResponse(planificacion);
  }
}
