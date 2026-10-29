import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Put,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { GuardarIncidenciaPersonalDto } from '../../application/dto/guardar-incidencia-personal.dto';
import { ListarIncidenciasPersonalesQueryDto } from '../../application/dto/listar-incidencias-personales-query.dto';
import { IncidenciaPersonalResponseDto } from '../../application/dto/incidencia-personal-response.dto';
import { ImpactoUsoCatalogo } from '../../domain/entities/impacto-uso-catalogo';
import { ActualizarIncidenciaPersonalUseCase } from '../../application/use-cases/actualizar-incidencia-personal.use-case';
import { CrearIncidenciaPersonalUseCase } from '../../application/use-cases/crear-incidencia-personal.use-case';
import { DesactivarIncidenciaPersonalUseCase } from '../../application/use-cases/desactivar-incidencia-personal.use-case';
import { ListarIncidenciasPersonalesUseCase } from '../../application/use-cases/listar-incidencias-personales.use-case';
import { ObtenerImpactoUsoIncidenciaPersonalUseCase } from '../../application/use-cases/obtener-impacto-uso-incidencia-personal.use-case';

@Controller({
  path: 'incidencias-personales',
  version: '1',
})
export class IncidenciaPersonalController {
  constructor(
    private readonly listarIncidenciasPersonalesUseCase: ListarIncidenciasPersonalesUseCase,
    private readonly crearIncidenciaPersonalUseCase: CrearIncidenciaPersonalUseCase,
    private readonly actualizarIncidenciaPersonalUseCase: ActualizarIncidenciaPersonalUseCase,
    private readonly desactivarIncidenciaPersonalUseCase: DesactivarIncidenciaPersonalUseCase,
    private readonly obtenerImpactoUsoIncidenciaPersonalUseCase: ObtenerImpactoUsoIncidenciaPersonalUseCase,
  ) {}

  @Get()
  async listar(
    @Query() query: ListarIncidenciasPersonalesQueryDto,
  ): Promise<CollectionResponse<IncidenciaPersonalResponseDto>> {
    const data = await this.listarIncidenciasPersonalesUseCase.execute(query);

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
    @Body() body: GuardarIncidenciaPersonalDto,
  ): Promise<IncidenciaPersonalResponseDto> {
    return this.crearIncidenciaPersonalUseCase.execute(actor, body);
  }

  @Put(':id')
  actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarIncidenciaPersonalDto,
  ): Promise<IncidenciaPersonalResponseDto> {
    return this.actualizarIncidenciaPersonalUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query('confirmar_limpieza') confirmarLimpieza?: string,
  ): Promise<{ ok: true }> {
    await this.desactivarIncidenciaPersonalUseCase.execute(
      actor,
      id,
      confirmarLimpieza === 'true',
    );
    return { ok: true };
  }

  @Get(':id/impacto')
  obtenerImpacto(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImpactoUsoCatalogo> {
    return this.obtenerImpactoUsoIncidenciaPersonalUseCase.execute(id);
  }
}
