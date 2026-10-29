import { Module } from '@nestjs/common';
import { TypeOrmModule } from '../../infrastructure/persistence/typeorm/typeorm.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { CalendarioRepository } from './domain/repositories/calendario.repository';
import { FeriadoRepository } from './domain/repositories/feriado.repository';
import { CatalogoExportacionRolTurnosRepository } from './domain/repositories/catalogo-exportacion-rol-turnos.repository';
import { ConfiguracionOperativaServicioRepository } from './domain/repositories/configuracion-operativa-servicio.repository';
import { PlanificacionHistorialRepository } from './domain/repositories/planificacion-historial.repository';
import { PlanificacionRepository } from './domain/repositories/planificacion.repository';
import { RolTurnoRepository } from './domain/repositories/rol-turno.repository';
import { ObservacionPlanificacionRepository } from './domain/repositories/observacion-planificacion.repository';
import { SesionEdicionPlanificacionRepository } from './domain/repositories/sesion-edicion-planificacion.repository';
import { TipoFeriadoRepository } from './domain/repositories/tipo-feriado.repository';
import { TypeOrmCalendarioRepository } from './infrastructure/persistence/typeorm-calendario.repository';
import { TypeOrmFeriadoRepository } from './infrastructure/persistence/typeorm-feriado.repository';
import { TypeOrmCatalogoExportacionRolTurnosRepository } from './infrastructure/persistence/typeorm-catalogo-exportacion-rol-turnos.repository';
import { TypeOrmConfiguracionOperativaServicioRepository } from './infrastructure/persistence/typeorm-configuracion-operativa-servicio.repository';
import { TypeOrmObservacionPlanificacionRepository } from './infrastructure/persistence/typeorm-observacion-planificacion.repository';
import { TypeOrmPlanificacionHistorialRepository } from './infrastructure/persistence/typeorm-planificacion-historial.repository';
import { TypeOrmPlanificacionRepository } from './infrastructure/persistence/typeorm-planificacion.repository';
import { TypeOrmRolTurnoRepository } from './infrastructure/persistence/typeorm-rol-turno.repository';
import { TypeOrmSesionEdicionPlanificacionRepository } from './infrastructure/persistence/typeorm-sesion-edicion-planificacion.repository';
import { TypeOrmTipoFeriadoRepository } from './infrastructure/persistence/typeorm-tipo-feriado.repository';
import { CalendarioController } from './presentation/controllers/calendario.controller';
import { FeriadoController } from './presentation/controllers/feriado.controller';
import { PlanificacionController } from './presentation/controllers/planificacion.controller';
import { TipoFeriadoController } from './presentation/controllers/tipo-feriado.controller';
import { AplicarCeldaMatrizPlanificacionUseCase } from './application/use-cases/aplicar-celda-matriz-planificacion.use-case';
import { AplicarCeldaMatrizLotePlanificacionUseCase } from './application/use-cases/aplicar-celda-matriz-lote-planificacion.use-case';
import { CambiarEstadoPlanificacionUseCase } from './application/use-cases/cambiar-estado-planificacion.use-case';
import { CrearBorradorPlanificacionUseCase } from './application/use-cases/crear-borrador-planificacion.use-case';
import { CrearRolTurnoPlanificacionUseCase } from './application/use-cases/crear-rol-turno-planificacion.use-case';
import { DuplicarPlanificacionUseCase } from './application/use-cases/duplicar-planificacion.use-case';
import { PlanificacionAccessPolicyService } from './application/use-cases/helpers/planificacion-access-policy.service';
import { ActualizarRolTurnoPlanificacionUseCase } from './application/use-cases/actualizar-rol-turno-planificacion.use-case';
import { ActualizarObservacionMensualPlanificacionUseCase } from './application/use-cases/actualizar-observacion-mensual-planificacion.use-case';
import { CrearFeriadoUseCase } from './application/use-cases/crear-feriado.use-case';
import { ActualizarFeriadoUseCase } from './application/use-cases/actualizar-feriado.use-case';
import { ListarFeriadosUseCase } from './application/use-cases/listar-feriados.use-case';
import { DesactivarFeriadoUseCase } from './application/use-cases/desactivar-feriado.use-case';
import { EliminarPlanificacionUseCase } from './application/use-cases/eliminar-planificacion.use-case';
import { EliminarRolTurnoPlanificacionUseCase } from './application/use-cases/eliminar-rol-turno-planificacion.use-case';
import { ExportarPlanificacionExcelUseCase } from './application/use-cases/exportar-planificacion-excel.use-case';
import { ExportarPlanificacionPdfUseCase } from './application/use-cases/exportar-planificacion-pdf.use-case';
import { ExportarPlanificacionesExcelUseCase } from './application/use-cases/exportar-planificaciones-excel.use-case';
import { ExportarPlanificacionesPdfUseCase } from './application/use-cases/exportar-planificaciones-pdf.use-case';
import { ExportarPlanificacionPreviewUseCase } from './application/use-cases/exportar-planificacion-preview.use-case';
import { GenerarCalendarioUseCase } from './application/use-cases/generar-calendario.use-case';
import { ListarCalendariosUseCase } from './application/use-cases/listar-calendarios.use-case';
import { ListarAsignacionesDisponiblesPorPlanificacionUseCase } from './application/use-cases/listar-asignaciones-disponibles-por-planificacion.use-case';
import { ListarPlanificacionesUseCase } from './application/use-cases/listar-planificaciones.use-case';
import { ListarResumenCalendarioPorPlanificacionUseCase } from './application/use-cases/listar-resumen-calendario-por-planificacion.use-case';
import { ListarResumenPersonalPorPlanificacionUseCase } from './application/use-cases/listar-resumen-personal-por-planificacion.use-case';
import { ObtenerPlanificacionUseCase } from './application/use-cases/obtener-planificacion.use-case';
import { ObtenerConfiguracionOperativaPlanificacionUseCase } from './application/use-cases/obtener-configuracion-operativa-planificacion.use-case';
import { ObtenerMatrizMensualPlanificacionUseCase } from './application/use-cases/obtener-matriz-mensual-planificacion.use-case';
import { ListarRolTurnosPorPlanificacionUseCase } from './application/use-cases/listar-rol-turnos-por-planificacion.use-case';
import { PublicarPlanificacionUseCase } from './application/use-cases/publicar-planificacion.use-case';
import { CerrarPlanificacionUseCase } from './application/use-cases/cerrar-planificacion.use-case';
import { CerrarPlanificacionesVencidasUseCase } from './application/use-cases/cerrar-planificaciones-vencidas.use-case';
import { CerrarPlanificacionesVencidasScheduler } from './infrastructure/scheduling/cerrar-planificaciones-vencidas.scheduler';
import { GenerarReportePersonalUseCase } from './application/use-cases/generar-reporte-personal.use-case';
import { ExportarReportePersonalPdfUseCase } from './application/use-cases/exportar-reporte-personal-pdf.use-case';
import { PlanificacionMatrizExportService } from './application/services/planificacion-matriz-export.service';
import { PlanificacionExcelExportService } from './application/services/export/planificacion-excel-export.service';
import { TurnoExportCodeCatalogService } from './application/services/export/turno-export-code-catalog.service';
import { RolTurnosTemplateRegistry } from './application/services/export/templates/rol-turnos-template.registry';
import { RolTurnosTemplate2026 } from './application/services/export/templates/rol-turnos-template-2026';
import { RolTurnosTemplateDefault } from './application/services/export/templates/rol-turnos-template-default';
import { CalendarioAccessPolicyService } from './application/use-cases/helpers/calendario-access-policy.service';
import { ListarTiposFeriadoUseCase } from './application/use-cases/listar-tipos-feriado.use-case';
import { CrearTipoFeriadoUseCase } from './application/use-cases/crear-tipo-feriado.use-case';
import { ActualizarTipoFeriadoUseCase } from './application/use-cases/actualizar-tipo-feriado.use-case';
import { DesactivarTipoFeriadoUseCase } from './application/use-cases/desactivar-tipo-feriado.use-case';
import { ObtenerSesionEdicionPlanificacionUseCase } from './application/use-cases/obtener-sesion-edicion-planificacion.use-case';
import { RegistrarLatidoSesionEdicionPlanificacionUseCase } from './application/use-cases/registrar-latido-sesion-edicion-planificacion.use-case';
import { TomarControlSesionEdicionPlanificacionUseCase } from './application/use-cases/tomar-control-sesion-edicion-planificacion.use-case';
import { LiberarSesionEdicionPlanificacionUseCase } from './application/use-cases/liberar-sesion-edicion-planificacion.use-case';

@Module({
  imports: [SeguridadModule, TypeOrmModule],
  controllers: [
    CalendarioController,
    FeriadoController,
    TipoFeriadoController,
    PlanificacionController,
  ],
  providers: [
    PlanificacionAccessPolicyService,
    CalendarioAccessPolicyService,
    ListarTiposFeriadoUseCase,
    CrearTipoFeriadoUseCase,
    ActualizarTipoFeriadoUseCase,
    DesactivarTipoFeriadoUseCase,
    ListarFeriadosUseCase,
    CrearFeriadoUseCase,
    ActualizarFeriadoUseCase,
    DesactivarFeriadoUseCase,
    AplicarCeldaMatrizPlanificacionUseCase,
    AplicarCeldaMatrizLotePlanificacionUseCase,
    CambiarEstadoPlanificacionUseCase,
    CrearBorradorPlanificacionUseCase,
    CrearRolTurnoPlanificacionUseCase,
    DuplicarPlanificacionUseCase,
    ActualizarRolTurnoPlanificacionUseCase,
    ActualizarObservacionMensualPlanificacionUseCase,
    EliminarPlanificacionUseCase,
    EliminarRolTurnoPlanificacionUseCase,
    ExportarPlanificacionExcelUseCase,
    ExportarPlanificacionPdfUseCase,
    ExportarPlanificacionesExcelUseCase,
    ExportarPlanificacionesPdfUseCase,
    ExportarPlanificacionPreviewUseCase,
    GenerarCalendarioUseCase,
    PublicarPlanificacionUseCase,
    CerrarPlanificacionUseCase,
    CerrarPlanificacionesVencidasUseCase,
    CerrarPlanificacionesVencidasScheduler,
    ListarCalendariosUseCase,
    ListarAsignacionesDisponiblesPorPlanificacionUseCase,
    ListarPlanificacionesUseCase,
    ListarResumenCalendarioPorPlanificacionUseCase,
    ListarResumenPersonalPorPlanificacionUseCase,
    ObtenerMatrizMensualPlanificacionUseCase,
    ObtenerConfiguracionOperativaPlanificacionUseCase,
    ObtenerPlanificacionUseCase,
    ListarRolTurnosPorPlanificacionUseCase,
    GenerarReportePersonalUseCase,
    ExportarReportePersonalPdfUseCase,
    PlanificacionExcelExportService,
    PlanificacionMatrizExportService,
    TurnoExportCodeCatalogService,
    RolTurnosTemplateRegistry,
    RolTurnosTemplate2026,
    RolTurnosTemplateDefault,
    ObtenerSesionEdicionPlanificacionUseCase,
    RegistrarLatidoSesionEdicionPlanificacionUseCase,
    TomarControlSesionEdicionPlanificacionUseCase,
    LiberarSesionEdicionPlanificacionUseCase,
    {
      provide: CalendarioRepository,
      useClass: TypeOrmCalendarioRepository,
    },
    {
      provide: FeriadoRepository,
      useClass: TypeOrmFeriadoRepository,
    },
    {
      provide: TipoFeriadoRepository,
      useClass: TypeOrmTipoFeriadoRepository,
    },
    {
      provide: CatalogoExportacionRolTurnosRepository,
      useClass: TypeOrmCatalogoExportacionRolTurnosRepository,
    },
    {
      provide: ConfiguracionOperativaServicioRepository,
      useClass: TypeOrmConfiguracionOperativaServicioRepository,
    },
    {
      provide: PlanificacionRepository,
      useClass: TypeOrmPlanificacionRepository,
    },
    {
      provide: PlanificacionHistorialRepository,
      useClass: TypeOrmPlanificacionHistorialRepository,
    },
    {
      provide: RolTurnoRepository,
      useClass: TypeOrmRolTurnoRepository,
    },
    {
      provide: ObservacionPlanificacionRepository,
      useClass: TypeOrmObservacionPlanificacionRepository,
    },
    {
      provide: SesionEdicionPlanificacionRepository,
      useClass: TypeOrmSesionEdicionPlanificacionRepository,
    },
  ],
  exports: [
    ConfiguracionOperativaServicioRepository,
    SesionEdicionPlanificacionRepository,
  ],
})
export class PlanificacionModule {}
