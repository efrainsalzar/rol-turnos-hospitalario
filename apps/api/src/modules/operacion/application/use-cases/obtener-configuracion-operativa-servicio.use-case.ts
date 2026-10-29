import { Injectable } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { ConfiguracionOperativaServicioResponseDto } from '../dto/configuracion-operativa-servicio-response.dto';
import { mapConfiguracionOperativaServicioToResponse } from '../mappers/configuracion-operativa-servicio-response.mapper';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ObtenerConfiguracionOperativaServicioUseCase {
  constructor(
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
  ): Promise<ConfiguracionOperativaServicioResponseDto> {
    this.accessPolicy.assertPuedeGestionarTurnoServicio(actor, idServicio);
    const configuracion =
      await this.configuracionOperativaServicioRepository.obtenerPorServicio(
        idServicio,
      );

    if (!configuracion) {
      // El repositorio devuelve null solo si el servicio no existe o esta
      // inactivo; la configuracion se crea sola la primera vez que se guarda.
      throw noEncontrado(
        'servicio',
        idServicio,
        ObtenerConfiguracionOperativaServicioUseCase.name,
      );
    }

    return mapConfiguracionOperativaServicioToResponse(configuracion);
  }
}
