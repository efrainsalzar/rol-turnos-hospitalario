import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Put,
} from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import type { ConfiguracionOperativaServicioResponseDto } from '../../application/dto/configuracion-operativa-servicio-response.dto';
import { ActualizarCodigoVisualDto } from '../../application/dto/actualizar-codigo-visual.dto';
import { GuardarConfiguracionOperativaServicioDto } from '../../application/dto/guardar-configuracion-operativa-servicio.dto';
import { ActualizarCodigoVisualUseCase } from '../../application/use-cases/actualizar-codigo-visual.use-case';
import { GuardarConfiguracionOperativaServicioUseCase } from '../../application/use-cases/guardar-configuracion-operativa-servicio.use-case';
import { ObtenerConfiguracionOperativaServicioUseCase } from '../../application/use-cases/obtener-configuracion-operativa-servicio.use-case';

@Controller({
  path: 'configuracion-operativa-servicios',
  version: '1',
})
export class ConfiguracionOperativaServicioController {
  constructor(
    private readonly obtenerConfiguracionOperativaServicioUseCase: ObtenerConfiguracionOperativaServicioUseCase,
    private readonly guardarConfiguracionOperativaServicioUseCase: GuardarConfiguracionOperativaServicioUseCase,
    private readonly actualizarCodigoVisualUseCase: ActualizarCodigoVisualUseCase,
  ) {}

  @Get(':idServicio')
  obtener(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('idServicio', ParseIntPipe) idServicio: number,
  ): Promise<ConfiguracionOperativaServicioResponseDto> {
    return this.obtenerConfiguracionOperativaServicioUseCase.execute(
      actor,
      idServicio,
    );
  }

  @Put(':idServicio')
  guardar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('idServicio', ParseIntPipe) idServicio: number,
    @Body() body: GuardarConfiguracionOperativaServicioDto,
  ): Promise<ConfiguracionOperativaServicioResponseDto> {
    return this.guardarConfiguracionOperativaServicioUseCase.execute(
      actor,
      idServicio,
      body,
    );
  }

  @Patch(':idServicio/codigos/:idCodigo')
  @HttpCode(204)
  async actualizarCodigoVisual(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('idServicio', ParseIntPipe) idServicio: number,
    @Param('idCodigo', ParseIntPipe) idCodigo: number,
    @Body() body: ActualizarCodigoVisualDto,
  ): Promise<void> {
    await this.actualizarCodigoVisualUseCase.execute(
      actor,
      idServicio,
      idCodigo,
      body,
    );
  }
}
