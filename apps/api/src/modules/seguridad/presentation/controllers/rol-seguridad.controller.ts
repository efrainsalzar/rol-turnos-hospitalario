import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { GuardarRolSeguridadDto } from '../../application/dto/guardar-rol-seguridad.dto';
import { RolSeguridadResponseDto } from '../../application/dto/rol-seguridad-response.dto';
import { ListarRolesUseCase } from '../../application/use-cases/listar-roles.use-case';
import { CrearRolSeguridadUseCase } from '../../application/use-cases/crear-rol-seguridad.use-case';
import { ActualizarRolSeguridadUseCase } from '../../application/use-cases/actualizar-rol-seguridad.use-case';
import type { UsuarioSesionResponseDto } from '../../application/dto/usuario-sesion-response.dto';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { CurrentActor } from '../decorators/current-actor.decorator';

@Controller({
  path: 'roles',
  version: '1',
})
export class RolSeguridadController {
  constructor(
    private readonly listarRolesUseCase: ListarRolesUseCase,
    private readonly crearRolUseCase: CrearRolSeguridadUseCase,
    private readonly actualizarRolUseCase: ActualizarRolSeguridadUseCase,
    private readonly rolSeguridadRepository: RolSeguridadRepository,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
  ): Promise<CollectionResponse<RolSeguridadResponseDto>> {
    if (!actor.permisos.puedeVerSeguridad) {
      throw new ForbiddenException(
        'No tienes permisos para consultar roles de seguridad.',
      );
    }

    const data = await this.listarRolesUseCase.execute();

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post()
  crear(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: GuardarRolSeguridadDto,
  ): Promise<RolSeguridadResponseDto> {
    return this.crearRolUseCase.execute(actor, body);
  }

  @Put(':id')
  actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarRolSeguridadDto,
  ): Promise<RolSeguridadResponseDto> {
    return this.actualizarRolUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertAdmin(actor);
    await this.rolSeguridadRepository.desactivar(id);
    return { ok: true };
  }

  @Post(':id/activar')
  async activar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertAdmin(actor);
    await this.rolSeguridadRepository.activar(id);
    return { ok: true };
  }

  private assertAdmin(actor: UsuarioSesionResponseDto) {
    if (!actor.permisos.puedeGestionarUsuarios) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar roles de seguridad.',
      );
    }
  }
}
