import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AplicarCeldaMatrizPlanificacionDto } from '../dto/aplicar-celda-matriz-planificacion.dto';
import { CeldaMatrizPlanificacionResponseDto } from '../dto/celda-matriz-planificacion-response.dto';
import { Planificacion } from '../../domain/entities/planificacion';
import { mapCeldaMatrizPersistidaToResponse } from '../mappers/celda-matriz-planificacion-response.mapper';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import {
  CeldaMatrizPersistida,
  RolTurnoRepository,
  RolTurnoPlanificacionCambioRepository,
} from '../../domain/repositories/rol-turno.repository';
import { asegurarControlEdicionPlanificacion } from './helpers/asegurar-control-edicion-planificacion.helper';
import { assertPlanificacionEditable } from './helpers/planificacion-business-rules';
import { cerrarSiVencida } from './helpers/planificacion-vencimiento.helper';
import { resolverCodigoOperativoPlanificacion } from './helpers/resolver-codigo-operativo-planificacion';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class AplicarCeldaMatrizPlanificacionUseCase {
  private readonly logger = new Logger(
    AplicarCeldaMatrizPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly planificacionHistorialRepository: PlanificacionHistorialRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
    private readonly sesionEdicionPlanificacionRepository: SesionEdicionPlanificacionRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    input: AplicarCeldaMatrizPlanificacionDto,
    idUsuarioOperacion: number,
    permiteAjusteAprobada = false,
  ): Promise<CeldaMatrizPlanificacionResponseDto> {
    this.logger.log(
      `Aplicando celda rapida en planificacion=${idPlanificacion}, asignacion=${input.idAsignacionPersonal}, calendario=${input.idCalendario}, limpiar=${input.limpiar === true}.`,
    );

    const planificacion = await this.prepararPlanificacionEditable(
      idPlanificacion,
      idUsuarioOperacion,
      permiteAjusteAprobada,
    );

    const resultado = await this.aplicarCelda(
      planificacion,
      input,
      idUsuarioOperacion,
      permiteAjusteAprobada,
    );

    return mapCeldaMatrizPersistidaToResponse(resultado);
  }

  // Extraido para que AplicarCeldaMatrizLotePlanificacionUseCase pueda resolver
  // planificacion/vencimiento/editabilidad/control de edicion UNA sola vez
  // para todo un gesto de arrastre (N celdas), en vez de una vez por celda
  // (ver seccion de estrategia de escalabilidad de la matriz en
  // decisiones-tecnicas.md).
  async prepararPlanificacionEditable(
    idPlanificacion: number,
    idUsuarioOperacion: number,
    permiteAjusteAprobada = false,
  ): Promise<Planificacion> {
    let planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        AplicarCeldaMatrizPlanificacionUseCase.name,
      );
    }

    planificacion = await cerrarSiVencida(
      this.planificacionHistorialRepository,
      planificacion,
    );

    if (planificacion.estado === 'APROBADA' && !permiteAjusteAprobada) {
      assertPlanificacionEditable(planificacion, 'editar celdas de la matriz');
    } else if (planificacion.estado !== 'APROBADA') {
      assertPlanificacionEditable(planificacion, 'editar celdas de la matriz');
    }

    // El acceso por rol/estado ya lo valido el controller
    // (assertPuedeEditarContenidoPlanificacion); esto exige ademas que nadie
    // mas tenga el control exclusivo de edicion vigente sobre esta
    // planificacion (ver docs/database/decisiones-tecnicas.md, control de
    // edicion exclusiva).
    await asegurarControlEdicionPlanificacion(
      this.sesionEdicionPlanificacionRepository,
      idUsuarioOperacion,
      idPlanificacion,
    );

    return planificacion;
  }

  // Logica de una sola celda, reutilizada tal cual por el caso de uso de lote:
  // ninguna regla de negocio se duplica entre el flujo individual y el de
  // arrastre (ver ARQUITECTURA.md §5, reglas criticas centralizadas).
  async aplicarCelda(
    planificacion: Planificacion,
    input: AplicarCeldaMatrizPlanificacionDto,
    idUsuarioOperacion: number,
    permiteAjusteAprobada = false,
  ): Promise<CeldaMatrizPersistida> {
    const idPlanificacion = planificacion.id;
    let idPlanificacionCambio: number | null = null;

    if (planificacion.estado === 'APROBADA') {
      if (!permiteAjusteAprobada) {
        throw new ConflictException(
          'La planificacion aprobada solo admite ajustes de incorporaciones autorizadas.',
        );
      }
      const cambio = await (
        this
          .rolTurnoRepository as unknown as RolTurnoPlanificacionCambioRepository
      ).obtenerCambioDestinoParaCelda(
        idPlanificacion,
        input.idAsignacionPersonal,
        input.idCalendario,
      );
      if (!cambio) {
        throw new ConflictException(
          'La celda no pertenece a una incorporacion habilitada para ajuste.',
        );
      }
      idPlanificacionCambio = cambio.idCambio;
    }

    // obtenerEstadoCeldaMatriz y resolverCodigoOperativoPlanificacion son
    // independientes entre si (ninguna depende del resultado de la otra) —
    // corren en paralelo para reducir la latencia de este endpoint, que se
    // dispara una vez por cada celda pintada en la matriz (ver
    // docs/rendimiento/estrategia-escalabilidad-matriz-mensual.md, capa 1).
    // Tradeoff consciente: si input.idAsignacionPersonal/idCalendario Y el
    // codigo operativo son invalidos al mismo tiempo, cual de los dos errores
    // se propaga ya no esta garantizado (antes siempre ganaba el de
    // asignacion/calendario, por orden secuencial); en la practica el
    // frontend siempre manda ids validos recien leidos de su propio estado,
    // asi que este caso doble-invalido no ocurre en uso real.
    const debeResolverCodigoOperativo = input.limpiar !== true;

    const [estadoCelda, codigoOperativo] = await Promise.all([
      this.rolTurnoRepository.obtenerEstadoCeldaMatriz(
        idPlanificacion,
        input.idAsignacionPersonal,
        input.idCalendario,
        planificacion.idServicio,
        planificacion.fechaInicio,
        planificacion.fechaFin,
      ),
      debeResolverCodigoOperativo
        ? resolverCodigoOperativoPlanificacion(
            this.configuracionOperativaServicioRepository,
            idPlanificacion,
            input,
          )
        : Promise.resolve(null),
    ]);

    if (!estadoCelda.asignacionValida) {
      throw new NotFoundException(
        'La persona seleccionada ya no pertenece a esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    if (!estadoCelda.calendarioValido) {
      throw new NotFoundException(
        'El dia seleccionado no pertenece al periodo de esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    let idTurno: number | null = null;
    let idIncidenciaPersonal: number | null = null;
    let horasProgramadas = 0;

    if (codigoOperativo) {
      idTurno = codigoOperativo.idTurno;
      idIncidenciaPersonal = codigoOperativo.idIncidenciaPersonal;
      horasProgramadas = codigoOperativo.horasProgramadas;

      if (idTurno) {
        const turno =
          await this.rolTurnoRepository.obtenerTurnoValidacion(idTurno);

        if (!turno) {
          throw noEncontrado(
            'turno',
            idTurno,
            AplicarCeldaMatrizPlanificacionUseCase.name,
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

      if (idIncidenciaPersonal) {
        const incidenciaPersonal =
          await this.rolTurnoRepository.obtenerIncidenciaPersonalValidacion(
            idIncidenciaPersonal,
          );

        if (!incidenciaPersonal) {
          throw noEncontrado(
            'incidenciaPersonal',
            idIncidenciaPersonal,
            AplicarCeldaMatrizPlanificacionUseCase.name,
          );
        }

        if (!incidenciaPersonal.activo) {
          throw new ConflictException(
            `La incidencia de personal "${incidenciaPersonal.nombre}" esta inactiva y no puede usarse en la planificacion.`,
          );
        }

        if (incidenciaPersonal.alcance === 'GENERAL') {
          throw new ConflictException(
            `"${incidenciaPersonal.nombre}" es un dia general del calendario y no se asigna a una persona en la matriz.`,
          );
        }
      }
    }

    return this.rolTurnoRepository.aplicarCeldaMatrizRapida({
      idPlanificacion,
      idAsignacionPersonal: input.idAsignacionPersonal,
      idCalendario: input.idCalendario,
      secuenciaDia: input.secuenciaDia ?? 1,
      idTurno,
      idIncidenciaPersonal,
      horasProgramadas,
      origenRegistro: input.limpiar === true ? 'AJUSTE' : 'MANUAL',
      idUsuarioOperacion,
      limpiar: input.limpiar === true,
      idPlanificacionCambio,
    });
  }
}
