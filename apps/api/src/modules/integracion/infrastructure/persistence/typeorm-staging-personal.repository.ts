import { Inject, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { FuenteIntegracion } from '../../domain/entities/ejecucion-integracion';
import {
  FilaStagingPersonal,
  StagingPersonalObservado,
  StagingPersonalRepository,
  StagingPersonalValido,
} from '../../domain/repositories/staging-personal.repository';

// SQL Server admite como maximo 2100 parametros por consulta: 150 filas x 12
// columnas = 1800 deja margen.
const FILAS_POR_INSERT = 150;
const IDS_POR_UPDATE = 1000;
const ESTADOS_OBSERVADOS = ['CONFLICTO', 'DUPLICADO', 'ERROR'];

interface StagingValidoRow {
  id: number | string;
  external_id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  documento_identidad: string;
  documento_normalizado: string;
}

interface StagingObservadoRow {
  ejecucion_id: number | string;
  staging_id: number | string;
  external_id: string;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  documento_identidad: string | null;
  documento_normalizado: string | null;
  estado: string;
  mensaje: string | null;
}

@Injectable()
export class TypeOrmStagingPersonalRepository implements StagingPersonalRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async registrarLectura(
    ejecucionId: number,
    fuente: FuenteIntegracion,
    filas: FilaStagingPersonal[],
  ): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      for (let offset = 0; offset < filas.length; offset += FILAS_POR_INSERT) {
        const bloque = filas.slice(offset, offset + FILAS_POR_INSERT);
        const ids = await insertarBloqueStaging(
          runner,
          ejecucionId,
          fuente,
          bloque,
        );
        await insertarConflictosDelBloque(runner, ejecucionId, bloque, ids);
      }

      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async listarValidos(ejecucionId: number): Promise<StagingPersonalValido[]> {
    const rows = await this.dataSource.query<StagingValidoRow[]>(
      `SELECT id, external_id, nombre, apellido_paterno, apellido_materno,
              documento_identidad, documento_normalizado
       FROM dbo.integracion_personal_staging
       WHERE ejecucion_id = @0 AND estado = 'VALIDO'
       ORDER BY id`,
      [ejecucionId],
    );

    return rows.map((row) => ({
      id: Number(row.id),
      externalId: String(row.external_id),
      nombres: row.nombre,
      apellidoPaterno: row.apellido_paterno,
      apellidoMaterno: row.apellido_materno,
      documentoIdentidad: row.documento_identidad,
      documentoNormalizado: row.documento_normalizado,
    }));
  }

  async contarNoValidos(ejecucionId: number): Promise<number> {
    const rows = await this.dataSource.query<Array<{ total: number | string }>>(
      `SELECT COUNT(*) AS total
       FROM dbo.integracion_personal_staging
       WHERE ejecucion_id = @0 AND estado IN (@1, @2, @3)`,
      [ejecucionId, ...ESTADOS_OBSERVADOS],
    );

    return Number(rows[0]?.total ?? 0);
  }

  async marcarProcesados(
    stagingIds: number[],
    estado: 'APLICADO' | 'SIN_CAMBIOS',
  ): Promise<void> {
    for (let offset = 0; offset < stagingIds.length; offset += IDS_POR_UPDATE) {
      const bloque = stagingIds.slice(offset, offset + IDS_POR_UPDATE);
      const placeholders = bloque.map((_, index) => `@${index + 1}`).join(', ');

      await this.dataSource.query(
        `UPDATE dbo.integracion_personal_staging
         SET estado = @0, procesado_at = GETDATE()
         WHERE id IN (${placeholders})`,
        [estado, ...bloque],
      );
    }
  }

  async marcarConflictoAlAplicar(
    ejecucionAplicacionId: number,
    stagingId: number,
    tipo: string,
    detalle: string,
  ): Promise<void> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await runner.query(
        `UPDATE dbo.integracion_personal_staging
         SET estado = 'CONFLICTO', mensaje = @0, procesado_at = GETDATE()
         WHERE id = @1`,
        [detalle, stagingId],
      );
      await runner.query(
        `INSERT INTO dbo.integracion_conflicto
          (ejecucion_id, staging_id, tipo, detalle)
         VALUES (@0, @1, @2, @3)`,
        [ejecucionAplicacionId, stagingId, tipo, detalle],
      );
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async listarObservados(
    ejecucionId: number,
  ): Promise<StagingPersonalObservado[]> {
    const rows = await this.dataSource.query<StagingObservadoRow[]>(
      `SELECT ejecucion_id, id AS staging_id, external_id, nombre,
              apellido_paterno, apellido_materno, documento_identidad,
              documento_normalizado, estado, mensaje
       FROM dbo.integracion_personal_staging
       WHERE ejecucion_id = @0 AND estado IN (@1, @2, @3)
       ORDER BY documento_normalizado, external_id, id`,
      [ejecucionId, ...ESTADOS_OBSERVADOS],
    );

    return rows.map((row) => ({
      ejecucionId: Number(row.ejecucion_id),
      stagingId: Number(row.staging_id),
      externalId: String(row.external_id),
      nombres: row.nombre,
      apellidoPaterno: row.apellido_paterno,
      apellidoMaterno: row.apellido_materno,
      documentoIdentidad: row.documento_identidad,
      documentoNormalizado: row.documento_normalizado,
      estado: row.estado,
      mensaje: row.mensaje,
    }));
  }
}

// Devuelve claveStaging -> id insertado. OUTPUT de un INSERT multi-fila no
// garantiza el orden, por eso se mapea por la clave (unica por ejecucion).
async function insertarBloqueStaging(
  runner: QueryRunner,
  ejecucionId: number,
  fuente: FuenteIntegracion,
  bloque: FilaStagingPersonal[],
): Promise<Map<string, number>> {
  const valores: unknown[] = [];
  const tuplas = bloque.map(({ claveStaging, persona }) => {
    const base = valores.length;
    valores.push(
      ejecucionId,
      fuente.sourceSystem,
      fuente.sourceEntity,
      claveStaging,
      persona.nombres,
      persona.apellidoPaterno,
      persona.apellidoMaterno,
      persona.documentoIdentidad,
      persona.documentoNormalizado,
      persona.hash,
      persona.estado,
      persona.mensaje,
    );
    return `(${Array.from({ length: 12 }, (_, i) => `@${base + i}`).join(', ')})`;
  });

  const rows = await consultar<
    Array<{ id: number | string; external_id: string }>
  >(
    runner,
    `INSERT INTO dbo.integracion_personal_staging
      (ejecucion_id, source_system, source_entity, external_id,
       nombre, apellido_paterno, apellido_materno, documento_identidad,
       documento_normalizado, source_record_hash, estado, mensaje)
     OUTPUT INSERTED.id, INSERTED.external_id
     VALUES ${tuplas.join(', ')}`,
    valores,
  );

  return new Map(rows.map((row) => [String(row.external_id), Number(row.id)]));
}

async function insertarConflictosDelBloque(
  runner: QueryRunner,
  ejecucionId: number,
  bloque: FilaStagingPersonal[],
  idsPorClave: Map<string, number>,
): Promise<void> {
  const observados = bloque.filter(
    ({ persona }) => persona.estado !== 'VALIDO',
  );
  if (observados.length === 0) return;

  const valores: unknown[] = [];
  const tuplas = observados.map(({ claveStaging, persona }) => {
    const stagingId = idsPorClave.get(claveStaging);
    if (stagingId === undefined) {
      throw new Error(
        `No se encontro el staging insertado para la clave ${claveStaging}.`,
      );
    }
    const base = valores.length;
    valores.push(
      ejecucionId,
      stagingId,
      persona.tipoConflicto ?? persona.estado,
      persona.mensaje ?? 'Error de validacion',
    );
    return `(@${base}, @${base + 1}, @${base + 2}, @${base + 3})`;
  });

  await runner.query(
    `INSERT INTO dbo.integracion_conflicto (ejecucion_id, staging_id, tipo, detalle)
     VALUES ${tuplas.join(', ')}`,
    valores,
  );
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
