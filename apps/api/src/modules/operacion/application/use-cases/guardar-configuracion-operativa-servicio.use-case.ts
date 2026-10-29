import { Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { GuardarConfiguracionOperativaServicioDto } from '../dto/guardar-configuracion-operativa-servicio.dto';
import type { ConfiguracionOperativaServicioResponseDto } from '../dto/configuracion-operativa-servicio-response.dto';
import { mapConfiguracionOperativaServicioToResponse } from '../mappers/configuracion-operativa-servicio-response.mapper';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class GuardarConfiguracionOperativaServicioUseCase {
  constructor(
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
    input: GuardarConfiguracionOperativaServicioDto,
  ): Promise<ConfiguracionOperativaServicioResponseDto> {
    this.accessPolicy.assertPuedeGestionarConfiguracionOperativaServicio(
      actor,
      idServicio,
    );
    const configuracion =
      await this.configuracionOperativaServicioRepository.guardarConfiguracionServicio(
        {
          idServicio,
          modoVisualDefault: input.modoVisual,
          permiteMultiRegistroDia: input.permiteMultiRegistroDia,
          usaEquivalenciaHorariaExportacion:
            input.usaEquivalenciaHorariaExportacion,
          codigos: input.codigos.map((item) => ({
            id: item.id,
            codigoVisual: item.codigoVisual,
            etiqueta: item.etiqueta,
            descripcion: item.descripcion || null,
            color: item.color || null,
            ordenVisual: item.ordenVisual,
            activo: item.activo,
          })),
        },
      );

    return mapConfiguracionOperativaServicioToResponse(configuracion);
  }
}
