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
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import {
  canAccessDepartamento,
  canAccessServicio,
  canManageOrganizacionCatalog,
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
} from '../../../seguridad/application/helpers/actor-access.helpers';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { GuardarServicioDto } from '../../application/dto/guardar-servicio.dto';
import { ListarServiciosQueryDto } from '../../application/dto/listar-servicios-query.dto';
import { ServicioDetalleResponseDto } from '../../application/dto/servicio-detalle-response.dto';
import { ServicioResponseDto } from '../../application/dto/servicio-response.dto';
import { ObtenerServicioDetalleUseCase } from '../../application/use-cases/obtener-servicio-detalle.use-case';
import {
  ListarServiciosFiltroAlcance,
  ListarServiciosUseCase,
} from '../../application/use-cases/listar-servicios.use-case';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';

@Controller({
  path: 'servicios',
  version: '1',
})
export class ServicioController {
  constructor(
    private readonly listarServiciosUseCase: ListarServiciosUseCase,
    private readonly obtenerServicioDetalleUseCase: ObtenerServicioDetalleUseCase,
    private readonly servicioRepository: ServicioRepository,
  ) {}

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Query() query: ListarServiciosQueryDto,
  ): Promise<CollectionResponse<ServicioResponseDto>> {
    const filtroAlcance = this.resolveFiltroAlcance(actor);
    const data = await this.listarServiciosUseCase.execute(
      query,
      filtroAlcance,
    );

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
  ): Promise<ServicioDetalleResponseDto> {
    const detalle = await this.obtenerServicioDetalleUseCase.execute(id);

    if (!this.canAccessServicio(actor, detalle.id, detalle.departamento.id)) {
      throw new ForbiddenException('No tienes acceso al servicio solicitado.');
    }

    return detalle;
  }

  @Post()
  async crear(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: GuardarServicioDto,
  ): Promise<ServicioResponseDto> {
    this.assertCanManageServicios(actor);
    this.assertDepartamentoEnAlcance(actor, body.idDepartamento);
    return this.servicioRepository.crear(body);
  }

  @Put(':id')
  async actualizar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarServicioDto,
  ): Promise<ServicioResponseDto> {
    this.assertCanManageServicios(actor);
    await this.assertServicioEnAlcance(actor, id);
    this.assertDepartamentoEnAlcance(actor, body.idDepartamento);
    return this.servicioRepository.actualizar(id, body);
  }

  @Delete(':id')
  async desactivar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageServicios(actor);
    await this.assertServicioEnAlcance(actor, id);
    await this.servicioRepository.desactivar(id);
    return { ok: true };
  }

  @Post(':id/activar')
  async activar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageServicios(actor);
    await this.assertServicioEnAlcance(actor, id);
    await this.servicioRepository.activar(id);
    return { ok: true };
  }

  // Alcance empujado a la consulta (WHERE en el repositorio) en vez de
  // traer todos los servicios y filtrar el resultado en memoria — ver
  // docs/seguridad/estrategia-alcance-en-listados-y-consultas.md.
  private resolveFiltroAlcance(
    actor: UsuarioSesionResponseDto,
  ): ListarServiciosFiltroAlcance {
    if (hasSystemScope(actor)) {
      return {};
    }

    // Fuera de un alcance de sistema, una jefatura (de servicio o de
    // departamento) solo gestiona operacion vigente: los servicios inactivos
    // no aportan nada a su alcance, asi que se excluyen en la consulta en
    // vez de ofrecer un filtro de UI sin efecto real sobre el listado.
    if (hasDepartamentoScope(actor)) {
      return {
        idsDepartamentoPermitidos: actor.departamentosGestionables.map(
          (item) => item.id,
        ),
        soloActivos: true,
      };
    }

    if (hasServicioScope(actor)) {
      return {
        idsServicioPermitidos: actor.serviciosGestionables.map(
          (item) => item.id,
        ),
        soloActivos: true,
      };
    }

    return { idsServicioPermitidos: [] };
  }

  private canAccessServicio(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
    idDepartamento: number,
  ): boolean {
    return canAccessServicio(actor, idServicio, idDepartamento);
  }

  private assertCanManageServicios(actor: UsuarioSesionResponseDto): void {
    if (!canManageOrganizacionCatalog(actor)) {
      throw new ForbiddenException(
        'No tienes permisos para gestionar servicios.',
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

  private async assertServicioEnAlcance(
    actor: UsuarioSesionResponseDto,
    idServicio: number,
  ): Promise<void> {
    const servicio = await this.servicioRepository.obtenerPorId(idServicio);

    if (!servicio) {
      throw noEncontrado('servicio', idServicio, ServicioController.name);
    }

    if (!canAccessServicio(actor, servicio.id, servicio.idDepartamento)) {
      throw new ForbiddenException('No tienes acceso al servicio indicado.');
    }
  }
}
