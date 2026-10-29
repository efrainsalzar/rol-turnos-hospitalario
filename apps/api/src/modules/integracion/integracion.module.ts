import { Module } from '@nestjs/common';
import { TypeOrmModule } from '../../infrastructure/persistence/typeorm/typeorm.module';
import { ConsultarIdentidadesPorFuenteUseCase } from '../personal/application/use-cases/consultar-identidades-por-fuente.use-case';
import { RegistrarPersonalDesdeFuenteUseCase } from '../personal/application/use-cases/registrar-personal-desde-fuente.use-case';
import { PersonalModule } from '../personal/personal.module';
import { ConectorPersonalExterno } from './application/conectores/conector-personal-externo';
import { RegistroConectoresIntegracion } from './application/pipeline/conector-integracion';
import { EjecutarSincronizacionUseCase } from './application/use-cases/ejecutar-sincronizacion.use-case';
import { ListarObservadosUltimaValidacionUseCase } from './application/use-cases/listar-observados-ultima-validacion.use-case';
import { EjecucionIntegracionRepository } from './domain/repositories/ejecucion-integracion.repository';
import { StagingPersonalRepository } from './domain/repositories/staging-personal.repository';
import { RrhhExternoPersonalAdapter } from './infrastructure/adapters/rrhh-externo/rrhh-externo-personal.adapter';
import { LectorSqlServerSoloLectura } from './infrastructure/adapters/sql-server/lector-sql-server-solo-lectura';
import { TypeOrmEjecucionIntegracionRepository } from './infrastructure/persistence/typeorm-ejecucion-integracion.repository';
import { TypeOrmStagingPersonalRepository } from './infrastructure/persistence/typeorm-staging-personal.repository';

export const CONECTOR_PERSONAL_RRHH = 'personal-rrhh';

const TAMANO_LOTE_APLICACION = 500;

@Module({
  imports: [TypeOrmModule, PersonalModule],
  providers: [
    LectorSqlServerSoloLectura,
    RrhhExternoPersonalAdapter,
    {
      provide: EjecucionIntegracionRepository,
      useClass: TypeOrmEjecucionIntegracionRepository,
    },
    {
      provide: StagingPersonalRepository,
      useClass: TypeOrmStagingPersonalRepository,
    },
    {
      // Cada fuente nueva se agrega aqui como un conector mas; el runner y
      // los casos de uso no cambian.
      provide: RegistroConectoresIntegracion,
      inject: [
        RrhhExternoPersonalAdapter,
        StagingPersonalRepository,
        ConsultarIdentidadesPorFuenteUseCase,
        RegistrarPersonalDesdeFuenteUseCase,
      ],
      useFactory: (
        rrhh: RrhhExternoPersonalAdapter,
        staging: StagingPersonalRepository,
        consultarIdentidades: ConsultarIdentidadesPorFuenteUseCase,
        registrarPersonal: RegistrarPersonalDesdeFuenteUseCase,
      ) =>
        new RegistroConectoresIntegracion([
          new ConectorPersonalExterno(
            CONECTOR_PERSONAL_RRHH,
            { sourceSystem: 'RRHH_SQLSERVER', sourceEntity: 'persona' },
            rrhh,
            staging,
            consultarIdentidades,
            registrarPersonal,
            {
              // Politica de prueba heredada: las personas validas se crean
              // activas salvo que el entorno diga lo contrario
              // (SYNC_PERSONAL_DEFAULT_ACTIVE).
              activoPorDefecto: () =>
                (
                  process.env.SYNC_PERSONAL_DEFAULT_ACTIVE?.trim() || 'true'
                ).toLowerCase() === 'true',
              tamanoLote: TAMANO_LOTE_APLICACION,
            },
          ),
        ]),
    },
    EjecutarSincronizacionUseCase,
    ListarObservadosUltimaValidacionUseCase,
  ],
  exports: [
    EjecutarSincronizacionUseCase,
    ListarObservadosUltimaValidacionUseCase,
  ],
})
export class IntegracionModule {}
