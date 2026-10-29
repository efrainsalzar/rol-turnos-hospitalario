import { Injectable } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ImpactoUsoCatalogo } from '../../domain/entities/impacto-uso-catalogo';
import { TurnoRepository } from '../../domain/repositories/turno.repository';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ObtenerImpactoUsoTurnoUseCase {
  constructor(
    private readonly turnoRepository: TurnoRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
  ): Promise<ImpactoUsoCatalogo> {
    const turno = await this.turnoRepository.obtenerPorId(id);

    if (!turno) {
      throw noEncontrado('turno', id, ObtenerImpactoUsoTurnoUseCase.name);
    }

    this.accessPolicy.assertPuedeVerTurno(actor, turno);

    return this.turnoRepository.obtenerImpactoUso(id);
  }
}
