import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as mssql from 'mssql';
import { DatabaseEnv, readDatabaseEnv } from '../config/database-env';
import { withControlledRetry } from './connection-retry.util';

export interface DatabaseHealthSnapshot {
  sqlServerVersion: string;
  currentDatabase: string;
  systemUser: string;
  currentUser: string;
}

export interface DatabaseHealthResponse {
  status: 'ok';
  server: string;
  database: string;
  dialect: string;
  details: DatabaseHealthSnapshot;
}

export interface DatabaseReadinessSnapshot {
  currentDatabase: string;
  hasSchemaMigrationTable: boolean;
  appliedMigrations: number;
  baselineTableCount: number;
}

export interface DatabaseReadinessResponse {
  status: 'ok';
  server: string;
  database: string;
  dialect: string;
  details: DatabaseReadinessSnapshot;
}

const BASELINE_MIGRATION_COUNT = 8;
const BASELINE_TABLE_COUNT = 26;

export interface SqlQueryInput {
  name: string;
  type:
    | mssql.ISqlTypeFactory
    | mssql.ISqlTypeFactoryWithLength
    | mssql.ISqlTypeFactoryWithNoParams
    | mssql.ISqlTypeFactoryWithPrecisionScale;
  value: unknown;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mssql.ConnectionPool | null = null;
  private poolPromise: Promise<mssql.ConnectionPool> | null = null;

  getConnectionSummary(): {
    server: string;
    database: string;
    dialect: string;
  } {
    const env = readDatabaseEnv();

    return {
      server: env.instance ? `${env.host}\\${env.instance}` : env.host,
      database: env.name,
      dialect: env.dialect,
    };
  }

  async getHealthSnapshot(): Promise<DatabaseHealthResponse> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query<{
        sql_server_version: string;
        current_database_name: string;
        sql_system_user: string;
        sql_current_user: string;
      }>(`
        SELECT @@VERSION AS sql_server_version;
        SELECT
          DB_NAME() AS current_database_name,
          SYSTEM_USER AS sql_system_user,
          CURRENT_USER AS sql_current_user;
      `);

      const first = result.recordsets[0]?.[0];
      const second = result.recordsets[1]?.[0];
      const summary = this.getConnectionSummary();

      return {
        status: 'ok',
        server: summary.server,
        database: summary.database,
        dialect: summary.dialect,
        details: {
          sqlServerVersion: first?.sql_server_version ?? 'desconocido',
          currentDatabase: second?.current_database_name ?? summary.database,
          systemUser: second?.sql_system_user ?? 'desconocido',
          currentUser: second?.sql_current_user ?? 'desconocido',
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido al conectar a SQL Server.';

      throw new ServiceUnavailableException({
        status: 'error',
        message: 'No se pudo conectar a SQL Server.',
        details: message,
      });
    }
  }

  async getReadinessSnapshot(): Promise<DatabaseReadinessResponse> {
    try {
      const pool = await this.getPool();
      const result = await pool.request().query<{
        current_database_name: string;
        has_schema_migration_table: number;
        applied_migrations: number;
        baseline_table_count: number;
      }>(`
        SELECT
          DB_NAME() AS current_database_name,
          CASE
            WHEN OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL THEN 0
            ELSE 1
          END AS has_schema_migration_table,
          CASE
            WHEN OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL THEN 0
            ELSE (SELECT COUNT(*) FROM dbo.schema_migration WHERE estado = 'APLICADO')
          END AS applied_migrations,
          (
            SELECT COUNT(*)
            FROM sys.tables
            WHERE schema_id = SCHEMA_ID('dbo')
              AND is_ms_shipped = 0
          ) AS baseline_table_count;
      `);

      const row = result.recordset[0];
      const summary = this.getConnectionSummary();
      const details: DatabaseReadinessSnapshot = {
        currentDatabase: row?.current_database_name ?? summary.database,
        hasSchemaMigrationTable: row?.has_schema_migration_table === 1,
        appliedMigrations: row?.applied_migrations ?? 0,
        baselineTableCount: row?.baseline_table_count ?? 0,
      };

      if (
        details.currentDatabase !== summary.database ||
        !details.hasSchemaMigrationTable ||
        details.appliedMigrations < BASELINE_MIGRATION_COUNT ||
        details.baselineTableCount < BASELINE_TABLE_COUNT
      ) {
        throw new ServiceUnavailableException({
          status: 'error',
          message: 'La aplicacion no esta lista para operar.',
          details: {
            expectedDatabase: summary.database,
            expectedBaselineMigrationCount: BASELINE_MIGRATION_COUNT,
            expectedBaselineTableCount: BASELINE_TABLE_COUNT,
            actual: details,
          },
        });
      }

      return {
        status: 'ok',
        server: summary.server,
        database: summary.database,
        dialect: summary.dialect,
        details,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido al validar readiness.';

      throw new ServiceUnavailableException({
        status: 'error',
        message: 'La aplicacion no esta lista para operar.',
        details: message,
      });
    }
  }

  async query<T>(sql: string, inputs: SqlQueryInput[] = []): Promise<T[]> {
    try {
      const pool = await this.getPool();
      const request = pool.request();

      for (const input of inputs) {
        request.input(input.name, input.type as never, input.value as never);
      }

      const result = await request.query<T>(sql);
      return result.recordset;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error desconocido al ejecutar consulta SQL.';

      throw new ServiceUnavailableException({
        status: 'error',
        message: 'No se pudo ejecutar la consulta a SQL Server.',
        details: message,
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.close();
    this.pool = null;
    this.poolPromise = null;
  }

  private async getPool(): Promise<mssql.ConnectionPool> {
    if (this.pool) {
      return this.pool;
    }

    if (!this.poolPromise) {
      this.poolPromise = this.connect();
    }

    return this.poolPromise;
  }

  private async connect(): Promise<mssql.ConnectionPool> {
    const env = readDatabaseEnv();
    const summary = this.getConnectionSummary();

    try {
      this.pool = await withControlledRetry(
        async () => {
          const config = this.buildMssqlConfig(env);
          const pool = new mssql.ConnectionPool(config);
          return pool.connect();
        },
        {
          logger: this.logger,
          maxRetries: Math.max(1, env.connectMaxRetries),
          retryDelayMs: env.connectRetryDelayMs,
          operationName: `Conexion SQL Server a ${summary.server}/${env.name}`,
        },
      );

      this.logger.log(
        `Conexion SQL Server inicializada para ${summary.server}/${env.name}.`,
      );
      return this.pool;
    } catch (error) {
      this.poolPromise = null;
      throw error;
    }
  }

  private buildMssqlConfig(env: DatabaseEnv): mssql.config {
    return {
      server: env.host,
      database: env.name,
      user: env.user,
      password: env.password,
      port: env.port ?? undefined,
      connectionTimeout: env.connectTimeoutMs,
      requestTimeout: env.requestTimeoutMs,
      options: {
        encrypt: env.encrypt,
        trustServerCertificate: env.trustServerCertificate,
        instanceName: env.port ? undefined : (env.instance ?? undefined),
      },
      pool: {
        max: 5,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: env.poolAcquireTimeoutMs,
      },
    };
  }
}
