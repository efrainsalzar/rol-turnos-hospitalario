import { Module } from '@nestjs/common';
import { TypeOrmModule } from '../../infrastructure/persistence/typeorm/typeorm.module';
import { PlanificacionModule } from '../planificacion/planificacion.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { ActualizarIncidenciaPersonalUseCase } from './application/use-cases/actualizar-incidencia-personal.use-case';
import { ActualizarTurnoUseCase } from './application/use-cases/actualizar-turno.use-case';
import { ActivarTurnoUseCase } from './application/use-cases/activar-turno.use-case';
import { CrearIncidenciaPersonalUseCase } from './application/use-cases/crear-incidencia-personal.use-case';
import { CrearTurnoUseCase } from './application/use-cases/crear-turno.use-case';
import { DesactivarIncidenciaPersonalUseCase } from './application/use-cases/desactivar-incidencia-personal.use-case';
import { DesactivarTurnoUseCase } from './application/use-cases/desactivar-turno.use-case';
import { OperacionAccessPolicyService } from './application/use-cases/helpers/operacion-access-policy.service';
import { ListarIncidenciasPersonalesUseCase } from './application/use-cases/listar-incidencias-personales.use-case';
import { ListarTurnosUseCase } from './application/use-cases/listar-turnos.use-case';
import { ObtenerTurnoPorIdUseCase } from './application/use-cases/obtener-turno-por-id.use-case';
import { ObtenerImpactoUsoTurnoUseCase } from './application/use-cases/obtener-impacto-uso-turno.use-case';
import { ObtenerImpactoUsoIncidenciaPersonalUseCase } from './application/use-cases/obtener-impacto-uso-incidencia-personal.use-case';
import { ObtenerConfiguracionOperativaServicioUseCase } from './application/use-cases/obtener-configuracion-operativa-servicio.use-case';
import { GuardarConfiguracionOperativaServicioUseCase } from './application/use-cases/guardar-configuracion-operativa-servicio.use-case';
import { ObtenerConfiguracionOperativaDepartamentoUseCase } from './application/use-cases/obtener-configuracion-operativa-departamento.use-case';
import { GuardarConfiguracionOperativaDepartamentoUseCase } from './application/use-cases/guardar-configuracion-operativa-departamento.use-case';
import { ActualizarCodigoVisualUseCase } from './application/use-cases/actualizar-codigo-visual.use-case';
import { ActualizarCodigoVisualDepartamentoUseCase } from './application/use-cases/actualizar-codigo-visual-departamento.use-case';
import { IncidenciaPersonalRepository } from './domain/repositories/incidencia-personal.repository';
import { TurnoRepository } from './domain/repositories/turno.repository';
import { TypeOrmIncidenciaPersonalRepository } from './infrastructure/persistence/typeorm-incidencia-personal.repository';
import { TypeOrmTurnoRepository } from './infrastructure/persistence/typeorm-turno.repository';
import { IncidenciaPersonalController } from './presentation/controllers/incidencia-personal.controller';
import { TurnoController } from './presentation/controllers/turno.controller';
import { ConfiguracionOperativaServicioController } from './presentation/controllers/configuracion-operativa-servicio.controller';
import { ConfiguracionOperativaDepartamentoController } from './presentation/controllers/configuracion-operativa-departamento.controller';

@Module({
  imports: [TypeOrmModule, SeguridadModule, PlanificacionModule],
  controllers: [
    IncidenciaPersonalController,
    TurnoController,
    ConfiguracionOperativaServicioController,
    ConfiguracionOperativaDepartamentoController,
  ],
  providers: [
    OperacionAccessPolicyService,
    ListarIncidenciasPersonalesUseCase,
    ListarTurnosUseCase,
    ObtenerTurnoPorIdUseCase,
    ObtenerConfiguracionOperativaServicioUseCase,
    GuardarConfiguracionOperativaServicioUseCase,
    ObtenerConfiguracionOperativaDepartamentoUseCase,
    GuardarConfiguracionOperativaDepartamentoUseCase,
    ActualizarCodigoVisualUseCase,
    ActualizarCodigoVisualDepartamentoUseCase,
    CrearIncidenciaPersonalUseCase,
    ActualizarIncidenciaPersonalUseCase,
    DesactivarIncidenciaPersonalUseCase,
    CrearTurnoUseCase,
    ActualizarTurnoUseCase,
    ActivarTurnoUseCase,
    DesactivarTurnoUseCase,
    ObtenerImpactoUsoTurnoUseCase,
    ObtenerImpactoUsoIncidenciaPersonalUseCase,
    {
      provide: IncidenciaPersonalRepository,
      useClass: TypeOrmIncidenciaPersonalRepository,
    },
    {
      provide: TurnoRepository,
      useClass: TypeOrmTurnoRepository,
    },
  ],
})
export class OperacionModule {}
