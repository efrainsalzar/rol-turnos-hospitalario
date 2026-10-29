import { Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CalendarioAccessPolicyService } from './helpers/calendario-access-policy.service';
import { TipoFeriadoRepository } from '../../domain/repositories/tipo-feriado.repository';

@Injectable()
export class DesactivarTipoFeriadoUseCase {
  constructor(
    private readonly calendarioAccessPolicyService: CalendarioAccessPolicyService,
    private readonly tipoFeriadoRepository: TipoFeriadoRepository,
  ) {}

  async execute(actor: UsuarioSesionResponseDto, id: number): Promise<void> {
    this.calendarioAccessPolicyService.assertPuedeGestionarTiposFeriado(actor);
    await this.tipoFeriadoRepository.desactivar(id);
  }
}
