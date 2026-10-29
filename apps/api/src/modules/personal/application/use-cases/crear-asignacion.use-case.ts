import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { UsuarioRepository } from '../../../seguridad/domain/repositories/usuario.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';
import { CrearAsignacionDto } from '../dto/crear-asignacion.dto';
import { mapAsignacionToResponse } from '../mappers/asignacion-response.mapper';
import { AsignacionAccessPolicyService } from './helpers/asignacion-access-policy.service';

@Injectable()
export class CrearAsignacionUseCase {
  private readonly logger = new Logger(CrearAsignacionUseCase.name);

  constructor(
    private readonly personalRepository: PersonalRepository,
    private readonly accessPolicy: AsignacionAccessPolicyService,
    private readonly usuarioRepository: UsuarioRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: CrearAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    await this.accessPolicy.assertPuedeCrear(actor, input);

    const personal = await this.personalRepository.obtenerPorId(
      input.idPersonal,
    );

    if (!personal) {
      throw noEncontrado(
        'personal',
        input.idPersonal,
        CrearAsignacionUseCase.name,
      );
    }

    if (!personal.activo) {
      const nombreCompleto = [
        personal.nombres,
        personal.apellidoPaterno,
        personal.apellidoMaterno,
      ]
        .filter((value) => Boolean(value))
        .join(' ');

      throw new ConflictException(
        `${nombreCompleto} esta dado de baja. Reactiva a la persona antes de asignarle un servicio o departamento.`,
      );
    }

    this.logger.log(
      `Creando asignacion para personal=${input.idPersonal} por actor=${actor.username}.`,
    );

    // El frontend ya no manda fechaInicio (docs/database/decisiones-tecnicas.md
    // seccion 49) — se resuelve una sola vez aqui.
    const fechaInicio =
      input.fechaInicio ?? new Date().toISOString().slice(0, 10);

    // Nombrar jefatura en una unidad con jefe activo, o promover a alguien con
    // asignacion vigente en otra unidad, siempre se rechaza aqui con el 409
    // estandar de assertCanPersistAssignment (en el repositorio). No existe
    // atajo de reemplazo automatico para ningun actor, ni siquiera
    // Administracion del sistema (docs/database/decisiones-tecnicas.md
    // seccion 55): el flujo correcto es siempre en dos pasos manuales
    // separados — cerrar primero la asignacion en conflicto, nombrar la
    // jefatura nueva despues.
    const asignacion = await this.personalRepository.crearAsignacion({
      ...input,
      fechaInicio,
      motivo: input.motivo ?? null,
      fechaFin: input.fechaFin ?? null,
      idUsuarioOperacion: actor.id,
    });

    const response = mapAsignacionToResponse(asignacion);

    if (response.esJefaturaRolFuncional) {
      const usuario = await this.usuarioRepository.obtenerPorPersonal(
        response.idPersonal,
      );
      if (usuario && !usuario.activo) {
        this.logger.log(
          `Reactivando usuario id=${usuario.id} (${usuario.username}) por nueva asignacion de jefatura id=${response.id}.`,
        );
        await this.usuarioRepository.activar(usuario.id);
      }
    }

    return response;
  }
}
