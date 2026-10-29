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
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import { ActualizarTipoContratoDto } from '../../application/dto/actualizar-tipo-contrato.dto';
import { CargaHorariaResponseDto } from '../../application/dto/carga-horaria-response.dto';
import { CrearTipoContratoDto } from '../../application/dto/crear-tipo-contrato.dto';
import { GuardarCargaHorariaDto } from '../../application/dto/guardar-carga-horaria.dto';
import { GuardarNivelCargoDto } from '../../application/dto/guardar-nivel-cargo.dto';
import { NivelCargoResponseDto } from '../../application/dto/nivel-cargo-response.dto';
import { RolFuncionalResponseDto } from '../../application/dto/rol-funcional-response.dto';
import { TipoContratoResponseDto } from '../../application/dto/tipo-contrato-response.dto';
import { ActualizarTipoContratoUseCase } from '../../application/use-cases/actualizar-tipo-contrato.use-case';
import { CambiarEstadoTipoContratoUseCase } from '../../application/use-cases/cambiar-estado-tipo-contrato.use-case';
import { CrearTipoContratoUseCase } from '../../application/use-cases/crear-tipo-contrato.use-case';
import { ListarCargasHorariasUseCase } from '../../application/use-cases/listar-cargas-horarias.use-case';
import { ListarNivelesCargoUseCase } from '../../application/use-cases/listar-niveles-cargo.use-case';
import { ListarRolesFuncionalesUseCase } from '../../application/use-cases/listar-roles-funcionales.use-case';
import { ListarTiposContratoUseCase } from '../../application/use-cases/listar-tipos-contrato.use-case';
import { PersonalRepository } from '../../domain/repositories/personal.repository';

@Controller({
  version: '1',
})
export class CatalogoPersonalController {
  constructor(
    private readonly listarNivelesCargoUseCase: ListarNivelesCargoUseCase,
    private readonly listarCargasHorariasUseCase: ListarCargasHorariasUseCase,
    private readonly listarTiposContratoUseCase: ListarTiposContratoUseCase,
    private readonly crearTipoContratoUseCase: CrearTipoContratoUseCase,
    private readonly actualizarTipoContratoUseCase: ActualizarTipoContratoUseCase,
    private readonly cambiarEstadoTipoContratoUseCase: CambiarEstadoTipoContratoUseCase,
    private readonly listarRolesFuncionalesUseCase: ListarRolesFuncionalesUseCase,
    private readonly personalRepository: PersonalRepository,
  ) {}

  @Get('niveles-cargo')
  async listarNivelesCargo(): Promise<
    CollectionResponse<NivelCargoResponseDto>
  > {
    const data = await this.listarNivelesCargoUseCase.execute();

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post('niveles-cargo')
  crearNivelCargo(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: GuardarNivelCargoDto,
  ): Promise<NivelCargoResponseDto> {
    this.assertCanManageCatalogs(actor);
    return this.personalRepository.crearNivelCargo(body);
  }

  @Put('niveles-cargo/:id')
  actualizarNivelCargo(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarNivelCargoDto,
  ): Promise<NivelCargoResponseDto> {
    this.assertCanManageCatalogs(actor);
    return this.personalRepository.actualizarNivelCargo(id, body);
  }

  @Delete('niveles-cargo/:id')
  async desactivarNivelCargo(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageCatalogs(actor);
    await this.personalRepository.desactivarNivelCargo(id);
    return { ok: true };
  }

  @Post('niveles-cargo/:id/activar')
  async activarNivelCargo(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageCatalogs(actor);
    await this.personalRepository.activarNivelCargo(id);
    return { ok: true };
  }

  @Get('cargas-horarias')
  async listarCargasHorarias(): Promise<
    CollectionResponse<CargaHorariaResponseDto>
  > {
    const data = await this.listarCargasHorariasUseCase.execute();

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post('cargas-horarias')
  crearCargaHoraria(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: GuardarCargaHorariaDto,
  ): Promise<CargaHorariaResponseDto> {
    this.assertCanManageCatalogs(actor);
    return this.personalRepository.crearCargaHoraria(body);
  }

  @Put('cargas-horarias/:id')
  actualizarCargaHoraria(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: GuardarCargaHorariaDto,
  ): Promise<CargaHorariaResponseDto> {
    this.assertCanManageCatalogs(actor);
    return this.personalRepository.actualizarCargaHoraria(id, body);
  }

  @Delete('cargas-horarias/:id')
  async desactivarCargaHoraria(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageCatalogs(actor);
    await this.personalRepository.desactivarCargaHoraria(id);
    return { ok: true };
  }

  @Post('cargas-horarias/:id/activar')
  async activarCargaHoraria(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageCatalogs(actor);
    await this.personalRepository.activarCargaHoraria(id);
    return { ok: true };
  }

  @Get('tipos-contrato')
  async listarTiposContrato(): Promise<
    CollectionResponse<TipoContratoResponseDto>
  > {
    const data = await this.listarTiposContratoUseCase.execute();

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post('tipos-contrato')
  crearTipoContrato(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: CrearTipoContratoDto,
  ): Promise<TipoContratoResponseDto> {
    this.assertCanManageCatalogs(actor);
    return this.crearTipoContratoUseCase.execute(body, actor.username);
  }

  @Put('tipos-contrato/:id')
  actualizarTipoContrato(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarTipoContratoDto,
  ): Promise<TipoContratoResponseDto> {
    this.assertCanManageCatalogs(actor);
    return this.actualizarTipoContratoUseCase.execute(id, body, actor.username);
  }

  @Delete('tipos-contrato/:id')
  async desactivarTipoContrato(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageCatalogs(actor);
    await this.cambiarEstadoTipoContratoUseCase.execute(
      id,
      false,
      actor.username,
    );
    return { ok: true };
  }

  @Post('tipos-contrato/:id/activar')
  async activarTipoContrato(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ ok: true }> {
    this.assertCanManageCatalogs(actor);
    await this.cambiarEstadoTipoContratoUseCase.execute(
      id,
      true,
      actor.username,
    );
    return { ok: true };
  }

  @Get('roles-funcionales')
  async listarRolesFuncionales(): Promise<
    CollectionResponse<RolFuncionalResponseDto>
  > {
    const data = await this.listarRolesFuncionalesUseCase.execute();

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get('asignaciones/jefatura-activa')
  async obtenerJefaturaActiva(
    @Query('idServicio') idServicioStr?: string,
    @Query('idDepartamento') idDepartamentoStr?: string,
  ): Promise<{
    idAsignacion: number;
    idPersonal: number;
    nombreCompleto: string;
  } | null> {
    const idServicio = idServicioStr ? parseInt(idServicioStr, 10) : null;
    const idDepartamento = idDepartamentoStr
      ? parseInt(idDepartamentoStr, 10)
      : null;

    const resultado =
      await this.personalRepository.obtenerJefaturaActivaEnUnidad({
        idServicio: idServicio ?? undefined,
        idDepartamento: idDepartamento ?? undefined,
      });

    if (!resultado) return null;

    return {
      idAsignacion: resultado.id,
      idPersonal: resultado.idPersonal,
      nombreCompleto: resultado.nombreCompleto,
    };
  }

  private assertCanManageCatalogs(actor: UsuarioSesionResponseDto): void {
    if (!actor.permisos.puedeGestionarPersonal) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar los catalogos de personal.',
      );
    }
  }
}
