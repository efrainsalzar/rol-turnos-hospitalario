import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import {
  CierreEjecucionIntegracion,
  FuenteIntegracion,
  NuevaEjecucionIntegracion,
} from '../../domain/entities/ejecucion-integracion';
import {
  BloqueoIntegracion,
  EjecucionIntegracionRepository,
} from '../../domain/repositories/ejecucion-integracion.repository';

// Estados con los que una validacion puede aplicarse (migracion 012).
const ESTADOS_VALIDACION_APLICABLE = [
  'FINALIZADA',
  'VALIDADA',
  'LISTA_PARA_APLICAR_TOTAL',
  'LISTA_PARA_APLICAR_PARCIAL',
];
const LONGITUD_MAXIMA_MENSAJE = 1000;

@Injectable()
export class TypeOrmEjecucionIntegracionRepository implements EjecucionIntegracionRepository {
  private readonly logger = new Logger(
    TypeOrmEjecucionIntegracionRepository.name,
  );

  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Bloqueo con sp_getapplock cuyo dueno es una transaccion abierta solo
   * para sostenerlo. No se usa @LockOwner = 'Session': el QueryRunner de
   * TypeORM para SQL Server solo fija una conexion dentro de una
   * transaccion; fuera de ella cada consulta toma cualquier conexion del
   * pool y el bloqueo quedaria retenido en una conexion ajena. Si el proceso
   * muere, la conexion se cierra y SQL Server libera el bloqueo solo.
   */
  async adquirirBloqueo(
    fuente: FuenteIntegracion,
  ): Promise<BloqueoIntegracion | null> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();

    try {
      await runner.startTransaction();
      const rows = await consultar<Array<{ resultado: number }>>(
        runner,
        `DECLARE @resultado INT;
         EXEC @resultado = sp_getapplock
           @Resource = @0, @LockMode = 'Exclusive',
           @LockOwner = 'Transaction', @LockTimeout = 0;
         SELECT @resultado AS resultado;`,
        [recursoBloqueo(fuente)],
      );

      // >= 0: concedido; -1: ya lo tiene otra ejecucion.
      if ((rows[0]?.resultado ?? -1) < 0) {
        await runner.rollbackTransaction();
        await runner.release();
        return null;
      }
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
      throw error;
    }

    return {
      liberar: async () => {
        try {
          if (runner.isTransactionActive) await runner.commitTransaction();
        } catch (error) {
          this.logger.error(
            `No se pudo liberar el bloqueo de ${recursoBloqueo(fuente)}: ${String(error)}`,
          );
        } finally {
          await runner.release();
        }
      },
    };
  }

  async cerrarInterrumpidas(fuente: FuenteIntegracion): Promise<number> {
    const rows = await this.dataSource.query<Array<{ id: number | string }>>(
      `UPDATE dbo.integracion_ejecucion
       SET estado = 'ERROR', finalizado_at = GETDATE(),
           mensaje = 'Interrumpida: el proceso termino antes de cerrar la ejecucion.'
       OUTPUT INSERTED.id
       WHERE source_system = @0 AND source_entity = @1 AND estado = 'INICIADA'`,
      [fuente.sourceSystem, fuente.sourceEntity],
    );

    return rows.length;
  }

  async obtenerUltimaValidacionAplicable(
    fuente: FuenteIntegracion,
  ): Promise<number | null> {
    const placeholders = ESTADOS_VALIDACION_APLICABLE.map(
      (_, index) => `@${index + 2}`,
    ).join(', ');

    return this.obtenerUltimoId(
      `SELECT TOP 1 id
       FROM dbo.integracion_ejecucion
       WHERE source_system = @0 AND source_entity = @1
         AND tipo_ejecucion = 'DRY_RUN'
         AND estado IN (${placeholders})
       ORDER BY id DESC`,
      [
        fuente.sourceSystem,
        fuente.sourceEntity,
        ...ESTADOS_VALIDACION_APLICABLE,
      ],
    );
  }

  async obtenerUltimaValidacion(
    fuente: FuenteIntegracion,
  ): Promise<number | null> {
    return this.obtenerUltimoId(
      `SELECT TOP 1 id
       FROM dbo.integracion_ejecucion
       WHERE source_system = @0 AND source_entity = @1
         AND tipo_ejecucion = 'DRY_RUN'
       ORDER BY id DESC`,
      [fuente.sourceSystem, fuente.sourceEntity],
    );
  }

  async crear(ejecucion: NuevaEjecucionIntegracion): Promise<number> {
    const rows = await this.dataSource.query<Array<{ id: number | string }>>(
      `INSERT INTO dbo.integracion_ejecucion
        (source_system, source_entity, tipo_ejecucion, estado,
         origen_ejecucion, created_by, ejecucion_validacion_id)
       OUTPUT INSERTED.id
       VALUES (@0, @1, @2, 'INICIADA', @3, @4, @5)`,
      [
        ejecucion.fuente.sourceSystem,
        ejecucion.fuente.sourceEntity,
        ejecucion.tipo,
        ejecucion.origen,
        ejecucion.idUsuario,
        ejecucion.ejecucionValidacionId,
      ],
    );

    if (rows[0]?.id == null) {
      throw new Error('No se pudo crear el lote de integracion.');
    }

    return Number(rows[0].id);
  }

  async cerrar(
    ejecucionId: number,
    cierre: CierreEjecucionIntegracion,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE dbo.integracion_ejecucion
       SET estado = @0, finalizado_at = GETDATE(),
           total_leidos = @1, total_validos = @2, total_aplicados = @3,
           total_errores = @4, mensaje = @5, modo_conexion = @6,
           origen_con_permiso_escritura = @7
       WHERE id = @8`,
      [
        cierre.estado,
        cierre.totalLeidos,
        cierre.totalValidos,
        cierre.totalAplicados,
        cierre.totalErrores,
        recortar(cierre.mensaje),
        cierre.modoConexion,
        cierre.origenConPermisoEscritura == null
          ? null
          : cierre.origenConPermisoEscritura
            ? 1
            : 0,
        ejecucionId,
      ],
    );
  }

  async marcarError(ejecucionId: number, mensaje: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE dbo.integracion_ejecucion
       SET estado = 'ERROR', finalizado_at = GETDATE(), mensaje = @0
       WHERE id = @1`,
      [recortar(mensaje), ejecucionId],
    );
  }

  private async obtenerUltimoId(
    sql: string,
    parametros: unknown[],
  ): Promise<number | null> {
    const rows = await this.dataSource.query<Array<{ id: number | string }>>(
      sql,
      parametros,
    );
    return rows[0]?.id == null ? null : Number(rows[0].id);
  }
}

function recursoBloqueo(fuente: FuenteIntegracion): string {
  return `integracion:${fuente.sourceSystem}:${fuente.sourceEntity}`;
}

function recortar(mensaje: string): string {
  return mensaje.length > LONGITUD_MAXIMA_MENSAJE
    ? `${mensaje.slice(0, LONGITUD_MAXIMA_MENSAJE - 3)}...`
    : mensaje;
}

// QueryRunner.query no es generico (a diferencia de DataSource.query).
async function consultar<T>(
  runner: QueryRunner,
  sql: string,
  parametros?: unknown[],
): Promise<T> {
  const filas: unknown = await runner.query(sql, parametros);
  return filas as T;
}
