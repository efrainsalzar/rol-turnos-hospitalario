import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';

@Injectable()
export class DesactivarPersonalUseCase {
  private readonly logger = new Logger(DesactivarPersonalUseCase.name);

  constructor(
    private readonly personalRepository: PersonalRepository,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  // Decision 2026-07-08 (docs/database/decisiones-tecnicas.md seccion 38): dar
  // de baja significa que la persona ya no asiste a trabajar (despido, fin de
  // contrato, renuncia). Antes esto quedaba bloqueado si tenia asignaciones
  // vigentes y nunca tocaba el usuario vinculado. Ahora cierra todo en cascada:
  // asignaciones vigentes (regularizando actividad futura ya cargada, incluida
  // en planificaciones APROBADA) y el usuario de acceso, sin importar si la
  // asignacion era jefatura o no.
  async execute(
    actor: UsuarioSesionResponseDto,
    idPersonal: number,
  ): Promise<void> {
    assertPuedeGestionarPersonal(actor);

    this.logger.log(
      `Desactivando personal id=${idPersonal} por actor=${actor.username}.`,
    );

    const detalle = await this.personalRepository.obtenerDetalle(idPersonal);

    if (!detalle) {
      throw noEncontrado(
        'personal',
        idPersonal,
        DesactivarPersonalUseCase.name,
      );
    }

    const fechaBaja = new Date().toISOString().slice(0, 10);

    for (const asignacion of detalle.asignacionesVigentes) {
      this.logger.log(
        `Cerrando asignacion id=${asignacion.id} por baja de personal id=${idPersonal}.`,
      );
      await this.personalRepository.cerrarAsignacion(asignacion.id, {
        fechaFin: fechaBaja,
        motivo: 'Cierre automatico por baja de personal.',
        regularizarPlanificacionesAbiertas: true,
        idUsuarioOperacion: actor.id,
      });
    }

    await this.personalRepository.desactivarPersonal(idPersonal);

    const usuario = await this.usuarioRepository.obtenerPorPersonal(idPersonal);

    if (usuario?.activo) {
      this.logger.log(
        `Desactivando usuario id=${usuario.id} (${usuario.username}) por baja de personal id=${idPersonal}.`,
      );
      await this.usuarioRepository.desactivar(usuario.id);
    }
  }
}

function assertPuedeGestionarPersonal(actor: UsuarioSesionResponseDto) {
  if (!actor.permisos.puedeGestionarPersonal) {
    throw new ForbiddenException('No tienes permiso para gestionar personal.');
  }
}
