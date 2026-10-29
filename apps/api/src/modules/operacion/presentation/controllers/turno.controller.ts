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
  Query,
} from '@nestjs/common';
import { ImpactoUsoCatalogo } from '../../domain/entities/impacto-uso-catalogo';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import {
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
} from '../../../seguridad/application/helpers/actor-access.helpers';
import { GuardarTurnoDto } from '../../application/dto/guardar-turno.dto';
import { ActivarTurnoUseCase } from '../../application/use-cases/activar-turno.use-case';
import { ListarTurnosQueryDto } from '../../application/dto/listar-turnos-query.dto';
import { TurnoResponseDto } from '../../application/dto/turno-response.dto';
import { ActualizarTurnoUseCase } from '../../application/use-cases/actualizar-turno.use-case';
import { CrearTurnoUseCase } from '../../application/use-cases/crear-turno.use-case';
import { DesactivarTurnoUseCase } from '../../application/use-cases/desactivar-turno.use-case';
import { ListarTurnosUseCase } from '../../application/use-cases/listar-turnos.use-case';
import { ObtenerTurnoPorIdUseCase } from '../../application/use-cases/obtener-turno-por-id.use-case';
import { ObtenerImpactoUsoTurnoUseCase } from '../../application/use-cases/obtener-impacto-uso-turno.use-case';

@Controller({
  path: 'turnos',
  version: '1',
})
export class TurnoController {
  constructor(
    private readonly listarTurnosUseCase: ListarTurnosUseCase,
    private readonly obtenerTurnoPorIdUseCase: ObtenerTurnoPorIdUseCase,
    private readonly crearTurnoUseCase: CrearTurnoUseCase,
    private readonly actualizarTurnoUseCase: ActualizarTurnoUseCase,
    private readonly activarTurnoUseCase: ActivarTurnoUseCase,
    private readonly desactivarTurnoUseCase: DesactivarTurnoUseCase,
    private readonly obtenerImpactoUsoTurnoUseCase: ObtenerImpactoUsoTurnoUseCase,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Query() query: ListarTurnosQueryDto,
  ): Promise<CollectionResponse<TurnoResponseDto>> {
    return this.listarTurnosUseCase.execute(
      this.buildScopedQuery(actor, query),
    );
  }

  @Get(':id')
  obtener(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TurnoResponseDto> {
    return this.obtenerTurnoPorIdUseCase.execute(actor, id);
  }

  @Get(':id/impacto')
  obtenerImpacto(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImpactoUsoCatalogo> {
    return this.obtenerImpactoUsoTurnoUseCase.execute(actor, id);
  }

  @Post()
  crear(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: GuardarTurnoDto,
  ): Promise<TurnoResponseDto> {
    return this.crearTurnoUseCase.execute(actor, body);
  }

  @Put(':id')
  actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarTurnoDto,
  ): Promise<TurnoResponseDto> {
    return this.actualizarTurnoUseCase.execute(actor, id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query('confirmar_limpieza') confirmarLimpieza?: string,
  ): Promise<{ ok: true }> {
    await this.desactivarTurnoUseCase.execute(
      actor,
      id,
      confirmarLimpieza === 'true',
    );
    return { ok: true };
  }

  @Post(':id/activar')
  async activar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    await this.activarTurnoUseCase.execute(actor, id);
    return { ok: true };
  }

  private buildScopedQuery(
    actor: UsuarioSesionResponseDto,
    query: ListarTurnosQueryDto,
  ): ListarTurnosQueryDto {
    if (hasSystemScope(actor)) {
      return query;
    }

    const scoped = Object.assign(new ListarTurnosQueryDto(), query);
    const allowedServiceIds = actor.serviciosGestionables.map(
      (item) => item.id,
    );

    if (scoped.id_servicio && !allowedServiceIds.includes(scoped.id_servicio)) {
      throw new ForbiddenException('No tienes acceso al servicio solicitado.');
    }

    if (hasDepartamentoScope(actor)) {
      if (scoped.id_servicio) {
        // Servicio puntual dentro de su departamento: no hace falta id_departamento,
        // el repositorio prioriza id_servicio si esta presente.
        scoped.id_departamento = undefined;
        return scoped;
      }

      // "Todos" para un jefe de departamento significa todo su departamento:
      // turnos directos del departamento + los de todos sus servicios.
      const allowedDepartmentIds = actor.departamentosGestionables.map(
        (item) => item.id,
      );
      scoped.id_departamento = allowedDepartmentIds[0];
      return scoped;
    }

    if (hasServicioScope(actor)) {
      // Un jefe de servicio nunca tiene alcance departamental: siempre se
      // fuerza a su unico servicio, sin selector posible en la UI.
      scoped.id_servicio = allowedServiceIds[0];
      scoped.id_departamento = undefined;
      return scoped;
    }

    // Sin departamentos ni servicios gestionables no hay unidad valida sobre
    // la cual acotar: filtro imposible en vez de una lista sin acotar.
    scoped.id_servicio = -1;
    scoped.id_departamento = undefined;

    return scoped;
  }
}
