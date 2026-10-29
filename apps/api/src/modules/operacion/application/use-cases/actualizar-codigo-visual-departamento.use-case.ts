import { Injectable } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { ActualizarCodigoVisualDto } from '../dto/actualizar-codigo-visual.dto';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ActualizarCodigoVisualDepartamentoUseCase {
  constructor(
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
    idCodigo: number,
    input: ActualizarCodigoVisualDto,
  ): Promise<void> {
    this.accessPolicy.assertPuedeGestionarConfiguracionOperativaDepartamento(
      actor,
      idDepartamento,
    );

    await this.configuracionOperativaServicioRepository.actualizarCodigoVisual(
      idCodigo,
      {
        codigoVisual: input.codigoVisual,
        etiqueta: input.etiqueta,
        color: input.color,
      },
    );
  }
}
