import { Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';
import { MoverAsignacionDto } from '../dto/mover-asignacion.dto';
import { mapAsignacionToResponse } from '../mappers/asignacion-response.mapper';
import { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';

// Unico caso de uso valido para cambiar id_servicio/id_departamento de una asignacion
// (docs/database/decisiones-tecnicas.md seccion 56). Usa el mismo permiso que "editar"
// (assertPuedeModificar), no el de "cerrar": mover siempre deja a la persona con una
// fila activa al final, es una transferencia, no una baja.
@Injectable()
export class MoverAsignacionUseCase {
  private readonly logger = new Logger(MoverAsignacionUseCase.name);

  constructor(
    private readonly personalRepository: PersonalRepository,
    private readonly accessPolicy: AsignacionAccessPolicyService,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idAsignacion: number,
    input: MoverAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    await this.accessPolicy.assertPuedeModificar(actor, idAsignacion, input);

    this.logger.log(
      `Moviendo asignacion=${idAsignacion} por actor=${actor.username}.`,
    );

    const anterior =
      await this.personalRepository.obtenerAsignacionPorId(idAsignacion);
    const eraJefatura = anterior?.esJefaturaRolFuncional ?? false;

    const asignacion = await this.personalRepository.moverAsignacion(
      idAsignacion,
      {
        ...input,
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
