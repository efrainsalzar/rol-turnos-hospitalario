import { Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import { CalendarioAccessPolicyService } from './helpers/calendario-access-policy.service';
import { assertCalendarioMesGenerado } from './helpers/assert-calendario-generado';
import { GuardarFeriadoDto } from '../dto/guardar-feriado.dto';
import { FeriadoResponseDto } from '../dto/feriado-response.dto';
import { FeriadoRepository } from '../../domain/repositories/feriado.repository';
import { mapFeriadoToResponse } from '../mappers/feriado-response.mapper';

@Injectable()
export class ActualizarFeriadoUseCase {
  private readonly logger = new Logger(ActualizarFeriadoUseCase.name);

  constructor(
    private readonly calendarioAccessPolicyService: CalendarioAccessPolicyService,
    private readonly calendarioRepository: CalendarioRepository,
    private readonly feriadoRepository: FeriadoRepository,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
    input: GuardarFeriadoDto,
  ): Promise<FeriadoResponseDto> {
    this.calendarioAccessPolicyService.assertPuedeGestionarCalendario(actor);
    await assertCalendarioMesGenerado(
      this.calendarioRepository,
      input.anio,
      input.mes,
    );

    this.logger.log(`Actualizando feriado=${id} por actor=${actor.username}.`);

    const feriado = await this.feriadoRepository.actualizar(id, {
      idTipoFeriado: input.idTipoFeriado,
      nombre: input.nombre,
      anio: input.anio,
      mes: input.mes,
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      activo: input.activo,
    });

    return mapFeriadoToResponse(feriado);
  }
}
