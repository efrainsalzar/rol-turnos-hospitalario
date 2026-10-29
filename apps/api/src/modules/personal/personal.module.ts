import { Module } from '@nestjs/common';
import { TypeOrmModule } from '../../infrastructure/persistence/typeorm/typeorm.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { DepartamentoRepository } from '../organizacion/domain/repositories/departamento.repository';
import { ServicioRepository } from '../organizacion/domain/repositories/servicio.repository';
import { ObtenerServicioDetalleUseCase } from '../organizacion/application/use-cases/obtener-servicio-detalle.use-case';
import { TypeOrmDepartamentoRepository } from '../organizacion/infrastructure/persistence/typeorm-departamento.repository';
import { TypeOrmServicioRepository } from '../organizacion/infrastructure/persistence/typeorm-servicio.repository';
import { ActualizarAsignacionUseCase } from './application/use-cases/actualizar-asignacion.use-case';
import { ActivarPersonalUseCase } from './application/use-cases/activar-personal.use-case';
import { ActualizarPersonalUseCase } from './application/use-cases/actualizar-personal.use-case';
import { CerrarAsignacionUseCase } from './application/use-cases/cerrar-asignacion.use-case';
import { CrearAsignacionUseCase } from './application/use-cases/crear-asignacion.use-case';
import { ConsultarIdentidadesPorFuenteUseCase } from './application/use-cases/consultar-identidades-por-fuente.use-case';
import { CrearPersonalUseCase } from './application/use-cases/crear-personal.use-case';
import { DesactivarPersonalUseCase } from './application/use-cases/desactivar-personal.use-case';
import { ListarAsignacionesUseCase } from './application/use-cases/listar-asignaciones.use-case';
import { ListarCargasHorariasUseCase } from './application/use-cases/listar-cargas-horarias.use-case';
import { ListarNivelesCargoUseCase } from './application/use-cases/listar-niveles-cargo.use-case';
import { ListarPersonalUseCase } from './application/use-cases/listar-personal.use-case';
import { ListarPersonalVinculableUsuarioUseCase } from './application/use-cases/listar-personal-vinculable-usuario.use-case';
import { ListarPersonalPorDepartamentoUseCase } from './application/use-cases/listar-personal-por-departamento.use-case';
import { ListarPersonalPorServicioUseCase } from './application/use-cases/listar-personal-por-servicio.use-case';
import { ListarRolesFuncionalesUseCase } from './application/use-cases/listar-roles-funcionales.use-case';
import { ListarTiposContratoUseCase } from './application/use-cases/listar-tipos-contrato.use-case';
import { CrearTipoContratoUseCase } from './application/use-cases/crear-tipo-contrato.use-case';
import { ActualizarTipoContratoUseCase } from './application/use-cases/actualizar-tipo-contrato.use-case';
import { CambiarEstadoTipoContratoUseCase } from './application/use-cases/cambiar-estado-tipo-contrato.use-case';
import { MoverAsignacionUseCase } from './application/use-cases/mover-asignacion.use-case';
import { ObtenerConflictoPlanificacionAsignacionUseCase } from './application/use-cases/obtener-conflicto-planificacion-asignacion.use-case';
import { ObtenerPersonalDetalleUseCase } from './application/use-cases/obtener-personal-detalle.use-case';
import { RegistrarPersonalDesdeFuenteUseCase } from './application/use-cases/registrar-personal-desde-fuente.use-case';
import { AsignacionAccessPolicyService } from './application/use-cases/helpers/asignacion-access-policy.service';
import { PersonalAccessPolicyService } from './application/use-cases/helpers/personal-access-policy.service';
import { PersonalFuenteRepository } from './domain/repositories/personal-fuente.repository';
import { PersonalRepository } from './domain/repositories/personal.repository';
import { TypeOrmPersonalFuenteRepository } from './infrastructure/persistence/typeorm-personal-fuente.repository';
import { TypeOrmPersonalRepository } from './infrastructure/persistence/typeorm-personal.repository';
import { AsignacionController } from './presentation/controllers/asignacion.controller';
import { CatalogoPersonalController } from './presentation/controllers/catalogo-personal.controller';
import { DepartamentoPersonalController } from './presentation/controllers/departamento-personal.controller';
import { PersonalController } from './presentation/controllers/personal.controller';
import { ServicioPersonalController } from './presentation/controllers/servicio-personal.controller';

@Module({
  imports: [TypeOrmModule, SeguridadModule],
  controllers: [
    PersonalController,
    AsignacionController,
    CatalogoPersonalController,
    ServicioPersonalController,
    DepartamentoPersonalController,
  ],
  providers: [
    ListarPersonalUseCase,
    ListarPersonalVinculableUsuarioUseCase,
    ObtenerPersonalDetalleUseCase,
    ListarAsignacionesUseCase,
    CrearAsignacionUseCase,
    ActualizarAsignacionUseCase,
    MoverAsignacionUseCase,
    CerrarAsignacionUseCase,
    ObtenerConflictoPlanificacionAsignacionUseCase,
    CrearPersonalUseCase,
    ActualizarPersonalUseCase,
    ActivarPersonalUseCase,
    DesactivarPersonalUseCase,
    ListarNivelesCargoUseCase,
    ListarCargasHorariasUseCase,
    ListarTiposContratoUseCase,
    CrearTipoContratoUseCase,
    ActualizarTipoContratoUseCase,
    CambiarEstadoTipoContratoUseCase,
    ListarRolesFuncionalesUseCase,
    ListarPersonalPorServicioUseCase,
    ListarPersonalPorDepartamentoUseCase,
    ObtenerServicioDetalleUseCase,
    AsignacionAccessPolicyService,
    PersonalAccessPolicyService,
    ConsultarIdentidadesPorFuenteUseCase,
    RegistrarPersonalDesdeFuenteUseCase,
    {
      provide: PersonalFuenteRepository,
      useClass: TypeOrmPersonalFuenteRepository,
    },
    {
      provide: PersonalRepository,
      useClass: TypeOrmPersonalRepository,
    },
    {
      provide: ServicioRepository,
      useClass: TypeOrmServicioRepository,
    },
    {
      provide: DepartamentoRepository,
      useClass: TypeOrmDepartamentoRepository,
    },
  ],
  exports: [
    ConsultarIdentidadesPorFuenteUseCase,
    RegistrarPersonalDesdeFuenteUseCase,
  ],
})
export class PersonalModule {}
