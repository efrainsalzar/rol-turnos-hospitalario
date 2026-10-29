import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { canAccessServicio } from '../../../seguridad/application/helpers/actor-access.helpers';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { ObtenerServicioDetalleUseCase } from '../../../organizacion/application/use-cases/obtener-servicio-detalle.use-case';
import { AsignacionResponseDto } from '../../application/dto/asignacion-response.dto';
import { ListarPersonalPorServicioUseCase } from '../../application/use-cases/listar-personal-por-servicio.use-case';

@Controller({
  path: 'servicios',
  version: '1',
})
export class ServicioPersonalController {
  constructor(
    private readonly listarPersonalPorServicioUseCase: ListarPersonalPorServicioUseCase,
    private readonly obtenerServicioDetalleUseCase: ObtenerServicioDetalleUseCase,
  ) {}

  @Get(':id/personal')
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CollectionResponse<AsignacionResponseDto>> {
    const servicio = await this.obtenerServicioDetalleUseCase.execute(id);

    if (!this.canAccessServicio(actor, servicio.id, servicio.departamento.id)) {
      throw new ForbiddenException(
        'No tienes acceso al personal del servicio solicitado.',
      );
    }

    const data = await this.listarPersonalPorServicioUseCase.execute(id);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  private canAccessServicio(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
    idDepartamento: number,
  ): boolean {
    return canAccessServicio(actor, idServicio, idDepartamento);
  }
}
