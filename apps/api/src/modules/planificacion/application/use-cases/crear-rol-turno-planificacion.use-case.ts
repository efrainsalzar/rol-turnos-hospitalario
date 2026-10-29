import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { CrearRolTurnoPlanificacionDto } from '../dto/crear-rol-turno-planificacion.dto';
import { RolTurnoPlanificacionResponseDto } from '../dto/rol-turno-planificacion-response.dto';
import { mapRolTurnoPlanificacionToResponse } from '../mappers/rol-turno-planificacion-response.mapper';
import { assertPlanificacionEditable } from './helpers/planificacion-business-rules';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { resolverCodigoOperativoPlanificacion } from './helpers/resolver-codigo-operativo-planificacion';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class CrearRolTurnoPlanificacionUseCase {
  private readonly logger = new Logger(CrearRolTurnoPlanificacionUseCase.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    input: CrearRolTurnoPlanificacionDto,
  ): Promise<RolTurnoPlanificacionResponseDto> {
    this.logger.log(
      `Creando rol_turno para planificacion=${idPlanificacion}, asignacion=${input.idAsignacionPersonal}, calendario=${input.idCalendario}, secuencia=${input.secuenciaDia}.`,
    );

    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        CrearRolTurnoPlanificacionUseCase.name,
      );
    }

    assertPlanificacionEditable(planificacion, 'crear registros de la matriz');

    const codigoOperativo = await resolverCodigoOperativoPlanificacion(
      this.configuracionOperativaServicioRepository,
      idPlanificacion,
      input,
    );

    const [
      usuarioExiste,
      asignacionValida,
      calendarioValido,
      conflictoSecuencia,
      turno,
      incidenciaPersonal,
    ] = await Promise.all([
      this.planificacionRepository.existeUsuario(input.idUsuarioOperacion),
      planificacion.idServicio !== null
        ? this.rolTurnoRepository.existeAsignacionPersonalEnServicio(
            input.idAsignacionPersonal,
            planificacion.idServicio,
          )
        : this.rolTurnoRepository.existeAsignacionPersonalEnDepartamento(
            input.idAsignacionPersonal,
            planificacion.idDepartamento!,
          ),
      this.rolTurnoRepository.existeCalendarioEnRango(
        input.idCalendario,
        planificacion.fechaInicio,
        planificacion.fechaFin,
      ),
      this.rolTurnoRepository.existeConflictoSecuencia({
        idPlanificacion,
        idAsignacionPersonal: input.idAsignacionPersonal,
        idCalendario: input.idCalendario,
        secuenciaDia: input.secuenciaDia,
      }),
      codigoOperativo.idTurno
        ? this.rolTurnoRepository.obtenerTurnoValidacion(
            codigoOperativo.idTurno,
          )
        : Promise.resolve(null),
      codigoOperativo.idIncidenciaPersonal
        ? this.rolTurnoRepository.obtenerIncidenciaPersonalValidacion(
            codigoOperativo.idIncidenciaPersonal,
          )
        : Promise.resolve(null),
    ]);

    if (!usuarioExiste) {
      throw noEncontrado(
        'usuario',
        input.idUsuarioOperacion,
        CrearRolTurnoPlanificacionUseCase.name,
      );
    }

    if (!asignacionValida) {
      throw new NotFoundException(
        'La persona seleccionada ya no pertenece a esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    if (!calendarioValido) {
      throw new NotFoundException(
        'El dia seleccionado no pertenece al periodo de esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    if (conflictoSecuencia) {
      throw new ConflictException(
        'Esta persona ya tiene un registro en ese dia de la matriz. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    if (codigoOperativo.idTurno) {
      if (!turno) {
        throw noEncontrado(
          'turno',
          codigoOperativo.idTurno,
          CrearRolTurnoPlanificacionUseCase.name,
        );
      }

      if (
        planificacion.idServicio !== null &&
        turno.idServicio !== planificacion.idServicio
      ) {
        throw new ConflictException(
          `El horario "${turno.nombre}" no pertenece al servicio de la planificacion.`,
        );
      }

      if (!turno.activo) {
        throw new ConflictException(
          `El horario "${turno.nombre}" esta inactivo y no puede usarse en la planificacion.`,
        );
      }
    }

    if (codigoOperativo.idIncidenciaPersonal && !incidenciaPersonal) {
      throw noEncontrado(
        'incidenciaPersonal',
        codigoOperativo.idIncidenciaPersonal,
        CrearRolTurnoPlanificacionUseCase.name,
      );
    }

    if (incidenciaPersonal && !incidenciaPersonal.activo) {
      throw new ConflictException(
        `La incidencia de personal "${incidenciaPersonal.nombre}" esta inactiva y no puede usarse en la planificacion.`,
      );
    }

    if (incidenciaPersonal && incidenciaPersonal.alcance === 'GENERAL') {
      throw new ConflictException(
        `"${incidenciaPersonal.nombre}" es un dia general del calendario y no se asigna a una persona en la matriz.`,
      );
    }

    const registro = await this.rolTurnoRepository.crear({
      idPlanificacion,
      idAsignacionPersonal: input.idAsignacionPersonal,
      idCalendario: input.idCalendario,
      secuenciaDia: input.secuenciaDia,
      idTurno: codigoOperativo.idTurno,
      idIncidenciaPersonal: codigoOperativo.idIncidenciaPersonal,
      horasProgramadas: codigoOperativo.horasProgramadas,
      origenRegistro: input.origenRegistro ?? 'MANUAL',
      idUsuarioOperacion: input.idUsuarioOperacion,
    });

    this.logger.log(
      `Rol_turno creado id=${registro.id} en planificacion=${idPlanificacion}.`,
    );

    return mapRolTurnoPlanificacionToResponse(registro);
  }
}
