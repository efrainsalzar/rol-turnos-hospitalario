import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import { hasSystemScope } from '../../../../seguridad/application/helpers/actor-access.helpers';

@Injectable()
export class CalendarioAccessPolicyService {
  // El calendario y sus catalogos son globales (sin id_servicio/id_departamento), por lo
  // que gestionarlos exige alcance SISTEMA ademas de la capacidad: la capacidad sola no
  // alcanza para restringir el impacto a un solo departamento o servicio.
  assertPuedeGestionarCalendario(actor: UsuarioSesionResponseDto): void {
    if (hasSystemScope(actor) && actor.capacidades?.gestionarCalendarios) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para gestionar el calendario ni los feriados.',
    );
  }

  assertPuedeGestionarTiposFeriado(actor: UsuarioSesionResponseDto): void {
    if (hasSystemScope(actor) && actor.capacidades?.gestionarTiposFeriado) {
      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para gestionar los tipos de feriado.',
    );
  }
}
