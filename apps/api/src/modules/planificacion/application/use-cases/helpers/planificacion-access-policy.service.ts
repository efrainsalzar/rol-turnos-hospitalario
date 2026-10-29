import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { EstadoPlanificacion } from '../../../domain/entities/planificacion';
import { nombreEstadoPlanificacion } from './planificacion-mensajes';
import type { ListarPlanificacionesFiltro } from '../../../domain/repositories/planificacion.repository';
import { PlanificacionRepository } from '../../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../../domain/repositories/rol-turno.repository';
import type { RolTurnoPlanificacionCambioRepository } from '../../../domain/repositories/rol-turno.repository';
import type { ListarPlanificacionesQueryDto } from '../../dto/listar-planificaciones-query.dto';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { UsuarioCapacidadesOperativas } from '../../../../seguridad/domain/entities/usuario-capacidades';
import {
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
  isDepartamentoHead,
  isServicioHead,
} from '../../../../seguridad/application/helpers/actor-access.helpers';
import {
  estaDentroDePeriodoVisibleJefatura,
  getPeriodosVisiblesJefatura,
} from './periodo-planificable';
import { noEncontrado } from '../../../../../common/errors/mensajes-usuario';

@Injectable()
export class PlanificacionAccessPolicyService {
  private readonly logger = new Logger(PlanificacionAccessPolicyService.name);

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly rolTurnoRepository?: RolTurnoRepository,
  ) {}

  async assertPuedeEditarCeldaMatriz(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
    idAsignacionPersonal: number,
    idCalendario: number,
    accion: string,
  ): Promise<boolean> {
    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        PlanificacionAccessPolicyService.name,
      );
    }

    this.assertPuedeGestionarServicio(
      actor,
      planificacion.idServicio,
      accion,
      planificacion.idDepartamento,
    );
    this.assertPuedeVerPlanificacionPorPeriodo(
      actor,
      planificacion.anio,
      planificacion.mes,
      accion,
    );

    if (planificacion.estado !== 'APROBADA') {
      await this.assertPuedeEditarContenidoPlanificacion(
        actor,
        idPlanificacion,
        accion,
      );
      return false;
    }

    if (!hasSystemScope(actor)) {
      throw this.denegar(
        actor,
        `No tienes permiso para ${accion} en una planificacion aprobada.`,
        `${accion} planificacion=${idPlanificacion} aprobada`,
      );
    }

    const cambio = this.rolTurnoRepository
      ? await (
          this
            .rolTurnoRepository as unknown as RolTurnoPlanificacionCambioRepository
        ).obtenerCambioDestinoParaCelda(
          idPlanificacion,
          idAsignacionPersonal,
          idCalendario,
        )
      : null;

    if (!cambio) {
      throw new ForbiddenException(
        `La celda solo puede editarse si pertenece a una asignacion incorporada por traslado y su fecha efectiva ya inicio.`,
      );
    }

    return true;
  }

  /**
   * Traduce el filtro publico de GET /v1/planificaciones al alcance real del
   * actor, llevando la restriccion a SQL (antes se traia todo lo que
   * matcheaba el filtro crudo y se recortaba en memoria con
   * filtrarPlanificaciones, lo que ademas obligaba a deshabilitar la
   * paginacion real de servidor). Sigue el mismo patron ya usado por
   * PersonalAccessPolicyService.scopeQuery y TurnoController.buildScopedQuery:
   * un jefe de departamento/servicio siempre tiene un unico departamento o
   * servicio "raiz" gestionable, asi que forzar ese id reutiliza la misma
   * clausula SQL que ya combina nivel-servicio + nivel-departamento
   * (servicio.id_departamento = :idDepartamento OR planificacion.id_departamento
   * = :idDepartamento).
   */
  scopeListado(
    actor: UsuarioSesionResponseDto,
    query: ListarPlanificacionesQueryDto,
  ): ListarPlanificacionesFiltro {
    const filtro: ListarPlanificacionesFiltro = {
      idServicio: query.id_servicio,
      idDepartamento: query.id_departamento,
      idPersonal: query.id_personal,
      anio: query.anio,
      mes: query.mes,
      estado: query.estado,
      page: query.paginacionSolicitada ? query.pageNormalizada : undefined,
      pageSize: query.paginacionSolicitada
        ? query.pageSizeNormalizada
        : undefined,
    };

    if (hasSystemScope(actor)) {
      return filtro;
    }

    if (
      filtro.idServicio &&
      !actor.serviciosGestionables.some((item) => item.id === filtro.idServicio)
    ) {
      throw this.denegar(
        actor,
        'No tienes permiso para consultar planificaciones de este servicio.',
        `consultar planificaciones servicio=${filtro.idServicio}`,
      );
    }

    if (
      filtro.idDepartamento &&
      !actor.departamentosGestionables.some(
        (item) => item.id === filtro.idDepartamento,
      )
    ) {
      throw this.denegar(
        actor,
        'No tienes permiso para consultar planificaciones de este departamento.',
        `consultar planificaciones departamento=${filtro.idDepartamento}`,
      );
    }

    if (hasDepartamentoScope(actor)) {
      const allowedDepartmentIds = actor.departamentosGestionables.map(
        (item) => item.id,
      );

      // Un servicio puntual dentro del propio departamento ya quedo validado
      // arriba: se deja tal cual y no hace falta ampliar con id_departamento.
      filtro.idDepartamento = filtro.idServicio
        ? undefined
        : allowedDepartmentIds[0];
    } else if (hasServicioScope(actor)) {
      const allowedServiceIds = actor.serviciosGestionables.map(
        (item) => item.id,
      );
      filtro.idServicio = allowedServiceIds[0];
      filtro.idDepartamento = undefined;
    } else {
      // Sin departamentos ni servicios gestionables no hay unidad valida
      // sobre la cual acotar: filtro imposible en vez de una lista sin
      // acotar.
      filtro.idServicio = -1;
      filtro.idDepartamento = undefined;
    }

    if (isServicioHead(actor) || isDepartamentoHead(actor)) {
      if (filtro.anio && filtro.mes) {
        if (!estaDentroDePeriodoVisibleJefatura(filtro.anio, filtro.mes)) {
          throw new ForbiddenException(
            'Solo puedes consultar planificaciones del mes anterior, el actual o el siguiente.',
          );
        }
      } else {
        filtro.periodosPermitidos = getPeriodosVisiblesJefatura();
      }
    }

    return filtro;
  }

  assertPuedeGestionarServicio(
    actor: UsuarioSesionResponseDto,
    idServicio: number | null,
    accion: string,
    idDepartamento?: number | null,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    if (idServicio === null) {
      // Planificacion de alcance departamental — solo el jefe del
      // departamento especifico de la planificacion puede gestionarla, no
      // cualquier actor con rolSeguridad JEFE_DEPARTAMENTO de otro departamento.
      const puedeGestionarDepartamento =
        isDepartamentoHead(actor) &&
        idDepartamento !== null &&
        idDepartamento !== undefined &&
        actor.departamentosGestionables.some(
          (item) => item.id === idDepartamento,
        );

      if (puedeGestionarDepartamento) {
        return;
      }

      this.logger.warn(
        `Actor ${actor.username} (${actor.id}) intento ${accion} fuera de su alcance de departamento (departamento=${idDepartamento}).`,
      );
      throw new ForbiddenException(
        `No tienes permiso para ${accion} en esta planificacion departamental.`,
      );
    }

    const puedeGestionar = actor.serviciosGestionables.some(
      (item) => item.id === idServicio,
    );

    if (!puedeGestionar) {
      this.logger.warn(
        `Actor ${actor.username} (${actor.id}) intento ${accion} fuera de su alcance de servicio (servicio=${idServicio}).`,
      );
      throw new ForbiddenException(
        `No tienes permiso para ${accion} en este servicio.`,
      );
    }
  }

  async assertPuedeGestionarPlanificacion(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
    accion: string,
  ): Promise<void> {
    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        PlanificacionAccessPolicyService.name,
      );
    }

    this.assertPuedeGestionarServicio(
      actor,
      planificacion.idServicio,
      accion,
      planificacion.idDepartamento,
    );
    this.assertPuedeVerPlanificacionPorPeriodo(
      actor,
      planificacion.anio,
      planificacion.mes,
      accion,
    );
  }

  async assertPuedeGestionarPlanificaciones(
    actor: UsuarioSesionResponseDto,
    idsPlanificacion: number[],
    accion: string,
  ): Promise<void> {
    for (const idPlanificacion of idsPlanificacion) {
      await this.assertPuedeGestionarPlanificacion(
        actor,
        idPlanificacion,
        accion,
      );
    }
  }

  assertPuedeCrearPlanificacion(
    actor: UsuarioSesionResponseDto,
    idServicio: number | undefined,
    idDepartamento?: number,
  ): void {
    if (!actor.capacidades?.crearPlanificacion) {
      throw new ForbiddenException(
        'No tienes permiso para crear planificaciones.',
      );
    }

    if (idServicio !== undefined) {
      this.assertPuedeGestionarServicio(
        actor,
        idServicio,
        'crear borradores de planificacion',
      );
    } else if (idDepartamento !== undefined) {
      this.assertPuedeGestionarServicio(
        actor,
        null,
        'crear borradores de planificacion',
        idDepartamento,
      );
    }

    if (
      hasSystemScope(actor) ||
      isServicioHead(actor) ||
      isDepartamentoHead(actor)
    ) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para crear planificaciones.',
    );
  }

  async assertPuedeEliminarPlanificacion(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
  ): Promise<void> {
    if (!actor.capacidades?.editarPlanificacion) {
      throw new ForbiddenException(
        'No tienes permiso para eliminar planificaciones.',
      );
    }

    await this.assertPuedeGestionarPlanificacion(
      actor,
      idPlanificacion,
      'eliminar la planificacion',
    );

    if (
      hasSystemScope(actor) ||
      isServicioHead(actor) ||
      isDepartamentoHead(actor)
    ) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para eliminar planificaciones.',
    );
  }

  async assertPuedeDuplicarPlanificacion(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
  ): Promise<void> {
    if (!actor.capacidades?.crearPlanificacion) {
      throw new ForbiddenException(
        'No tienes permiso para duplicar planificaciones.',
      );
    }

    await this.assertPuedeGestionarPlanificacion(
      actor,
      idPlanificacion,
      'duplicar la planificacion',
    );

    if (
      hasSystemScope(actor) ||
      isServicioHead(actor) ||
      isDepartamentoHead(actor)
    ) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para duplicar planificaciones.',
    );
  }

  async assertPuedeEditarContenidoPlanificacion(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
    accion: string,
  ): Promise<void> {
    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        PlanificacionAccessPolicyService.name,
      );
    }

    this.assertPuedeGestionarServicio(
      actor,
      planificacion.idServicio,
      accion,
      planificacion.idDepartamento,
    );
    this.assertPuedeVerPlanificacionPorPeriodo(
      actor,
      planificacion.anio,
      planificacion.mes,
      accion,
    );

    if (hasSystemScope(actor)) {
      return;
    }

    if (planificacion.estado === 'BORRADOR') {
      if (isServicioHead(actor) || isDepartamentoHead(actor)) {
        return;
      }
    }

    if (planificacion.estado === 'REVISION' && isDepartamentoHead(actor)) {
      return;
    }

    throw this.denegar(
      actor,
      `No tienes permiso para ${accion} en el estado actual de la planificacion.`,
      `${accion} planificacion=${idPlanificacion} estado=${planificacion.estado}`,
    );
  }

  async assertPuedeCambiarEstadoPlanificacion(
    actor: UsuarioSesionResponseDto,
    idPlanificacion: number,
    siguienteEstado: EstadoPlanificacion,
  ): Promise<void> {
    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        PlanificacionAccessPolicyService.name,
      );
    }

    this.assertPuedeGestionarServicio(
      actor,
      planificacion.idServicio,
      'cambiar el estado de la planificacion',
      planificacion.idDepartamento,
    );

    const actual = planificacion.estado;
    const transitionKey = `${actual}:${siguienteEstado}`;

    // Cada transicion exige una capacidad propia de rol_seguridad (no un rol
    // hardcodeado): asi jefe de servicio/departamento y RRHH/Admin se
    // diferencian solo por que capacidades tiene cada rol, sin una matriz
    // aparte por nombre de rol. 'APROBADA:REVISION' queda deliberadamente
    // fuera del mapa — nadie, ni siquiera sistema, puede devolver una
    // planificacion aprobada a revision (docs/database/decisiones-tecnicas.md
    // seccion 147).
    const capacidadRequerida: Partial<
      Record<string, keyof UsuarioCapacidadesOperativas>
    > = {
      'BORRADOR:REVISION': 'enviarRevisionPlanificacion',
      'REVISION:BORRADOR': 'volverBorradorPlanificacion',
      'REVISION:APROBADA': 'aprobarPlanificacion',
      'APROBADA:CERRADA': 'cerrarPlanificacion',
    };

    const capacidad = capacidadRequerida[transitionKey];
    const permitido = Boolean(capacidad && actor.capacidades?.[capacidad]);

    if (!permitido) {
      this.logger.warn(
        `Actor ${actor.username} (${actor.id}) intento cambiar planificacion ${idPlanificacion} de ${actual} a ${siguienteEstado} sin la capacidad requerida.`,
      );
      throw new ForbiddenException(
        `No tienes permiso para pasar la planificacion de ${nombreEstadoPlanificacion(actual)} a ${nombreEstadoPlanificacion(siguienteEstado)}.`,
      );
    }
  }

  /**
   * Las jefaturas (JEFE_SERVICIO/JEFE_DEPARTAMENTO) pueden VER cualquier
   * planificacion propia de su alcance en cualquier estado (incluida
   * CERRADA, en modo solo lectura) siempre que caiga dentro de la ventana
   * de mes anterior/actual/siguiente. Fuera de esa ventana, la planificacion
   * queda oculta para ellas. El bloqueo de edicion sobre CERRADA no depende
   * de este metodo: lo aplican por separado assertPuedeEditarContenidoPlanificacion
   * y las reglas de negocio de cada caso de uso de escritura
   * (planificacion-business-rules.ts), que nunca permiten mutar CERRADA.
   */
  private assertPuedeVerPlanificacionPorPeriodo(
    actor: UsuarioSesionResponseDto,
    anio: number,
    mes: number,
    accion: string,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    if (this.isPlanificacionOcultaParaJefatura(actor, anio, mes)) {
      throw new ForbiddenException(
        `No puedes ${accion}: solo tienes acceso a planificaciones del mes anterior, el actual o el siguiente.`,
      );
    }
  }

  private isPlanificacionOcultaParaJefatura(
    actor: UsuarioSesionResponseDto,
    anio: number,
    mes: number,
  ): boolean {
    if (!isServicioHead(actor) && !isDepartamentoHead(actor)) {
      return false;
    }

    return !estaDentroDePeriodoVisibleJefatura(anio, mes);
  }

  // No se nombra la unidad: esta fuera del alcance del actor y el nombre no le
  // ayuda a resolver nada. Actor e ids quedan en el log.
  private denegar(
    actor: UsuarioSesionResponseDto,
    mensaje: string,
    detalleLog: string,
  ): ForbiddenException {
    this.logger.warn(`Acceso denegado: actor=${actor.username} ${detalleLog}.`);
    return new ForbiddenException(mensaje);
  }
}
