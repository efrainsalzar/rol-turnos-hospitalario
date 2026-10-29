import { Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';
import { CerrarAsignacionDto } from '../dto/cerrar-asignacion.dto';
import { mapAsignacionToResponse } from '../mappers/asignacion-response.mapper';
import { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';

@Injectable()
export class CerrarAsignacionUseCase {
  private readonly logger = new Logger(CerrarAsignacionUseCase.name);

  constructor(
    private readonly personalRepository: PersonalRepository,
    private readonly accessPolicy: AsignacionAccessPolicyService,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idAsignacion: number,
    input: CerrarAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    this.accessPolicy.assertPuedeCerrar(actor);

    this.logger.log(
      `Cerrando asignacion=${idAsignacion} por actor=${actor.username}.`,
    );

    const asignacion = await this.personalRepository.cerrarAsignacion(
      idAsignacion,
      {
        ...input,
        // El frontend ya no manda fechaFin (docs/database/decisiones-tecnicas.md
        // seccion 49) — se completa con la fecha actual si no llega.
        fechaFin: input.fechaFin ?? new Date().toISOString().slice(0, 10),
        regularizarPlanificacionesAbiertas:
          input.regularizarPlanificacionesAbiertas === true,
        idUsuarioOperacion: actor.id,
      },
    );

    const response = mapAsignacionToResponse(asignacion);

    if (response.esJefaturaRolFuncional) {
      const usuario = await this.usuarioRepository.obtenerPorPersonal(
        response.idPersonal,
      );
      if (usuario?.activo) {
        this.logger.log(
          `Desactivando usuario id=${usuario.id} (${usuario.username}) por cierre de asignacion de jefatura id=${idAsignacion}.`,
        );
        await this.usuarioRepository.desactivar(usuario.id);
      }
    }

    return response;
  }
}
