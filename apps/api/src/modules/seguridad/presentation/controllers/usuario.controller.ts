import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../decorators/current-actor.decorator';
import { ActualizarUsuarioDto } from '../../application/dto/actualizar-usuario.dto';
import { CambiarMiPasswordDto } from '../../application/dto/cambiar-mi-password.dto';
import { CrearUsuarioDto } from '../../application/dto/crear-usuario.dto';
import { UsuarioResponseDto } from '../../application/dto/usuario-response.dto';
import { ActualizarUsuarioUseCase } from '../../application/use-cases/actualizar-usuario.use-case';
import { ActivarUsuarioUseCase } from '../../application/use-cases/activar-usuario.use-case';
import { CambiarMiPasswordUseCase } from '../../application/use-cases/cambiar-mi-password.use-case';
import { CrearUsuarioUseCase } from '../../application/use-cases/crear-usuario.use-case';
import { DesactivarUsuarioUseCase } from '../../application/use-cases/desactivar-usuario.use-case';
import { ListarUsuariosUseCase } from '../../application/use-cases/listar-usuarios.use-case';

@Controller({
  path: 'usuarios',
  version: '1',
})
export class UsuarioController {
  constructor(
    private readonly listarUsuariosUseCase: ListarUsuariosUseCase,
    private readonly crearUsuarioUseCase: CrearUsuarioUseCase,
    private readonly actualizarUsuarioUseCase: ActualizarUsuarioUseCase,
    private readonly cambiarMiPasswordUseCase: CambiarMiPasswordUseCase,
    private readonly activarUsuarioUseCase: ActivarUsuarioUseCase,
    private readonly desactivarUsuarioUseCase: DesactivarUsuarioUseCase,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
  ): Promise<CollectionResponse<UsuarioResponseDto>> {
    if (!actor.permisos.puedeVerSeguridad) {
      throw new ForbiddenException(
        'No tienes permisos para consultar usuarios.',
      );
    }

    const data = await this.listarUsuariosUseCase.execute();

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post()
  async crear(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: CrearUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    return this.crearUsuarioUseCase.execute(actor, body);
  }

  @Patch('mi-password')
  async cambiarMiPassword(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: CambiarMiPasswordDto,
  ): Promise<void> {
    await this.cambiarMiPasswordUseCase.execute(actor, body);
  }

  @Put(':id')
  async actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    return this.actualizarUsuarioUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.desactivarUsuarioUseCase.execute(actor, id);
  }

  @Post(':id/activar')
  async activar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.activarUsuarioUseCase.execute(actor, id);
  }
}
