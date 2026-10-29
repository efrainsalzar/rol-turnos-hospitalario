import { Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { hasSystemScope } from '../../../seguridad/application/helpers/actor-access.helpers';
import { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ActualizarAsignacionDto } from '../dto/actualizar-asignacion.dto';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';
import { mapAsignacionToResponse } from '../mappers/asignacion-response.mapper';
import { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';

@Injectable()
export class ActualizarAsignacionUseCase {
  private readonly logger = new Logger(ActualizarAsignacionUseCase.name);

  constructor(
    private readonly personalRepository: PersonalRepository,
    private readonly accessPolicy: AsignacionAccessPolicyService,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idAsignacion: number,
    input: ActualizarAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    await this.accessPolicy.assertPuedeModificar(actor, idAsignacion, input);

    this.logger.log(
      `Actualizando asignacion=${idAsignacion} por actor=${actor.username}.`,
    );

    const anterior =
      await this.personalRepository.obtenerAsignacionPorId(idAsignacion);
    const eraJefatura = anterior?.esJefaturaRolFuncional ?? false;

    // "Editar" nunca cambia id_servicio/id_departamento — para eso existe
    // "mover" (POST /:id/mover, MoverAsignacionUseCase), sin excepcion de rol
    // ni de actor (docs/database/decisiones-tecnicas.md seccion 56). El rechazo
    // vive en el repositorio (actualizarAsignacion), no aqui: comparar contra
    // el id_departamento ya resuelto (buildAssignmentContext infiere el
    // departamento del servicio si el caller solo manda idServicio) evita un
    // falso positivo cuando el caller reenvia el mismo servicio sin repetir el
    // departamento derivado.
    const asignacion = await this.personalRepository.actualizarAsignacion(
      idAsignacion,
      {
        ...input,
        // El frontend ya no manda fechaInicio (docs/database/decisiones-tecnicas.md
        // seccion 49) — a diferencia de crear, mover NUNCA debe reescribirla con hoy
        // si no llega: se conserva la fecha_inicio que ya tenia la asignacion.
        fechaInicio:
          input.fechaInicio ??
          anterior?.fechaInicio.toISOString().slice(0, 10) ??
          new Date().toISOString().slice(0, 10),
        fechaFin: input.fechaFin ?? null,
        regularizarPlanificacionesAbiertas:
          (hasSystemScope(actor) ||
            actor.alcancePlanificacion === 'DEPARTAMENTO') &&
          input.regularizarPlanificacionesAbiertas === true,
        idUsuarioOperacion: actor.id,
      },
    );

    const response = mapAsignacionToResponse(asignacion);

    if (response.esJefaturaRolFuncional !== eraJefatura) {
      await this.sincronizarEstadoUsuario(
        response.idPersonal,
        response.esJefaturaRolFuncional,
      );
    }

    return response;
  }

  private async sincronizarEstadoUsuario(
    idPersonal: number,
    esJefatura: boolean,
  ): Promise<void> {
    const usuario = await this.usuarioRepository.obtenerPorPersonal(idPersonal);
    if (!usuario) return;

    if (esJefatura && !usuario.activo) {
      this.logger.log(
        `Reactivando usuario id=${usuario.id} (${usuario.username}) por cambio de rol funcional a jefatura.`,
      );
      await this.usuarioRepository.activar(usuario.id);
    } else if (!esJefatura && usuario.activo) {
      this.logger.log(
        `Desactivando usuario id=${usuario.id} (${usuario.username}) por cambio de rol funcional fuera de jefatura.`,
      );
      await this.usuarioRepository.desactivar(usuario.id);
    }
  }
}
