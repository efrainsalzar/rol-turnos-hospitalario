import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CalendarioResponseDto } from '../../application/dto/calendario-response.dto';
import { GenerarCalendarioDto } from '../../application/dto/generar-calendario.dto';
import { ListarCalendariosQueryDto } from '../../application/dto/listar-calendarios-query.dto';
import { ResultadoGeneracionCalendarioResponseDto } from '../../application/dto/resultado-generacion-calendario-response.dto';
import { GenerarCalendarioUseCase } from '../../application/use-cases/generar-calendario.use-case';
import { CalendarioAccessPolicyService } from '../../application/use-cases/helpers/calendario-access-policy.service';
import { ListarCalendariosUseCase } from '../../application/use-cases/listar-calendarios.use-case';

@Controller({
  path: 'calendarios',
  version: '1',
})
export class CalendarioController {
  constructor(
    private readonly listarCalendariosUseCase: ListarCalendariosUseCase,
    private readonly generarCalendarioUseCase: GenerarCalendarioUseCase,
    private readonly calendarioAccessPolicyService: CalendarioAccessPolicyService,
  ) {}

  @Get()
  async listar(
    @Query() query: ListarCalendariosQueryDto,
  ): Promise<CollectionResponse<CalendarioResponseDto>> {
    const data = await this.listarCalendariosUseCase.execute(query);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post('generar')
  async generar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: GenerarCalendarioDto,
  ): Promise<ResultadoGeneracionCalendarioResponseDto> {
    this.calendarioAccessPolicyService.assertPuedeGestionarCalendario(actor);
    return this.generarCalendarioUseCase.execute(body);
  }
}
