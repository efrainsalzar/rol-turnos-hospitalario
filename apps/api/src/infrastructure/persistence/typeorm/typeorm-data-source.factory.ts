import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { readDatabaseEnv } from '../../config/database-env';
import { withControlledRetry } from '../../database/connection-retry.util';
import { DepartamentoOrmEntity } from '../../../modules/organizacion/infrastructure/persistence/entities/departamento.orm-entity';
import { ServicioOrmEntity } from '../../../modules/organizacion/infrastructure/persistence/entities/servicio.orm-entity';
import { AsignacionPersonalOrmEntity } from '../../../modules/personal/infrastructure/persistence/entities/asignacion-personal.orm-entity';
import { PersonalOrmEntity } from '../../../modules/personal/infrastructure/persistence/entities/personal.orm-entity';
import { NivelCargoOrmEntity } from '../../../modules/personal/infrastructure/persistence/entities/nivel-cargo.orm-entity';
import { IncidenciaPersonalOrmEntity } from '../../../modules/operacion/infrastructure/persistence/entities/incidencia-personal.orm-entity';
import { TurnoOrmEntity } from '../../../modules/operacion/infrastructure/persistence/entities/turno.orm-entity';
import { TurnoTramoOrmEntity } from '../../../modules/operacion/infrastructure/persistence/entities/turno-tramo.orm-entity';
import { CalendarioOrmEntity } from '../../../modules/planificacion/infrastructure/persistence/entities/calendario.orm-entity';
import { FeriadoOrmEntity } from '../../../modules/planificacion/infrastructure/persistence/entities/feriado.orm-entity';
import { PlanificacionOrmEntity } from '../../../modules/planificacion/infrastructure/persistence/entities/planificacion.orm-entity';
import { PlanificacionSesionEdicionOrmEntity } from '../../../modules/planificacion/infrastructure/persistence/entities/planificacion-sesion-edicion.orm-entity';
import { RolTurnoOrmEntity } from '../../../modules/planificacion/infrastructure/persistence/entities/rol-turno.orm-entity';
import { TipoFeriadoOrmEntity } from '../../../modules/planificacion/infrastructure/persistence/entities/tipo-feriado.orm-entity';
import { RolSeguridadOrmEntity } from '../../../modules/seguridad/infrastructure/persistence/entities/rol-seguridad.orm-entity';
import { UsuarioOrmEntity } from '../../../modules/seguridad/infrastructure/persistence/entities/usuario.orm-entity';

const logger = new Logger('TypeOrmDataSourceFactory');

export async function createTypeOrmDataSource(): Promise<DataSource> {
  const env = readDatabaseEnv();
  const dataSource = new DataSource(buildTypeOrmConfig());

  if (!dataSource.isInitialized) {
    await withControlledRetry(async () => dataSource.initialize(), {
      logger,
      maxRetries: Math.max(1, env.connectMaxRetries),
      retryDelayMs: env.connectRetryDelayMs,
      operationName: `Inicializacion TypeORM para ${env.host}\\${env.instance ?? ''}/${env.name}`,
    });
    logger.log(
      `DataSource TypeORM inicializado para ${env.host}\\${env.instance ?? ''}/${env.name} ` +
        `(perfil ${env.profile.name}, compatibilidad ${env.profile.compatibilityLevel}).`,
    );
  }

  return dataSource;

  function buildTypeOrmConfig() {
    return {
      type: 'mssql' as const,
      host: env.host,
      port: env.port ?? undefined,
      username: env.user,
      password: env.password,
      database: env.name,
      synchronize: false,
      logging: false,
      connectionTimeout: env.connectTimeoutMs,
      requestTimeout: env.requestTimeoutMs,
      // Sin esto, el default de tedious-connection-pool es 1 conexion y
      // acquireTimeoutMillis no tiene limite: bajo concurrencia una request
      // nueva puede quedar esperando una conexion libre indefinidamente, sin
      // que requestTimeout la cubra (solo aplica una vez adquirida la
      // conexion). Ver docs/rendimiento/analisis-lentitud-matriz-mensual.md.
      pool: {
        max: env.poolMax,
        acquireTimeoutMillis: env.poolAcquireTimeoutMs,
      },
      entities: [
        DepartamentoOrmEntity,
        ServicioOrmEntity,
        PersonalOrmEntity,
        NivelCargoOrmEntity,
        AsignacionPersonalOrmEntity,
        IncidenciaPersonalOrmEntity,
        TurnoOrmEntity,
        TurnoTramoOrmEntity,
        CalendarioOrmEntity,
        FeriadoOrmEntity,
        PlanificacionOrmEntity,
        PlanificacionSesionEdicionOrmEntity,
        RolTurnoOrmEntity,
        TipoFeriadoOrmEntity,
        RolSeguridadOrmEntity,
        UsuarioOrmEntity,
      ],
      options: {
        encrypt: env.encrypt,
        trustServerCertificate: env.trustServerCertificate,
        instanceName: env.port ? undefined : (env.instance ?? undefined),
      },
    };
  }
}
