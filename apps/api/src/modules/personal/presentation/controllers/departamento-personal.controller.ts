import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { canAccessDepartamento } from '../../../seguridad/application/helpers/actor-access.helpers';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { AsignacionResponseDto } from '../../application/dto/asignacion-response.dto';
import { ListarPersonalPorDepartamentoUseCase } from '../../application/use-cases/listar-personal-por-departamento.use-case';

@Controller({
  path: 'departamentos',
  version: '1',
})
export class DepartamentoPersonalController {
  constructor(
    private readonly listarPersonalPorDepartamentoUseCase: ListarPersonalPorDepartamentoUseCase,
  ) {}

  @Get(':id/personal')
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CollectionResponse<AsignacionResponseDto>> {
    if (!this.canAccessDepartamento(actor, id)) {
      throw new ForbiddenException(
        'No tienes acceso al personal del departamento solicitado.',
      );
    }

    const data = await this.listarPersonalPorDepartamentoUseCase.execute(id);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  private canAccessDepartamento(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
  ): boolean {
    return canAccessDepartamento(actor, idDepartamento);
  }
}
