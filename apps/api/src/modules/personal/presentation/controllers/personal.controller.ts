import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Put,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { ActualizarPersonalDto } from '../../application/dto/actualizar-personal.dto';
import { CrearPersonalDto } from '../../application/dto/crear-personal.dto';
import { ListarPersonalQueryDto } from '../../application/dto/listar-personal-query.dto';
import { PersonalDetalleResponseDto } from '../../application/dto/personal-detalle-response.dto';
import { PersonalResponseDto } from '../../application/dto/personal-response.dto';
import { ActualizarPersonalUseCase } from '../../application/use-cases/actualizar-personal.use-case';
import { ActivarPersonalUseCase } from '../../application/use-cases/activar-personal.use-case';
import { CrearPersonalUseCase } from '../../application/use-cases/crear-personal.use-case';
import { DesactivarPersonalUseCase } from '../../application/use-cases/desactivar-personal.use-case';
import { ListarPersonalUseCase } from '../../application/use-cases/listar-personal.use-case';
import { ListarPersonalVinculableUsuarioUseCase } from '../../application/use-cases/listar-personal-vinculable-usuario.use-case';
import { PersonalVinculableResponseDto } from '../../application/dto/personal-vinculable-response.dto';
import { ObtenerPersonalDetalleUseCase } from '../../application/use-cases/obtener-personal-detalle.use-case';
import { PersonalAccessPolicyService } from '../../application/use-cases/helpers/personal-access-policy.service';

@Controller({
  path: 'personal',
  version: '1',
})
export class PersonalController {
  private readonly logger = new Logger(PersonalController.name);

  constructor(
    private readonly listarPersonalUseCase: ListarPersonalUseCase,
    private readonly listarPersonalVinculableUsuarioUseCase: ListarPersonalVinculableUsuarioUseCase,
    private readonly obtenerPersonalDetalleUseCase: ObtenerPersonalDetalleUseCase,
    private readonly crearPersonalUseCase: CrearPersonalUseCase,
    private readonly actualizarPersonalUseCase: ActualizarPersonalUseCase,
    private readonly activarPersonalUseCase: ActivarPersonalUseCase,
    private readonly desactivarPersonalUseCase: DesactivarPersonalUseCase,
    private readonly personalAccessPolicyService: PersonalAccessPolicyService,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Query() query: ListarPersonalQueryDto,
  ): Promise<CollectionResponse<PersonalResponseDto>> {
    this.logger.log(
      `Acceso a GET /v1/personal${query.idServicioNormalizado ? ` con id_servicio_principal=${query.idServicioNormalizado}` : ''}${query.idDepartamentoNormalizado ? ` con id_departamento=${query.idDepartamentoNormalizado}` : ''}${query.idNivelCargoNormalizado ? ` con id_nivel_cargo=${query.idNivelCargoNormalizado}` : ''}${typeof query.activo === 'boolean' ? ` y activo=${query.activo}` : ''}.`,
    );

    return this.listarPersonalUseCase.execute(
      this.personalAccessPolicyService.scopeQuery(actor, query),
    );
  }

  @Get('vinculables-usuario')
  async listarVinculablesUsuario(
    @CurrentActor() actor: UsuarioSesionResponseDto,
  ): Promise<CollectionResponse<PersonalVinculableResponseDto>> {
    this.logger.log('Acceso a GET /v1/personal/vinculables-usuario.');
    const data =
      await this.listarPersonalVinculableUsuarioUseCase.execute(actor);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get(':id/detalle')
  async obtenerDetalle(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PersonalDetalleResponseDto> {
    this.logger.log(`Acceso a GET /v1/personal/${id}/detalle.`);
    const detalle = await this.obtenerPersonalDetalleUseCase.execute(id);
    this.personalAccessPolicyService.assertPuedeVerDetalle(actor, detalle);
    return detalle;
  }

  @Post()
  async crear(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: CrearPersonalDto,
  ): Promise<PersonalResponseDto> {
    this.logger.log(`Acceso a POST /v1/personal por actor=${actor.username}.`);
    return this.crearPersonalUseCase.execute(actor, body);
  }

  @Put(':id')
  async actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarPersonalDto,
  ): Promise<PersonalResponseDto> {
    this.logger.log(
      `Acceso a PUT /v1/personal/${id} por actor=${actor.username}.`,
    );
    return this.actualizarPersonalUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    this.logger.log(
      `Acceso a DELETE /v1/personal/${id} por actor=${actor.username}.`,
    );
    await this.desactivarPersonalUseCase.execute(actor, id);
  }

  @Post(':id/activar')
  async activar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    this.logger.log(
      `Acceso a POST /v1/personal/${id}/activar por actor=${actor.username}.`,
    );
    await this.activarPersonalUseCase.execute(actor, id);
  }
}
