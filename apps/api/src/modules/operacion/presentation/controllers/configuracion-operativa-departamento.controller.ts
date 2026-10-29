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
import type { ConfiguracionOperativaDepartamentoResponseDto } from '../../application/dto/configuracion-operativa-servicio-response.dto';
import { ActualizarCodigoVisualDto } from '../../application/dto/actualizar-codigo-visual.dto';
import { GuardarConfiguracionOperativaServicioDto } from '../../application/dto/guardar-configuracion-operativa-servicio.dto';
import { ActualizarCodigoVisualDepartamentoUseCase } from '../../application/use-cases/actualizar-codigo-visual-departamento.use-case';
import { GuardarConfiguracionOperativaDepartamentoUseCase } from '../../application/use-cases/guardar-configuracion-operativa-departamento.use-case';
import { ObtenerConfiguracionOperativaDepartamentoUseCase } from '../../application/use-cases/obtener-configuracion-operativa-departamento.use-case';

@Controller({
  path: 'configuracion-operativa-departamentos',
  version: '1',
})
export class ConfiguracionOperativaDepartamentoController {
  constructor(
    private readonly obtenerUseCase: ObtenerConfiguracionOperativaDepartamentoUseCase,
    private readonly guardarUseCase: GuardarConfiguracionOperativaDepartamentoUseCase,
    private readonly actualizarCodigoVisualUseCase: ActualizarCodigoVisualDepartamentoUseCase,
  ) {}

  @Get(':idDepartamento')
  obtener(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('idDepartamento', ParseIntPipe) idDepartamento: number,
  ): Promise<ConfiguracionOperativaDepartamentoResponseDto> {
    return this.obtenerUseCase.execute(actor, idDepartamento);
  }

  @Put(':idDepartamento')
  guardar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('idDepartamento', ParseIntPipe) idDepartamento: number,
    @Body() body: GuardarConfiguracionOperativaServicioDto,
  ): Promise<ConfiguracionOperativaDepartamentoResponseDto> {
    return this.guardarUseCase.execute(actor, idDepartamento, body);
  }

  @Patch(':idDepartamento/codigos/:idCodigo')
  @HttpCode(204)
  async actualizarCodigoVisual(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('idDepartamento', ParseIntPipe) idDepartamento: number,
    @Param('idCodigo', ParseIntPipe) idCodigo: number,
    @Body() body: ActualizarCodigoVisualDto,
  ): Promise<void> {
    await this.actualizarCodigoVisualUseCase.execute(
      actor,
      idDepartamento,
      idCodigo,
      body,
    );
  }
}
