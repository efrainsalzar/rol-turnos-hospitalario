import { ForbiddenException, Injectable } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
} from '../../../../seguridad/application/helpers/actor-access.helpers';
import { ListarPersonalQueryDto } from '../../dto/listar-personal-query.dto';
import { PersonalDetalleResponseDto } from '../../dto/personal-detalle-response.dto';

@Injectable()
export class PersonalAccessPolicyService {
  scopeQuery(
    actor: UsuarioSesionResponseDto,
    query: ListarPersonalQueryDto,
  ): ListarPersonalQueryDto {
    if (hasSystemScope(actor)) {
      return query;
    }

    if (hasDepartamentoScope(actor)) {
      const scoped = Object.assign(new ListarPersonalQueryDto(), query);
      const allowedServiceIds = actor.serviciosGestionables.map(
        (item) => item.id,
      );
      const allowedIds = actor.departamentosGestionables.map((item) => item.id);

      if (
        scoped.idDepartamentoNormalizado &&
        !allowedIds.includes(scoped.idDepartamentoNormalizado)
      ) {
        scoped.idDepartamento = allowedIds[0];
      } else if (!scoped.idDepartamentoNormalizado) {
        scoped.idDepartamento = allowedIds[0];
      }

      if (
        scoped.idServicioNormalizado &&
        !allowedServiceIds.includes(scoped.idServicioNormalizado)
      ) {
        scoped.idServicio = undefined;
        scoped.id_servicio = undefined;
      }

      return scoped;
    }

    if (hasServicioScope(actor)) {
      const scoped = Object.assign(new ListarPersonalQueryDto(), query);
      const allowedServiceIds = actor.serviciosGestionables.map(
        (item) => item.id,
      );

      if (
        scoped.idServicioNormalizado &&
        !allowedServiceIds.includes(scoped.idServicioNormalizado)
      ) {
        scoped.idServicio = allowedServiceIds[0];
      } else if (!scoped.idServicioNormalizado) {
        scoped.idServicio = allowedServiceIds[0];
      }

      return scoped;
    }

    return query;
  }

  assertPuedeVerDetalle(
    actor: UsuarioSesionResponseDto,
    detalle: PersonalDetalleResponseDto,
  ): void {
    if (hasSystemScope(actor)) {
      return;
    }

    if (hasDepartamentoScope(actor)) {
      const allowedDepartmentIds = new Set(
        actor.departamentosGestionables.map((item) => item.id),
      );
      const matchesCurrentDepartment =
        detalle.departamentoActual?.id !== null &&
        detalle.departamentoActual?.id !== undefined &&
        allowedDepartmentIds.has(detalle.departamentoActual.id);
      const matchesAnyAssignment = detalle.asignacionesVigentes.some(
        (item) =>
          item.idDepartamento !== null &&
          allowedDepartmentIds.has(item.idDepartamento),
      );

      if (matchesCurrentDepartment || matchesAnyAssignment) {
        return;
      }
    }

    if (hasServicioScope(actor)) {
      const allowedServiceIds = new Set(
        actor.serviciosGestionables.map((item) => item.id),
      );
      const matchesCurrentService =
        detalle.servicioActual?.id !== null &&
        detalle.servicioActual?.id !== undefined &&
        allowedServiceIds.has(detalle.servicioActual.id);
      const matchesAnyAssignment = detalle.asignacionesVigentes.some(
        (item) =>
          item.idServicio !== null && allowedServiceIds.has(item.idServicio),
      );

      if (matchesCurrentService || matchesAnyAssignment) {
        return;
      }
    }

    throw new ForbiddenException(
      'No tienes permiso para ver el detalle de esta persona.',
    );
  }
}
