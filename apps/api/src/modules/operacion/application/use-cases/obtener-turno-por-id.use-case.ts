import { Injectable } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { TurnoRepository } from '../../domain/repositories/turno.repository';
import { TurnoResponseDto } from '../dto/turno-response.dto';
import { mapTurnoToResponse } from '../mappers/operacion-response.mappers';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ObtenerTurnoPorIdUseCase {
  constructor(
    private readonly turnoRepository: TurnoRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
  ): Promise<TurnoResponseDto> {
    const turno = await this.turnoRepository.obtenerPorId(id);
    if (!turno) {
      throw noEncontrado('turno', id, ObtenerTurnoPorIdUseCase.name);
    }

    this.accessPolicy.assertPuedeVerTurno(actor, turno);

    return mapTurnoToResponse(turno);
  }
}
