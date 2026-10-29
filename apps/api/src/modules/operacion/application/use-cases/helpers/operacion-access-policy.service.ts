import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  canAccessDepartamento,
  canAccessServicio,
  hasSystemScope,
  isDepartamentoHead,
  isServicioHead,
} from '../../../../seguridad/application/helpers/actor-access.helpers';

@Injectable()
export class OperacionAccessPolicyService {
  private readonly logger = new Logger(OperacionAccessPolicyService.name);

  // El catalogo de incidencias personales es global (sin id_servicio/id_departamento),
  // por lo que gestionarlo exige alcance SISTEMA ademas de la capacidad.
  assertPuedeGestionarIncidenciasPersonales(
    actor: UsuarioSesionResponseDto,
  ): void {
    if (
      hasSystemScope(actor) &&
      actor.capacidades?.gestionarIncidenciasPersonales
    ) {
      return;
    }

    throw this.denegar(
      actor,
      'No tienes permiso para gestionar las incidencias de personal.',
      'gestionar incidencias de personal',
    );
  }

  // Chequeo de solo-lectura (mas laxo que assertPuedeGestionarTurnoServicio/
  // Departamento): permite ver un turno a cualquier actor dentro de su alcance,
  // no solo a jefaturas con capacidad de gestion. Usado por GET /turnos/:id y
  // /turnos/:id/impacto para que dejen de ser IDOR (antes no validaban alcance).
  assertPuedeVerTurno(
    actor: UsuarioSesionResponseDto,
    turno: { idServicio: number | null; idDepartamento: number | null },
  ): void {
    const enAlcance = turno.idServicio
      ? canAccessServicio(
          actor,
          turno.idServicio,
          turno.idDepartamento ?? undefined,
        )
      : turno.idDepartamento
        ? canAccessDepartamento(actor, turno.idDepartamento)
        : false;

    if (!enAlcance) {
      throw this.denegar(
        actor,
        'No tienes permiso para ver este horario.',
        `ver turno servicio=${turno.idServicio ?? 'n/a'} departamento=${turno.idDepartamento ?? 'n/a'}`,
      );
    }
  }

  assertPuedeGestionarTiposTurno(actor: UsuarioSesionResponseDto): void {
    if (hasSystemScope(actor)) {
      return;
    }

    throw this.denegar(
      actor,
      'No tienes permiso para gestionar los tipos de horario.',
      'gestionar tipos de turno',
    );
  }

  assertPuedeGestionarTurnoServicio(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    const puedeGestionarServicio = actor.serviciosGestionables.some(
      (item) => item.id === idServicio,
    );

    if (
      puedeGestionarServicio &&
      (isServicioHead(actor) || isDepartamentoHead(actor))
    ) {
      return;
    }

    throw this.denegar(
      actor,
      'No tienes permiso para gestionar los horarios de este servicio.',
      `gestionar turnos servicio=${idServicio}`,
    );
  }

  assertPuedeGestionarTurnoDepartamento(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    const puedeGestionarDepartamento = actor.departamentosGestionables?.some(
      (item) => item.id === idDepartamento,
    );

    if (puedeGestionarDepartamento && isDepartamentoHead(actor)) {
      return;
    }

    throw this.denegar(
      actor,
      'No tienes permiso para gestionar los horarios de este departamento.',
      `gestionar turnos departamento=${idDepartamento}`,
    );
  }

  assertPuedeGestionarConfiguracionOperativaServicio(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    const puedeGestionarServicio = actor.serviciosGestionables.some(
      (item) => item.id === idServicio,
    );

    if (
      puedeGestionarServicio &&
      (isServicioHead(actor) || isDepartamentoHead(actor))
    ) {
      return;
    }

    throw this.denegar(
      actor,
      'No tienes permiso para gestionar la configuracion operativa de este servicio.',
      `gestionar configuracion operativa servicio=${idServicio}`,
    );
  }

  assertPuedeGestionarConfiguracionOperativaDepartamento(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    const puedeGestionarDepartamento = actor.departamentosGestionables?.some(
      (item) => item.id === idDepartamento,
    );

    if (puedeGestionarDepartamento && isDepartamentoHead(actor)) {
      return;
    }

    throw this.denegar(
      actor,
      'No tienes permiso para gestionar la configuracion operativa de este departamento.',
      `gestionar configuracion operativa departamento=${idDepartamento}`,
    );
  }

  // No se nombra el servicio o departamento: esta fuera del alcance del actor
  // y el nombre no le ayuda a resolver nada. Los ids quedan en el log.
  private denegar(
    actor: UsuarioSesionResponseDto,
    mensaje: string,
    detalleLog: string,
  ): ForbiddenException {
    this.logger.warn(`Acceso denegado: actor=${actor.username} ${detalleLog}.`);
    return new ForbiddenException(mensaje);
  }
}
