import { Injectable, Logger } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { IncidenciaPersonalRepository } from '../../domain/repositories/incidencia-personal.repository';
import type { GuardarIncidenciaPersonalDto } from '../dto/guardar-incidencia-personal.dto';
import type { IncidenciaPersonalResponseDto } from '../dto/incidencia-personal-response.dto';
import { mapIncidenciaPersonalToResponse } from '../mappers/operacion-response.mappers';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ActualizarIncidenciaPersonalUseCase {
  private readonly logger = new Logger(
    ActualizarIncidenciaPersonalUseCase.name,
  );

  constructor(
    private readonly incidenciaPersonalRepository: IncidenciaPersonalRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    id: number,
    input: GuardarIncidenciaPersonalDto,
  ): Promise<IncidenciaPersonalResponseDto> {
    this.accessPolicy.assertPuedeGestionarIncidenciasPersonales(actor);
    this.logger.log(
      `Actualizando incidencia de personal id=${id} por actor=${actor.username}.`,
    );

    const incidenciaPersonal =
      await this.incidenciaPersonalRepository.actualizar(id, {
        codigo: input.codigo,
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
        esLaborable: input.esLaborable,
        generaHorasTrabajadas: input.generaHorasTrabajadas,
        computaParaMetaHoras: input.computaParaMetaHoras,
        requiereRespaldo: input.requiereRespaldo,
        activo: input.activo ?? true,
      });

    return mapIncidenciaPersonalToResponse(incidenciaPersonal);
  }
}
