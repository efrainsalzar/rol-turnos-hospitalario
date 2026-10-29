import { Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { GuardarConfiguracionOperativaServicioDto } from '../dto/guardar-configuracion-operativa-servicio.dto';
import type { ConfiguracionOperativaDepartamentoResponseDto } from '../dto/configuracion-operativa-servicio-response.dto';
import { mapConfiguracionOperativaDepartamentoToResponse } from '../mappers/configuracion-operativa-servicio-response.mapper';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class GuardarConfiguracionOperativaDepartamentoUseCase {
  constructor(
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
    input: GuardarConfiguracionOperativaServicioDto,
  ): Promise<ConfiguracionOperativaDepartamentoResponseDto> {
    this.accessPolicy.assertPuedeGestionarConfiguracionOperativaDepartamento(
      actor,
      idDepartamento,
    );
    const configuracion =
      await this.configuracionOperativaServicioRepository.guardarConfiguracionDepartamento(
        {
          idDepartamento,
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

    return mapConfiguracionOperativaDepartamentoToResponse(configuracion);
  }
}
