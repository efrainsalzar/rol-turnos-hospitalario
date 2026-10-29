import { Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CalendarioAccessPolicyService } from './helpers/calendario-access-policy.service';
import { FeriadoRepository } from '../../domain/repositories/feriado.repository';

@Injectable()
export class DesactivarFeriadoUseCase {
  private readonly logger = new Logger(DesactivarFeriadoUseCase.name);

  constructor(
    private readonly calendarioAccessPolicyService: CalendarioAccessPolicyService,
    private readonly feriadoRepository: FeriadoRepository,
  ) {}

  async execute(actor: UsuarioSesionResponseDto, id: number): Promise<void> {
    this.calendarioAccessPolicyService.assertPuedeGestionarCalendario(actor);
    this.logger.log(`Desactivando feriado=${id} por actor=${actor.username}.`);
    await this.feriadoRepository.desactivar(id);
  }
}
