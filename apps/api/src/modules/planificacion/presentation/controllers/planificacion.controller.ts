import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Header,
  Logger,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  Put,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { CollectionResponse } from '../../../../common/contracts/collection-response';
import { ActualizarRolTurnoPlanificacionDto } from '../../application/dto/actualizar-rol-turno-planificacion.dto';
import { AplicarCeldaMatrizPlanificacionDto } from '../../application/dto/aplicar-celda-matriz-planificacion.dto';
import { AplicarCeldaMatrizLotePlanificacionDto } from '../../application/dto/aplicar-celda-matriz-lote-planificacion.dto';
import { ActualizarObservacionMensualPlanificacionDto } from '../../application/dto/actualizar-observacion-mensual-planificacion.dto';
import { CambiarEstadoPlanificacionDto } from '../../application/dto/cambiar-estado-planificacion.dto';
import { CerrarPlanificacionDto } from '../../application/dto/cerrar-planificacion.dto';
import { CrearBorradorPlanificacionDto } from '../../application/dto/crear-borrador-planificacion.dto';
import { CrearRolTurnoPlanificacionDto } from '../../application/dto/crear-rol-turno-planificacion.dto';
import { EliminarRolTurnoPlanificacionQueryDto } from '../../application/dto/eliminar-rol-turno-planificacion-query.dto';
import { DuplicarPlanificacionDto } from '../../application/dto/duplicar-planificacion.dto';
import { ExportarPlanificacionQueryDto } from '../../application/dto/exportar-planificacion-query.dto';
import { ExportarPlanificacionesLoteDto } from '../../application/dto/exportar-planificaciones-lote.dto';
import { ListarPlanificacionesQueryDto } from '../../application/dto/listar-planificaciones-query.dto';
import { ListarResumenCalendarioPorPlanificacionQueryDto } from '../../application/dto/listar-resumen-calendario-por-planificacion-query.dto';
import { ListarResumenPersonalPorPlanificacionQueryDto } from '../../application/dto/listar-resumen-personal-por-planificacion-query.dto';
import { ListarRolTurnosPorPlanificacionQueryDto } from '../../application/dto/listar-rol-turnos-por-planificacion-query.dto';
import { MatrizMensualPlanificacionResponseDto } from '../../application/dto/matriz-mensual-planificacion-response.dto';
import { ConfiguracionOperativaPlanificacionResponseDto } from '../../application/dto/configuracion-operativa-planificacion-response.dto';
import { CeldaMatrizPlanificacionResponseDto } from '../../application/dto/celda-matriz-planificacion-response.dto';
import { ObservacionMensualPlanificacionResponseDto } from '../../application/dto/observacion-mensual-planificacion-response.dto';
import { PlanificacionResponseDto } from '../../application/dto/planificacion-response.dto';
import { PublicarPlanificacionDto } from '../../application/dto/publicar-planificacion.dto';
import { ResumenPlanificacionCalendarioResponseDto } from '../../application/dto/resumen-planificacion-calendario-response.dto';
import { ResumenPlanificacionPersonalResponseDto } from '../../application/dto/resumen-planificacion-personal-response.dto';
import { SesionEdicionPlanificacionResponseDto } from '../../application/dto/sesion-edicion-planificacion-response.dto';
import { ActualizarRolTurnoPlanificacionUseCase } from '../../application/use-cases/actualizar-rol-turno-planificacion.use-case';
import { AplicarCeldaMatrizPlanificacionUseCase } from '../../application/use-cases/aplicar-celda-matriz-planificacion.use-case';
import { AplicarCeldaMatrizLotePlanificacionUseCase } from '../../application/use-cases/aplicar-celda-matriz-lote-planificacion.use-case';
import { ActualizarObservacionMensualPlanificacionUseCase } from '../../application/use-cases/actualizar-observacion-mensual-planificacion.use-case';
import { CambiarEstadoPlanificacionUseCase } from '../../application/use-cases/cambiar-estado-planificacion.use-case';
import { CerrarPlanificacionUseCase } from '../../application/use-cases/cerrar-planificacion.use-case';
import { CrearBorradorPlanificacionUseCase } from '../../application/use-cases/crear-borrador-planificacion.use-case';
import { CrearRolTurnoPlanificacionUseCase } from '../../application/use-cases/crear-rol-turno-planificacion.use-case';
import { EliminarRolTurnoPlanificacionUseCase } from '../../application/use-cases/eliminar-rol-turno-planificacion.use-case';
import { ExportarPlanificacionExcelUseCase } from '../../application/use-cases/exportar-planificacion-excel.use-case';
import { ExportarPlanificacionPdfUseCase } from '../../application/use-cases/exportar-planificacion-pdf.use-case';
import { ExportarPlanificacionesExcelUseCase } from '../../application/use-cases/exportar-planificaciones-excel.use-case';
import { ExportarPlanificacionesPdfUseCase } from '../../application/use-cases/exportar-planificaciones-pdf.use-case';
import { ExportarPlanificacionPreviewUseCase } from '../../application/use-cases/exportar-planificacion-preview.use-case';
import { GenerarReportePersonalUseCase } from '../../application/use-cases/generar-reporte-personal.use-case';
import { ExportarReportePersonalPdfUseCase } from '../../application/use-cases/exportar-reporte-personal-pdf.use-case';
import { DuplicarPlanificacionUseCase } from '../../application/use-cases/duplicar-planificacion.use-case';
import { AsignacionPlanificacionDisponibleResponseDto } from '../../application/dto/asignacion-planificacion-disponible-response.dto';
import { RolTurnoPlanificacionResponseDto } from '../../application/dto/rol-turno-planificacion-response.dto';
import { ListarPlanificacionesUseCase } from '../../application/use-cases/listar-planificaciones.use-case';
import { ListarAsignacionesDisponiblesPorPlanificacionUseCase } from '../../application/use-cases/listar-asignaciones-disponibles-por-planificacion.use-case';
import { ListarResumenCalendarioPorPlanificacionUseCase } from '../../application/use-cases/listar-resumen-calendario-por-planificacion.use-case';
import { ListarResumenPersonalPorPlanificacionUseCase } from '../../application/use-cases/listar-resumen-personal-por-planificacion.use-case';
import { ListarRolTurnosPorPlanificacionUseCase } from '../../application/use-cases/listar-rol-turnos-por-planificacion.use-case';
import { ObtenerMatrizMensualPlanificacionUseCase } from '../../application/use-cases/obtener-matriz-mensual-planificacion.use-case';
import { ObtenerConfiguracionOperativaPlanificacionUseCase } from '../../application/use-cases/obtener-configuracion-operativa-planificacion.use-case';
import { ObtenerPlanificacionUseCase } from '../../application/use-cases/obtener-planificacion.use-case';
import { PublicarPlanificacionUseCase } from '../../application/use-cases/publicar-planificacion.use-case';
import { EliminarPlanificacionUseCase } from '../../application/use-cases/eliminar-planificacion.use-case';
import { ObtenerSesionEdicionPlanificacionUseCase } from '../../application/use-cases/obtener-sesion-edicion-planificacion.use-case';
import { RegistrarLatidoSesionEdicionPlanificacionUseCase } from '../../application/use-cases/registrar-latido-sesion-edicion-planificacion.use-case';
import { TomarControlSesionEdicionPlanificacionUseCase } from '../../application/use-cases/tomar-control-sesion-edicion-planificacion.use-case';
import { LiberarSesionEdicionPlanificacionUseCase } from '../../application/use-cases/liberar-sesion-edicion-planificacion.use-case';
import { PlanificacionAccessPolicyService } from '../../application/use-cases/helpers/planificacion-access-policy.service';
import { CurrentActor } from '../../../seguridad/presentation/decorators/current-actor.decorator';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { hasSystemScope } from '../../../seguridad/application/helpers/actor-access.helpers';
import {
  resolveEstiloExportacion,
  resolveFormatoExportacion,
  resolveModoExportacion,
} from '../../application/services/export/turno-export-code.mapper';

@Controller({
  path: 'planificaciones',
  version: '1',
})
export class PlanificacionController {
  private readonly logger = new Logger(PlanificacionController.name);

  constructor(
    private readonly listarPlanificacionesUseCase: ListarPlanificacionesUseCase,
    private readonly crearBorradorPlanificacionUseCase: CrearBorradorPlanificacionUseCase,
    private readonly eliminarPlanificacionUseCase: EliminarPlanificacionUseCase,
    private readonly cambiarEstadoPlanificacionUseCase: CambiarEstadoPlanificacionUseCase,
    private readonly duplicarPlanificacionUseCase: DuplicarPlanificacionUseCase,
    private readonly obtenerPlanificacionUseCase: ObtenerPlanificacionUseCase,
    private readonly listarAsignacionesDisponiblesPorPlanificacionUseCase: ListarAsignacionesDisponiblesPorPlanificacionUseCase,
    private readonly listarRolTurnosPorPlanificacionUseCase: ListarRolTurnosPorPlanificacionUseCase,
    private readonly crearRolTurnoPlanificacionUseCase: CrearRolTurnoPlanificacionUseCase,
    private readonly actualizarRolTurnoPlanificacionUseCase: ActualizarRolTurnoPlanificacionUseCase,
    private readonly aplicarCeldaMatrizPlanificacionUseCase: AplicarCeldaMatrizPlanificacionUseCase,
    private readonly aplicarCeldaMatrizLotePlanificacionUseCase: AplicarCeldaMatrizLotePlanificacionUseCase,
    private readonly actualizarObservacionMensualPlanificacionUseCase: ActualizarObservacionMensualPlanificacionUseCase,
    private readonly eliminarRolTurnoPlanificacionUseCase: EliminarRolTurnoPlanificacionUseCase,
    private readonly exportarPlanificacionExcelUseCase: ExportarPlanificacionExcelUseCase,
    private readonly exportarPlanificacionPdfUseCase: ExportarPlanificacionPdfUseCase,
    private readonly exportarPlanificacionesExcelUseCase: ExportarPlanificacionesExcelUseCase,
    private readonly exportarPlanificacionesPdfUseCase: ExportarPlanificacionesPdfUseCase,
    private readonly exportarPlanificacionPreviewUseCase: ExportarPlanificacionPreviewUseCase,
    private readonly listarResumenPersonalPorPlanificacionUseCase: ListarResumenPersonalPorPlanificacionUseCase,
    private readonly listarResumenCalendarioPorPlanificacionUseCase: ListarResumenCalendarioPorPlanificacionUseCase,
    private readonly obtenerMatrizMensualPlanificacionUseCase: ObtenerMatrizMensualPlanificacionUseCase,
    private readonly obtenerConfiguracionOperativaPlanificacionUseCase: ObtenerConfiguracionOperativaPlanificacionUseCase,
    private readonly publicarPlanificacionUseCase: PublicarPlanificacionUseCase,
    private readonly cerrarPlanificacionUseCase: CerrarPlanificacionUseCase,
    private readonly planificacionAccessPolicyService: PlanificacionAccessPolicyService,
    private readonly generarReportePersonalUseCase: GenerarReportePersonalUseCase,
    private readonly exportarReportePersonalPdfUseCase: ExportarReportePersonalPdfUseCase,
    private readonly obtenerSesionEdicionPlanificacionUseCase: ObtenerSesionEdicionPlanificacionUseCase,
    private readonly registrarLatidoSesionEdicionPlanificacionUseCase: RegistrarLatidoSesionEdicionPlanificacionUseCase,
    private readonly tomarControlSesionEdicionPlanificacionUseCase: TomarControlSesionEdicionPlanificacionUseCase,
    private readonly liberarSesionEdicionPlanificacionUseCase: LiberarSesionEdicionPlanificacionUseCase,
  ) {}

  @Post()
  async crearBorrador(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: CrearBorradorPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    this.planificacionAccessPolicyService.assertPuedeCrearPlanificacion(
      actor,
      body.idServicio,
      body.idDepartamento,
    );
    this.logger.log(
      `Acceso a POST /v1/planificaciones para actor=${actor.username}, servicio=${body.idServicio}, anio=${body.anio}, mes=${body.mes}.`,
    );
    return this.crearBorradorPlanificacionUseCase.execute({
      ...body,
      idUsuarioCreador: actor.id,
    });
  }

  @Get()
  async listar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Query() query: ListarPlanificacionesQueryDto,
  ): Promise<CollectionResponse<PlanificacionResponseDto>> {
    this.logger.log(
      `Acceso a GET /v1/planificaciones${query.id_servicio ? ` con id_servicio=${query.id_servicio}` : ''}${query.anio ? ` con anio=${query.anio}` : ''}${query.mes ? ` con mes=${query.mes}` : ''}${query.estado ? ` con estado=${query.estado}` : ''}.`,
    );

    const filtro = this.planificacionAccessPolicyService.scopeListado(
      actor,
      query,
    );

    return this.listarPlanificacionesUseCase.execute(filtro);
  }

  @Get(':id')
  async obtener(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'ver la planificacion',
    );
    this.logger.log(`Acceso a GET /v1/planificaciones/${id}.`);
    return this.obtenerPlanificacionUseCase.execute(id);
  }

  @Delete(':id')
  @HttpCode(204)
  async eliminar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.planificacionAccessPolicyService.assertPuedeEliminarPlanificacion(
      actor,
      id,
    );
    await this.eliminarPlanificacionUseCase.execute(id);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEstadoPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeCambiarEstadoPlanificacion(
      actor,
      id,
      body.estado,
    );
    return this.cambiarEstadoPlanificacionUseCase.execute(id, body, actor.id);
  }

  @Post(':id/duplicar')
  async duplicar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DuplicarPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeDuplicarPlanificacion(
      actor,
      id,
    );
    return this.duplicarPlanificacionUseCase.execute(id, body, actor.id);
  }

  @Get(':id/asignaciones-disponibles')
  async listarAsignacionesDisponibles(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CollectionResponse<AsignacionPlanificacionDisponibleResponseDto>> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar asignaciones disponibles',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/asignaciones-disponibles.`,
    );

    const data =
      await this.listarAsignacionesDisponiblesPorPlanificacionUseCase.execute(
        id,
      );

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get(':id/rol-turnos')
  async listarRolTurnos(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListarRolTurnosPorPlanificacionQueryDto,
  ): Promise<CollectionResponse<RolTurnoPlanificacionResponseDto>> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar los registros de la matriz',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/rol-turnos${query.id_asignacion_personal ? ` con id_asignacion_personal=${query.id_asignacion_personal}` : ''}${query.id_calendario ? ` con id_calendario=${query.id_calendario}` : ''}.`,
    );

    const data = await this.listarRolTurnosPorPlanificacionUseCase.execute(
      id,
      query,
    );

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Post(':id/rol-turnos')
  async crearRolTurno(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CrearRolTurnoPlanificacionDto,
  ): Promise<RolTurnoPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeEditarContenidoPlanificacion(
      actor,
      id,
      'crear registros de la matriz',
    );
    this.logger.log(
      `Acceso a POST /v1/planificaciones/${id}/rol-turnos para asignacion=${body.idAsignacionPersonal}, calendario=${body.idCalendario}, secuencia=${body.secuenciaDia}.`,
    );
    return this.crearRolTurnoPlanificacionUseCase.execute(id, {
      ...body,
      idUsuarioOperacion: actor.id,
    });
  }

  @Patch(':id/rol-turnos/:idRolTurno')
  async actualizarRolTurno(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('idRolTurno', ParseIntPipe) idRolTurno: number,
    @Body() body: ActualizarRolTurnoPlanificacionDto,
  ): Promise<RolTurnoPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeEditarContenidoPlanificacion(
      actor,
      id,
      'ajustar registros de la matriz',
    );
    this.logger.log(
      `Acceso a PATCH /v1/planificaciones/${id}/rol-turnos/${idRolTurno}.`,
    );
    return this.actualizarRolTurnoPlanificacionUseCase.execute(id, idRolTurno, {
      ...body,
      idUsuarioOperacion: actor.id,
    });
  }

  @Delete(':id/rol-turnos/:idRolTurno')
  @HttpCode(204)
  async eliminarRolTurno(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('idRolTurno', ParseIntPipe) idRolTurno: number,
    @Query() query: EliminarRolTurnoPlanificacionQueryDto,
  ): Promise<void> {
    await this.planificacionAccessPolicyService.assertPuedeEditarContenidoPlanificacion(
      actor,
      id,
      'eliminar registros de la matriz',
    );
    this.logger.log(
      `Acceso a DELETE /v1/planificaciones/${id}/rol-turnos/${idRolTurno} por actor=${actor.username}${query.id_usuario_operacion ? ` (query id_usuario_operacion=${query.id_usuario_operacion}, ignorado a favor de la sesion activa)` : ''}.`,
    );
    await this.eliminarRolTurnoPlanificacionUseCase.execute(
      id,
      idRolTurno,
      actor.id,
    );
  }

  @Put(':id/matriz/celdas')
  async aplicarCeldaMatriz(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AplicarCeldaMatrizPlanificacionDto,
  ): Promise<CeldaMatrizPlanificacionResponseDto> {
    const permiteAjusteAprobada =
      await this.planificacionAccessPolicyService.assertPuedeEditarCeldaMatriz(
        actor,
        id,
        body.idAsignacionPersonal,
        body.idCalendario,
        'editar rapidamente la matriz mensual',
      );
    this.logger.log(
      `Acceso a PUT /v1/planificaciones/${id}/matriz/celdas para asignacion=${body.idAsignacionPersonal}, calendario=${body.idCalendario}, limpiar=${body.limpiar === true}.`,
    );
    return this.aplicarCeldaMatrizPlanificacionUseCase.execute(
      id,
      body,
      actor.id,
      permiteAjusteAprobada,
    );
  }

  @Put(':id/matriz/celdas/lote')
  async aplicarCeldaMatrizLote(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AplicarCeldaMatrizLotePlanificacionDto,
  ): Promise<CeldaMatrizPlanificacionResponseDto[]> {
    for (const celda of body.celdas) {
      await this.planificacionAccessPolicyService.assertPuedeEditarCeldaMatriz(
        actor,
        id,
        celda.idAsignacionPersonal,
        celda.idCalendario,
        'editar rapidamente la matriz mensual',
      );
    }
    this.logger.log(
      `Acceso a PUT /v1/planificaciones/${id}/matriz/celdas/lote con ${body.celdas.length} celda(s).`,
    );
    return this.aplicarCeldaMatrizLotePlanificacionUseCase.execute(
      id,
      body.celdas,
      actor.id,
      hasSystemScope(actor),
    );
  }

  @Get(':id/sesion-edicion')
  async obtenerSesionEdicion(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SesionEdicionPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar la sesion de edicion',
    );
    return this.obtenerSesionEdicionPlanificacionUseCase.execute(actor, id);
  }

  @Post(':id/sesion-edicion/latido')
  async registrarLatidoSesionEdicion(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SesionEdicionPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeEditarContenidoPlanificacion(
      actor,
      id,
      'editar la planificacion',
    );
    return this.registrarLatidoSesionEdicionPlanificacionUseCase.execute(
      actor,
      id,
    );
  }

  @Post(':id/sesion-edicion/tomar-control')
  async tomarControlSesionEdicion(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SesionEdicionPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeEditarContenidoPlanificacion(
      actor,
      id,
      'tomar el control de edicion',
    );
    return this.tomarControlSesionEdicionPlanificacionUseCase.execute(
      actor,
      id,
    );
  }

  @Delete(':id/sesion-edicion')
  @HttpCode(204)
  async liberarSesionEdicion(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'liberar la sesion de edicion',
    );
    await this.liberarSesionEdicionPlanificacionUseCase.execute(actor, id);
  }

  @Delete('sesiones-edicion/mias')
  @HttpCode(204)
  async liberarTodasMisSesionesEdicion(
    @CurrentActor() actor: UsuarioSesionResponseDto,
  ): Promise<void> {
    await this.liberarSesionEdicionPlanificacionUseCase.executeTodas(actor);
  }

  @Get(':id/resumen-personal')
  async listarResumenPersonal(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListarResumenPersonalPorPlanificacionQueryDto,
  ): Promise<CollectionResponse<ResumenPlanificacionPersonalResponseDto>> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar el resumen de personal',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/resumen-personal${query.id_asignacion_personal ? ` con id_asignacion_personal=${query.id_asignacion_personal}` : ''}.`,
    );

    const data =
      await this.listarResumenPersonalPorPlanificacionUseCase.execute(
        id,
        query,
      );

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get(':id/resumen-calendario')
  async listarResumenCalendario(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListarResumenCalendarioPorPlanificacionQueryDto,
  ): Promise<CollectionResponse<ResumenPlanificacionCalendarioResponseDto>> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar el resumen del calendario',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/resumen-calendario${query.id_calendario ? ` con id_calendario=${query.id_calendario}` : ''}.`,
    );

    const data =
      await this.listarResumenCalendarioPorPlanificacionUseCase.execute(
        id,
        query,
      );

    return {
      data,
      meta: {
        total: data.length,
      },
    };
  }

  @Get(':id/matriz-mensual')
  async obtenerMatrizMensual(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query('vista') vista?: string,
  ): Promise<MatrizMensualPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar la matriz mensual',
    );
    if (vista?.toUpperCase() === 'ORIGINAL' && !hasSystemScope(actor)) {
      throw new ForbiddenException(
        'No tienes permiso para consultar la vista original de la planificacion.',
      );
    }
    this.logger.log(`Acceso a GET /v1/planificaciones/${id}/matriz-mensual.`);
    return this.obtenerMatrizMensualPlanificacionUseCase.execute(
      id,
      vista?.toUpperCase() === 'ORIGINAL' ? 'ORIGINAL' : 'EFECTIVA',
    );
  }

  @Get(':id/configuracion-operativa')
  async obtenerConfiguracionOperativa(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ConfiguracionOperativaPlanificacionResponseDto> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'consultar la configuracion operativa',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/configuracion-operativa.`,
    );
    return this.obtenerConfiguracionOperativaPlanificacionUseCase.execute(id);
  }

  @Put(':id/observaciones-mensuales/:idAsignacionPersonal')
  async actualizarObservacionMensual(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('idAsignacionPersonal', ParseIntPipe) idAsignacionPersonal: number,
    @Body() body: ActualizarObservacionMensualPlanificacionDto,
  ): Promise<ObservacionMensualPlanificacionResponseDto | null> {
    await this.planificacionAccessPolicyService.assertPuedeEditarContenidoPlanificacion(
      actor,
      id,
      'actualizar observaciones mensuales',
    );
    this.logger.log(
      `Acceso a PUT /v1/planificaciones/${id}/observaciones-mensuales/${idAsignacionPersonal}.`,
    );
    return this.actualizarObservacionMensualPlanificacionUseCase.execute(
      id,
      idAsignacionPersonal,
      body,
      actor.id,
    );
  }

  @Get(':id/export/excel')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportarExcel(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ExportarPlanificacionQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'exportar la planificacion a Excel',
    );
    const modo = resolveModoExportacion(query.modo);
    const estilo = resolveEstiloExportacion(query.estilo);
    const formato = resolveFormatoExportacion(query.formato);
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/export/excel con modo=${modo}, estilo=${estilo} y formato=${formato}.`,
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="planificacion-${id}.xlsx"`,
    );
    const buffer = await this.exportarPlanificacionExcelUseCase.execute(
      id,
      modo,
      estilo,
      formato,
    );
    return new StreamableFile(buffer);
  }

  @Get(':id/export/pdf')
  @Header('Content-Type', 'application/pdf')
  async exportarPdf(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ExportarPlanificacionQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'exportar la planificacion a PDF',
    );
    const modo = resolveModoExportacion(query.modo);
    const estilo = resolveEstiloExportacion(query.estilo);
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/export/pdf con modo=${modo} y estilo=${estilo}.`,
    );
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="planificacion-${id}.pdf"`,
    );
    const buffer = await this.exportarPlanificacionPdfUseCase.execute(
      id,
      modo,
      estilo,
    );
    return new StreamableFile(buffer);
  }

  @Post('export/excel-lote')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  async exportarExcelLote(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: ExportarPlanificacionesLoteDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificaciones(
      actor,
      body.idsPlanificacion,
      'exportar un lote de planificaciones a Excel',
    );
    const modo = resolveModoExportacion(body.modo);
    const estilo = resolveEstiloExportacion(body.estilo);
    const formato = resolveFormatoExportacion(body.formato);
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="planificaciones-lote.xlsx"',
    );
    const buffer = await this.exportarPlanificacionesExcelUseCase.execute(
      body.idsPlanificacion,
      modo,
      estilo,
      formato,
    );
    return new StreamableFile(buffer);
  }

  @Post('export/pdf-lote')
  @Header('Content-Type', 'application/pdf')
  async exportarPdfLote(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Body() body: ExportarPlanificacionesLoteDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificaciones(
      actor,
      body.idsPlanificacion,
      'exportar un lote de planificaciones a PDF',
    );
    const modo = resolveModoExportacion(body.modo);
    const estilo = resolveEstiloExportacion(body.estilo);
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="planificaciones-lote.pdf"',
    );
    const buffer = await this.exportarPlanificacionesPdfUseCase.execute(
      body.idsPlanificacion,
      modo,
      estilo,
    );
    return new StreamableFile(buffer);
  }

  @Get(':id/export/preview')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async exportarPreview(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ExportarPlanificacionQueryDto,
  ): Promise<string> {
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'previsualizar la planificacion',
    );
    const modo = resolveModoExportacion(query.modo);
    const estilo = resolveEstiloExportacion(query.estilo);
    const formato = resolveFormatoExportacion(query.formato);
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/export/preview con modo=${modo}, estilo=${estilo} y formato=${formato}.`,
    );
    return this.exportarPlanificacionPreviewUseCase.execute(
      id,
      modo,
      estilo,
      formato,
    );
  }

  @Get(':id/reportes/personal/:idAsignacion')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async reportePersonal(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('idAsignacion', ParseIntPipe) idAsignacion: number,
  ): Promise<string> {
    this.assertPuedeVerReportes(actor);
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'ver el reporte de personal',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/reportes/personal/${idAsignacion}.`,
    );
    return this.generarReportePersonalUseCase.execute(id, idAsignacion);
  }

  @Get(':id/reportes/personal/:idAsignacion/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header(
    'Content-Disposition',
    'attachment; filename="reporte-rol-personal.pdf"',
  )
  async reportePersonalPdf(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Param('idAsignacion', ParseIntPipe) idAsignacion: number,
  ): Promise<StreamableFile> {
    this.assertPuedeVerReportes(actor);
    await this.planificacionAccessPolicyService.assertPuedeGestionarPlanificacion(
      actor,
      id,
      'exportar el reporte de personal a PDF',
    );
    this.logger.log(
      `Acceso a GET /v1/planificaciones/${id}/reportes/personal/${idAsignacion}/pdf.`,
    );
    const buffer = await this.exportarReportePersonalPdfUseCase.execute(
      id,
      idAsignacion,
    );
    return new StreamableFile(buffer);
  }

  @Post(':id/publicar')
  @HttpCode(200)
  async publicar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PublicarPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    // Atajo de conveniencia sobre la misma transicion que PATCH /:id/estado
    // con estado=APROBADA: debe exigir la misma matriz de roles
    // (assertPuedeCambiarEstadoPlanificacion), no solo el alcance generico —
    // de lo contrario un JEFE_SERVICIO podia saltarse REVISION llamando este
    // endpoint directo.
    await this.planificacionAccessPolicyService.assertPuedeCambiarEstadoPlanificacion(
      actor,
      id,
      'APROBADA',
    );
    this.logger.log(`Acceso a POST /v1/planificaciones/${id}/publicar.`);
    return this.publicarPlanificacionUseCase.execute(id, {
      ...body,
      idUsuarioPublicador: actor.id,
    });
  }

  @Post(':id/cerrar')
  @HttpCode(200)
  async cerrar(
    @CurrentActor() actor: UsuarioSesionResponseDto,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CerrarPlanificacionDto,
  ): Promise<PlanificacionResponseDto> {
    // Mismo criterio que publicar(): atajo sobre PATCH /:id/estado con
    // estado=CERRADA, debe exigir la misma matriz de roles (solo jefatura de
    // departamento puede cerrar), no solo el alcance generico.
    await this.planificacionAccessPolicyService.assertPuedeCambiarEstadoPlanificacion(
      actor,
      id,
      'CERRADA',
    );
    this.logger.log(`Acceso a POST /v1/planificaciones/${id}/cerrar.`);
    return this.cerrarPlanificacionUseCase.execute(id, {
      ...body,
      idUsuarioCierre: actor.id,
    });
  }

  private assertPuedeVerReportes(actor: UsuarioSesionResponseDto): void {
    if (!actor.permisos.puedeVerReportes) {
      throw new ForbiddenException('No tienes permiso para ver reportes.');
    }
  }
}
