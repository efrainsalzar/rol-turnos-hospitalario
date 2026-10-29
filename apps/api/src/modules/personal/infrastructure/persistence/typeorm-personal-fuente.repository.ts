import { Inject, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import {
  FuenteExternaPersonal,
  IdentidadesPorFuente,
  OpcionesRegistroPersonalDesdeFuente,
  RegistroPersonalDesdeFuente,
  ResultadoRegistroPersonalDesdeFuente,
  normalizarDocumentoIdentidad,
} from '../../domain/entities/identidad-fuente-externa';
import { PersonalFuenteRepository } from '../../domain/repositories/personal-fuente.repository';

const CODIGO_NIVEL_CARGO_PENDIENTE = 'PENDIENTE';

interface VinculoRow {
  id: number | string;
  external_id: string;
  personal_id: number | string;
}

interface DocumentoRow {
  id: number | string;
  documento_identidad: string | null;
}

@Injectable()
export class TypeOrmPersonalFuenteRepository implements PersonalFuenteRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async obtenerIdentidadesPorFuente(
    fuente: FuenteExternaPersonal,
  ): Promise<IdentidadesPorFuente> {
    const vinculos = await this.dataSource.query<VinculoRow[]>(
      `SELECT id, external_id, personal_id
       FROM dbo.personal_fuente
       WHERE source_system = @0 AND source_entity = @1`,
      [fuente.sourceSystem, fuente.sourceEntity],
    );
    const documentos = await this.dataSource.query<DocumentoRow[]>(
      `SELECT id, documento_identidad FROM dbo.personal WHERE documento_identidad IS NOT NULL`,
    );

    return {
      vinculados: new Map(
        vinculos.map((row) => [
          String(row.external_id),
          Number(row.personal_id),
        ]),
      ),
      documentosLocales: mapearDocumentos(documentos),
    };
  }

  async registrarLoteDesdeFuente(
    fuente: FuenteExternaPersonal,
    lote: RegistroPersonalDesdeFuente[],
    opciones: OpcionesRegistroPersonalDesdeFuente,
  ): Promise<ResultadoRegistroPersonalDesdeFuente[]> {
    if (lote.length === 0) return [];

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const idNivelCargoPendiente = await obtenerNivelCargoPendiente(runner);
      const vinculos = await obtenerVinculosDelLote(runner, fuente, lote);
      // Se vuelve a leer dentro de la transaccion: entre la validacion y la
      // aplicacion alguien pudo registrar a mano a la misma persona.
      const documentosLocales = mapearDocumentos(
        await consultar<DocumentoRow[]>(
          runner,
          `SELECT id, documento_identidad FROM dbo.personal WHERE documento_identidad IS NOT NULL`,
        ),
      );
      const resultados: ResultadoRegistroPersonalDesdeFuente[] = [];

      for (const registro of lote) {
        const vinculo = vinculos.get(registro.externalId);

        if (vinculo) {
          await runner.query(
            `UPDATE dbo.personal_fuente
             SET last_seen_at = GETDATE(), updated_at = GETDATE(), is_active = 1
             WHERE id = @0`,
            [vinculo.id],
          );
          resultados.push({
            externalId: registro.externalId,
            resultado: 'VINCULO_EXISTENTE',
            idPersonal: Number(vinculo.personal_id),
          });
          continue;
        }

        // La API impide dos personas con el mismo documento
        // (TypeOrmPersonalRepository.assertPersonalUpsertAllowed), pero la
        // tabla no tiene UNIQUE: la integracion debe respetar la misma regla.
        const idPersonalExistente = documentosLocales.get(
          registro.documentoNormalizado,
        );
        if (idPersonalExistente !== undefined) {
          resultados.push({
            externalId: registro.externalId,
            resultado: 'DOCUMENTO_EXISTE_LOCAL',
            idPersonalExistente,
          });
          continue;
        }

        const idPersonal = await insertarPersonal(
          runner,
          registro,
          idNivelCargoPendiente,
          opciones.activoPorDefecto,
        );
        await runner.query(
          `INSERT INTO dbo.personal_fuente
            (personal_id, source_system, source_entity, external_id,
             is_primary, first_seen_at, last_seen_at, is_active, created_at, updated_at)
           VALUES (@0, @1, @2, @3, 1, GETDATE(), GETDATE(), 1, GETDATE(), GETDATE())`,
          [
            idPersonal,
            fuente.sourceSystem,
            fuente.sourceEntity,
            registro.externalId,
          ],
        );
        documentosLocales.set(registro.documentoNormalizado, idPersonal);
        resultados.push({
          externalId: registro.externalId,
          resultado: 'CREADO',
          idPersonal,
        });
      }

      await runner.commitTransaction();
      return resultados;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }
}

function mapearDocumentos(rows: DocumentoRow[]): Map<string, number> {
  const documentos = new Map<string, number>();
  for (const row of rows) {
    const normalizado = normalizarDocumentoIdentidad(row.documento_identidad);
    if (normalizado && !documentos.has(normalizado)) {
      documentos.set(normalizado, Number(row.id));
    }
  }
  return documentos;
}

async function obtenerNivelCargoPendiente(
  runner: QueryRunner,
): Promise<number> {
  const rows = await consultar<Array<{ id: number | string }>>(
    runner,
    `SELECT TOP 1 id FROM dbo.nivel_cargo WHERE codigo = @0 AND activo = 1`,
    [CODIGO_NIVEL_CARGO_PENDIENTE],
  );

  if (rows[0]?.id == null) {
    throw new Error(
      `No existe el nivel_cargo ${CODIGO_NIVEL_CARGO_PENDIENTE} activo.`,
    );
  }

  return Number(rows[0].id);
}

async function obtenerVinculosDelLote(
  runner: QueryRunner,
  fuente: FuenteExternaPersonal,
  lote: RegistroPersonalDesdeFuente[],
): Promise<Map<string, VinculoRow>> {
  const placeholders = lote.map((_, index) => `@${index + 2}`).join(', ');
  const rows = await consultar<VinculoRow[]>(
    runner,
    `SELECT id, external_id, personal_id
     FROM dbo.personal_fuente
     WHERE source_system = @0 AND source_entity = @1
       AND external_id IN (${placeholders})`,
    [
      fuente.sourceSystem,
      fuente.sourceEntity,
      ...lote.map((r) => r.externalId),
    ],
  );

  return new Map(rows.map((row) => [String(row.external_id), row]));
}

async function insertarPersonal(
  runner: QueryRunner,
  registro: RegistroPersonalDesdeFuente,
  idNivelCargo: number,
  activo: boolean,
): Promise<number> {
  const rows = await consultar<Array<{ id: number | string }>>(
    runner,
    `INSERT INTO dbo.personal
      (codigo_personal, nombres, apellido_paterno, apellido_materno,
       documento_identidad, id_nivel_cargo, activo, created_at, updated_at)
     OUTPUT INSERTED.id
     VALUES (NULL, @0, @1, @2, @3, @4, @5, GETUTCDATE(), GETUTCDATE())`,
    [
      registro.nombres,
      registro.apellidoPaterno,
      registro.apellidoMaterno,
      registro.documentoIdentidad,
      idNivelCargo,
      activo ? 1 : 0,
    ],
  );

  if (rows[0]?.id == null) {
    throw new Error(
      `No se pudo insertar personal para el identificador externo ${registro.externalId}.`,
    );
  }

  return Number(rows[0].id);
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
