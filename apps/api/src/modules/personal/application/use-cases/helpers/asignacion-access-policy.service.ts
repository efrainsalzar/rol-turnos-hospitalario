import { ForbiddenException, Injectable } from '@nestjs/common';
import { noEncontrado } from '../../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  hasSystemScope,
  isDepartamentoHead,
} from '../../../../seguridad/application/helpers/actor-access.helpers';
import { CrearAsignacionDto } from '../../dto/crear-asignacion.dto';
import { ActualizarAsignacionDto } from '../../dto/actualizar-asignacion.dto';
import { PersonalRepository } from '../../../domain/repositories/personal.repository';

@Injectable()
export class AsignacionAccessPolicyService {
  constructor(private readonly personalRepository: PersonalRepository) {}

  async assertPuedeCrear(
    actor: UsuarioSesionResponseDto,
    input: CrearAsignacionDto,
  ): Promise<void> {
    if (!actor.permisos.puedeGestionarAsignaciones) {
      throw new ForbiddenException(
        'No tienes permiso para crear asignaciones.',
      );
    }

    if (hasSystemScope(actor)) {
      return;
    }

    if (isDepartamentoHead(actor)) {
      const rolFuncionalObjetivo = await this.resolveRolFuncionalOrThrow(
        input.idRolFuncional,
      );
      const idDepartamentoObjetivo = this.resolveTargetDepartmentId(
        actor,
        input,
      );

      this.assertDepartamentoDentroDeAlcance(actor, idDepartamentoObjetivo);
      this.assertRolFuncionalNoEsJefatura(
        actor,
        rolFuncionalObjetivo.codigo,
        'crear asignaciones',
      );

      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para crear asignaciones. Esta operacion corresponde a Administracion del sistema o a la jefatura de departamento dentro de su alcance.',
    );
  }

  // Tipado como Pick (no ActualizarAsignacionDto completo) para que tambien lo pueda
  // reusar MoverAsignacionUseCase (docs/database/decisiones-tecnicas.md seccion 56):
  // "mover" usa el mismo permiso que "editar" — jefe de departamento dentro de su
  // alcance, Administracion en cualquier lado — porque conceptualmente es lo mismo
  // (la persona sigue activa, solo cambia de unidad), a diferencia de "cerrar" (baja
  // sin sucesora), que sigue reservado a Administracion.
  async assertPuedeModificar(
    actor: UsuarioSesionResponseDto,
    idAsignacion: number,
    input: Pick<
      ActualizarAsignacionDto,
      'idRolFuncional' | 'idDepartamento' | 'idServicio'
    >,
  ): Promise<void> {
    if (!actor.permisos.puedeGestionarAsignaciones) {
      throw new ForbiddenException(
        'No tienes permiso para modificar asignaciones.',
      );
    }

    if (hasSystemScope(actor)) {
      return;
    }

    if (isDepartamentoHead(actor)) {
      const actual =
        await this.personalRepository.obtenerAsignacionPorId(idAsignacion);

      if (!actual) {
        throw noEncontrado(
          'asignacion',
          idAsignacion,
          AsignacionAccessPolicyService.name,
        );
      }

      const rolFuncionalObjetivo = await this.resolveRolFuncionalOrThrow(
        input.idRolFuncional,
      );
      const idDepartamentoObjetivo = this.resolveTargetDepartmentId(
        actor,
        input,
        actual.idDepartamento,
      );

      this.assertDepartamentoDentroDeAlcance(actor, actual.idDepartamento);
      this.assertDepartamentoDentroDeAlcance(actor, idDepartamentoObjetivo);
      this.assertRolFuncionalNoEsJefatura(
        actor,
        actual.codigoRolFuncional,
        'modificar jefaturas',
      );
      this.assertRolFuncionalNoEsJefatura(
        actor,
        rolFuncionalObjetivo.codigo,
        'asignar jefaturas',
      );

      return;
    }

    throw new ForbiddenException(
      'No tienes permiso para modificar asignaciones.',
    );
  }

  assertPuedeCerrar(actor: UsuarioSesionResponseDto): void {
    // Cerrar/quitar una asignacion es una decision administrativa reservada a
    // Administracion del sistema. Jefatura de departamento puede mover y editar
    // asignaciones dentro de su alcance, pero no retirar a alguien del servicio.
    if (!actor.permisos.puedeGestionarAsignaciones || !hasSystemScope(actor)) {
      throw new ForbiddenException(
        'No tienes permiso para cerrar asignaciones. Esta operacion esta reservada a Administracion del sistema.',
      );
    }
  }

  private async resolveRolFuncionalOrThrow(idRolFuncional: number) {
    const rolFuncional =
      await this.personalRepository.obtenerRolFuncionalPorId(idRolFuncional);

    if (!rolFuncional) {
      throw noEncontrado(
        'rolFuncional',
        idRolFuncional,
        AsignacionAccessPolicyService.name,
      );
    }

    return rolFuncional;
  }

  private resolveTargetDepartmentId(
    actor: UsuarioSesionResponseDto,
    input: Pick<CrearAsignacionDto, 'idDepartamento' | 'idServicio'>,
    fallbackDepartmentId?: number | null,
  ): number | null {
    if (input.idDepartamento) {
      return input.idDepartamento;
    }

    if (input.idServicio) {
      const servicio = actor.serviciosGestionables.find(
        (item) => item.id === input.idServicio,
      );

      return servicio?.idDepartamento ?? null;
    }

    return fallbackDepartmentId ?? null;
  }

  private assertDepartamentoDentroDeAlcance(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number | null,
  ): void {
    if (idDepartamento === null) {
      throw new ForbiddenException(
        'No puedes gestionar una asignacion que no tiene departamento asociado.',
      );
    }

    const permitido = actor.departamentosGestionables.some(
      (item) => item.id === idDepartamento,
    );

    if (!permitido) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar asignaciones fuera de tu departamento.',
      );
    }
  }

  private assertRolFuncionalNoEsJefatura(
    actor: UsuarioSesionResponseDto,
    codigoRolFuncional: string | null,
    accion: string,
  ): void {
    if (codigoRolFuncional === 'JEFE_DEPARTAMENTO') {
      throw new ForbiddenException(
        `No tienes permiso para ${accion}. Las jefaturas solo las gestiona un nivel superior.`,
      );
    }

    if (codigoRolFuncional === 'JEFE_SERVICIO' && !isDepartamentoHead(actor)) {
      throw new ForbiddenException(
        `No tienes permiso para ${accion}. Las jefaturas solo las gestiona un nivel superior.`,
      );
    }
  }
}
