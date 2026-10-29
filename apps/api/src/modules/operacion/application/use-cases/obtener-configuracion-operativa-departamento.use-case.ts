import { Injectable } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ConfiguracionOperativaServicioRepository } from '../../../planificacion/domain/repositories/configuracion-operativa-servicio.repository';
import type { ConfiguracionOperativaDepartamentoResponseDto } from '../dto/configuracion-operativa-servicio-response.dto';
import { mapConfiguracionOperativaDepartamentoToResponse } from '../mappers/configuracion-operativa-servicio-response.mapper';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';

@Injectable()
export class ObtenerConfiguracionOperativaDepartamentoUseCase {
  constructor(
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
    private readonly accessPolicy: OperacionAccessPolicyService,
  ) {}

  async execute(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
  ): Promise<ConfiguracionOperativaDepartamentoResponseDto> {
    this.accessPolicy.assertPuedeGestionarConfiguracionOperativaDepartamento(
      actor,
      idDepartamento,
    );
    const configuracion =
      await this.configuracionOperativaServicioRepository.obtenerPorDepartamento(
        idDepartamento,
      );

    if (!configuracion) {
      // El repositorio devuelve null solo si el departamento no existe o esta
      // inactivo; la configuracion se crea sola la primera vez que se guarda.
      throw noEncontrado(
        'departamento',
        idDepartamento,
        ObtenerConfiguracionOperativaDepartamentoUseCase.name,
      );
    }

    return mapConfiguracionOperativaDepartamentoToResponse(configuracion);
  }
}
