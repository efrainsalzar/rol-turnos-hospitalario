import { Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CalendarioAccessPolicyService } from './helpers/calendario-access-policy.service';
import { GuardarTipoFeriadoDto } from '../dto/guardar-tipo-feriado.dto';
import { TipoFeriadoResponseDto } from '../dto/tipo-feriado-response.dto';
import { TipoFeriadoRepository } from '../../domain/repositories/tipo-feriado.repository';

@Injectable()
export class CrearTipoFeriadoUseCase {
  constructor(
    private readonly calendarioAccessPolicyService: CalendarioAccessPolicyService,
    private readonly tipoFeriadoRepository: TipoFeriadoRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    input: GuardarTipoFeriadoDto,
  ): Promise<TipoFeriadoResponseDto> {
    this.calendarioAccessPolicyService.assertPuedeGestionarTiposFeriado(actor);

    const created = await this.tipoFeriadoRepository.crear({
      codigo: input.codigo,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      orden: input.orden,
      activo: input.activo,
    });

    return created;
  }
}
