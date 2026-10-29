import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { GuardarTipoFeriadoDto } from '../../application/dto/guardar-tipo-feriado.dto';
import { TipoFeriadoResponseDto } from '../../application/dto/tipo-feriado-response.dto';
import { ActualizarTipoFeriadoUseCase } from '../../application/use-cases/actualizar-tipo-feriado.use-case';
import { CrearTipoFeriadoUseCase } from '../../application/use-cases/crear-tipo-feriado.use-case';
import { DesactivarTipoFeriadoUseCase } from '../../application/use-cases/desactivar-tipo-feriado.use-case';
import { ListarTiposFeriadoUseCase } from '../../application/use-cases/listar-tipos-feriado.use-case';

@Controller({
  path: 'tipos-feriado',
  version: '1',
})
export class TipoFeriadoController {
  constructor(
    private readonly listarTiposFeriadoUseCase: ListarTiposFeriadoUseCase,
    private readonly crearTipoFeriadoUseCase: CrearTipoFeriadoUseCase,
    private readonly actualizarTipoFeriadoUseCase: ActualizarTipoFeriadoUseCase,
    private readonly desactivarTipoFeriadoUseCase: DesactivarTipoFeriadoUseCase,
  ) {}

  @Get()
  async listar(): Promise<CollectionResponse<TipoFeriadoResponseDto>> {
    const data = await this.listarTiposFeriadoUseCase.execute();

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
    @Body() body: GuardarTipoFeriadoDto,
  ): Promise<TipoFeriadoResponseDto> {
    return this.crearTipoFeriadoUseCase.execute(actor, body);
  }

  @Put(':id')
  actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarTipoFeriadoDto,
  ): Promise<TipoFeriadoResponseDto> {
    return this.actualizarTipoFeriadoUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    await this.desactivarTipoFeriadoUseCase.execute(actor, id);
    return { ok: true };
  }
}
