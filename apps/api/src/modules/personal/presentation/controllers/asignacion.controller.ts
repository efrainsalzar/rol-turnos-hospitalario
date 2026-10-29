import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
} from '../../../seguridad/application/helpers/actor-access.helpers';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { ActualizarAsignacionDto } from '../../application/dto/actualizar-asignacion.dto';
import { AsignacionResponseDto } from '../../application/dto/asignacion-response.dto';
import { CerrarAsignacionDto } from '../../application/dto/cerrar-asignacion.dto';
import { ConflictoPlanificacionAsignacionResponseDto } from '../../application/dto/conflicto-planificacion-asignacion-response.dto';
import { CrearAsignacionDto } from '../../application/dto/crear-asignacion.dto';
import { MoverAsignacionDto } from '../../application/dto/mover-asignacion.dto';
import { ObtenerConflictoPlanificacionAsignacionQueryDto } from '../../application/dto/obtener-conflicto-planificacion-asignacion-query.dto';
import { ActualizarAsignacionUseCase } from '../../application/use-cases/actualizar-asignacion.use-case';
import { CerrarAsignacionUseCase } from '../../application/use-cases/cerrar-asignacion.use-case';
import { CrearAsignacionUseCase } from '../../application/use-cases/crear-asignacion.use-case';
import { MoverAsignacionUseCase } from '../../application/use-cases/mover-asignacion.use-case';
import { ObtenerConflictoPlanificacionAsignacionUseCase } from '../../application/use-cases/obtener-conflicto-planificacion-asignacion.use-case';
import { ListarAsignacionesQueryDto } from '../../application/dto/listar-asignaciones-query.dto';
import { ListarAsignacionesUseCase } from '../../application/use-cases/listar-asignaciones.use-case';

@Controller({
  path: 'asignaciones',
  version: '1',
})
export class AsignacionController {
  private readonly logger = new Logger(AsignacionController.name);

  constructor(
    private readonly listarAsignacionesUseCase: ListarAsignacionesUseCase,
    private readonly crearAsignacionUseCase: CrearAsignacionUseCase,
    private readonly actualizarAsignacionUseCase: ActualizarAsignacionUseCase,
    private readonly moverAsignacionUseCase: MoverAsignacionUseCase,
    private readonly cerrarAsignacionUseCase: CerrarAsignacionUseCase,
    private readonly obtenerConflictoPlanificacionAsignacionUseCase: ObtenerConflictoPlanificacionAsignacionUseCase,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Query() query: ListarAsignacionesQueryDto,
  ): Promise<CollectionResponse<AsignacionResponseDto>> {
    this.logger.log('Acceso a GET /v1/asignaciones.');

    return this.listarAsignacionesUseCase.execute(
      this.buildScopedQuery(actor, query),
    );
  }

  @Post()
  async crear(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: CrearAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    this.logger.log(
      `Acceso a POST /v1/asignaciones para personal=${body.idPersonal} por actor=${actor.username}.`,
    );

    return this.crearAsignacionUseCase.execute(actor, body);
  }

  @Put(':id')
  async actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    this.logger.log(
      `Acceso a PUT /v1/asignaciones/${id} por actor=${actor.username}.`,
    );

    return this.actualizarAsignacionUseCase.execute(actor, id, body);
  }

  @Post(':id/mover')
  async mover(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MoverAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    this.logger.log(
      `Acceso a POST /v1/asignaciones/${id}/mover por actor=${actor.username}.`,
    );

    return this.moverAsignacionUseCase.execute(actor, id, body);
  }

  @Get(':id/conflicto-planificacion')
  async obtenerConflictoPlanificacion(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ObtenerConflictoPlanificacionAsignacionQueryDto,
  ): Promise<ConflictoPlanificacionAsignacionResponseDto> {
    this.logger.log(
      `Acceso a GET /v1/asignaciones/${id}/conflicto-planificacion por actor=${actor.username}${query.id_servicio_destino ? ` con id_servicio_destino=${query.id_servicio_destino}` : ''}${query.id_departamento_destino ? ` con id_departamento_destino=${query.id_departamento_destino}` : ''}.`,
    );

    return this.obtenerConflictoPlanificacionAsignacionUseCase.execute(
      actor,
      id,
      {
        idServicio: query.id_servicio_destino,
        idDepartamento: query.id_departamento_destino,
      },
    );
  }

  @Post(':id/cerrar')
  async cerrar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CerrarAsignacionDto,
  ): Promise<AsignacionResponseDto> {
    this.logger.log(
      `Acceso a POST /v1/asignaciones/${id}/cerrar por actor=${actor.username}.`,
    );

    return this.cerrarAsignacionUseCase.execute(actor, id, body);
  }

  private buildScopedQuery(
    actor: UsuarioSesionResponseDto,
    query: ListarAsignacionesQueryDto,
  ): ListarAsignacionesQueryDto {
    if (hasSystemScope(actor)) {
      return query;
    }

    // Ningun actor sin alcance de sistema puede pedir historial: solo ve
    // asignaciones activas, sin importar el parametro que envie.
    const scoped = Object.assign(new ListarAsignacionesQueryDto(), query);
    scoped.activo = true;

    if (hasDepartamentoScope(actor)) {
      const allowedIds = actor.departamentosGestionables.map((item) => item.id);

      if (
        !scoped.idDepartamentoNormalizado ||
        !allowedIds.includes(scoped.idDepartamentoNormalizado)
      ) {
        scoped.idDepartamento = allowedIds[0];
      }

      return scoped;
    }

    if (hasServicioScope(actor)) {
      const allowedIds = actor.serviciosGestionables.map((item) => item.id);

      if (
        !scoped.idServicioNormalizado ||
        !allowedIds.includes(scoped.idServicioNormalizado)
      ) {
        scoped.idServicio = allowedIds[0];
      }

      // Un actor de alcance SERVICIO no tiene visibilidad departamental: se
      // ignora cualquier id_departamento recibido para evitar que combine
      // filtros y vea asignaciones de otros servicios del mismo departamento.
      scoped.idDepartamento = undefined;

      return scoped;
    }

    // Sin departamentos ni servicios gestionables no hay unidad valida sobre
    // la cual acotar: se devuelve un filtro imposible (id negativo, nunca
    // asignado) en vez de una lista sin acotar como antes. Debe ser un valor
    // truthy: el repositorio usa `if (filtro.idServicio)`, que descartaria un 0.
    scoped.idServicio = -1;
    scoped.idDepartamento = undefined;

    return scoped;
  }
}
