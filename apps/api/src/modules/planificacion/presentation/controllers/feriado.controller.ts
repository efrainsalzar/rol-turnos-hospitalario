import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { FeriadoResponseDto } from '../../application/dto/feriado-response.dto';
import { GuardarFeriadoDto } from '../../application/dto/guardar-feriado.dto';
import { ListarFeriadosQueryDto } from '../../application/dto/listar-feriados-query.dto';
import { ActualizarFeriadoUseCase } from '../../application/use-cases/actualizar-feriado.use-case';
import { CrearFeriadoUseCase } from '../../application/use-cases/crear-feriado.use-case';
import { DesactivarFeriadoUseCase } from '../../application/use-cases/desactivar-feriado.use-case';
import { ListarFeriadosUseCase } from '../../application/use-cases/listar-feriados.use-case';

@Controller({
  path: 'feriados',
  version: '1',
})
export class FeriadoController {
  constructor(
    private readonly listarFeriadosUseCase: ListarFeriadosUseCase,
    private readonly crearFeriadoUseCase: CrearFeriadoUseCase,
    private readonly actualizarFeriadoUseCase: ActualizarFeriadoUseCase,
    private readonly desactivarFeriadoUseCase: DesactivarFeriadoUseCase,
  ) {}

  @Get()
  async listar(
    @Query() query: ListarFeriadosQueryDto,
  ): Promise<CollectionResponse<FeriadoResponseDto>> {
    const data = await this.listarFeriadosUseCase.execute(query);

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
    @Body() body: GuardarFeriadoDto,
  ): Promise<FeriadoResponseDto> {
    return this.crearFeriadoUseCase.execute(actor, body);
  }

  @Put(':id')
  actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarFeriadoDto,
  ): Promise<FeriadoResponseDto> {
    return this.actualizarFeriadoUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    await this.desactivarFeriadoUseCase.execute(actor, id);
    return { ok: true };
  }
}
