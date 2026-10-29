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
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  canAccessDepartamento,
  canManageOrganizacionCatalog,
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
} from '../../../seguridad/application/helpers/actor-access.helpers';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { DepartamentoResponseDto } from '../../application/dto/departamento-response.dto';
import { GuardarDepartamentoDto } from '../../application/dto/guardar-departamento.dto';
import { ServicioResponseDto } from '../../application/dto/servicio-response.dto';
import { ListarDepartamentosUseCase } from '../../application/use-cases/listar-departamentos.use-case';
import { ListarServiciosPorDepartamentoUseCase } from '../../application/use-cases/listar-servicios-por-departamento.use-case';
import { DepartamentoRepository } from '../../domain/repositories/departamento.repository';

@Controller({
  path: 'departamentos',
  version: '1',
})
export class DepartamentoController {
  constructor(
    private readonly listarDepartamentosUseCase: ListarDepartamentosUseCase,
    private readonly listarServiciosPorDepartamentoUseCase: ListarServiciosPorDepartamentoUseCase,
    private readonly departamentoRepository: DepartamentoRepository,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
  ): Promise<CollectionResponse<DepartamentoResponseDto>> {
    const idsPermitidos = this.resolveIdsDepartamentoPermitidos(actor);
    const data = await this.listarDepartamentosUseCase.execute(idsPermitidos);

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get(':id/servicios')
  async listarServicios(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CollectionResponse<ServicioResponseDto>> {
    if (!this.canAccessDepartamento(actor, id)) {
      throw new ForbiddenException(
        'No tienes acceso al departamento solicitado.',
      );
    }

    const data = await this.listarServiciosPorDepartamentoUseCase.execute(id);

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
    @Body() body: GuardarDepartamentoDto,
  ): Promise<DepartamentoResponseDto> {
    this.assertCanManageOrganizacion(actor);
    return this.departamentoRepository.crear(body);
  }

  @Put(':id')
  async actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarDepartamentoDto,
  ): Promise<DepartamentoResponseDto> {
    this.assertCanManageOrganizacion(actor);
    this.assertDepartamentoEnAlcance(actor, id);
    return this.departamentoRepository.actualizar(id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageOrganizacion(actor);
    this.assertDepartamentoEnAlcance(actor, id);
    await this.departamentoRepository.desactivar(id);
    return { ok: true };
  }

  @Post(':id/activar')
  async activar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageOrganizacion(actor);
    this.assertDepartamentoEnAlcance(actor, id);
    await this.departamentoRepository.activar(id);
    return { ok: true };
  }

  // Alcance empujado a la consulta (WHERE id IN (...) en el repositorio) en
  // vez de traer todos los departamentos y filtrar el resultado en memoria —
  // ver docs/seguridad/estrategia-alcance-en-listados-y-consultas.md.
  // undefined = sin restriccion (alcance de sistema); [] = sin acceso a nada.
  private resolveIdsDepartamentoPermitidos(
    actor: UsuarioSesionResponseDto,
  ): number[] | undefined {
    if (hasSystemScope(actor)) {
      return undefined;
    }

    if (hasDepartamentoScope(actor)) {
      return actor.departamentosGestionables.map((item) => item.id);
    }

    if (hasServicioScope(actor)) {
      return Array.from(
        new Set(actor.serviciosGestionables.map((item) => item.idDepartamento)),
      );
    }

    return [];
  }

  private canAccessDepartamento(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
  ): boolean {
    return canAccessDepartamento(actor, idDepartamento);
  }

  private assertCanManageOrganizacion(actor: UsuarioSesionResponseDto): void {
    if (!canManageOrganizacionCatalog(actor)) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar departamentos.',
      );
    }
  }

  private assertDepartamentoEnAlcance(
    actor: UsuarioSesionResponseDto,
    idDepartamento: number,
  ): void {
    if (!canAccessDepartamento(actor, idDepartamento)) {
      throw new ForbiddenException(
        'No tienes acceso al departamento indicado.',
      );
    }
  }
}
