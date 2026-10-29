import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import { TipoFeriado } from '../../domain/entities/tipo-feriado';
import {
  GuardarTipoFeriadoInput,
  TipoFeriadoRepository,
} from '../../domain/repositories/tipo-feriado.repository';
import { TipoFeriadoOrmEntity } from './entities/tipo-feriado.orm-entity';

@Injectable()
export class TypeOrmTipoFeriadoRepository implements TipoFeriadoRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<TipoFeriado[]> {
    const rows = await this.dataSource
      .getRepository(TipoFeriadoOrmEntity)
      .find({
        order: { orden: 'ASC', codigo: 'ASC' },
      });

    return rows.map(mapTipoFeriadoEntity);
  }

  async obtenerPorCodigo(codigo: string): Promise<TipoFeriado | null> {
    const row = await this.dataSource
      .getRepository(TipoFeriadoOrmEntity)
      .createQueryBuilder('tipoFeriado')
      .where('tipoFeriado.codigo = :codigo', {
        codigo: codigo.trim().toUpperCase(),
      })
      .getOne();

    return row ? mapTipoFeriadoEntity(row) : null;
  }

  async obtenerPorId(id: number): Promise<TipoFeriado | null> {
    const row = await this.dataSource
      .getRepository(TipoFeriadoOrmEntity)
      .createQueryBuilder('tipoFeriado')
      .where('tipoFeriado.id = :id', { id })
      .getOne();

    return row ? mapTipoFeriadoEntity(row) : null;
  }

  async crear(input: GuardarTipoFeriadoInput): Promise<TipoFeriado> {
    await this.assertCodigoDisponible(input.codigo, null);

    const rows = await this.queryIdRows(
      `
        INSERT INTO dbo.tipo_feriado
        (
          codigo,
          nombre,
          descripcion,
          orden,
          activo
        )
        OUTPUT INSERTED.id AS id
        VALUES (@0, @1, @2, @3, @4)
      `,
      [
        normalizeCode(input.codigo),
        input.nombre.trim(),
        input.descripcion ?? null,
        input.orden,
        input.activo,
      ],
    );

    const created = await this.obtenerPorId(Number(rows[0]?.id));

    if (!created) {
      throw errorAlConfirmarGuardado(
        'tipoFeriado',
        null,
        TypeOrmTipoFeriadoRepository.name,
      );
    }

    return created;
  }

  async actualizar(
    id: number,
    input: GuardarTipoFeriadoInput,
  ): Promise<TipoFeriado> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('tipoFeriado', id, TypeOrmTipoFeriadoRepository.name);
    }

    await this.assertCodigoDisponible(input.codigo, id);

    // Ya no hace falta propagar el rename a dbo.calendario a mano: desde que
    // dbo.feriado.id_tipo_feriado es una FK real (docs/database/
    // decisiones-tecnicas.md seccion 58), el codigo/nombre de un feriado se
    // resuelve por join en el momento de leer, nunca queda duplicado.
    await this.dataSource.query(
      `
        UPDATE dbo.tipo_feriado
        SET
          codigo = @1,
          nombre = @2,
          descripcion = @3,
          orden = @4,
          activo = @5,
          updated_at = SYSUTCDATETIME()
        WHERE id = @0
      `,
      [
        id,
        normalizeCode(input.codigo),
        input.nombre.trim(),
        input.descripcion ?? null,
        input.orden,
        input.activo,
      ],
    );

    const updated = await this.obtenerPorId(id);

    if (!updated) {
      throw errorAlConfirmarGuardado(
        'tipoFeriado',
        id,
        TypeOrmTipoFeriadoRepository.name,
      );
    }

    return updated;
  }

  async desactivar(id: number): Promise<void> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('tipoFeriado', id, TypeOrmTipoFeriadoRepository.name);
    }

    await this.dataSource.query(
      `
        UPDATE dbo.tipo_feriado
        SET
          activo = 0,
          updated_at = SYSUTCDATETIME()
        WHERE id = @0
      `,
      [id],
    );
  }

  private async assertCodigoDisponible(
    codigo: string,
    idActual: number | null,
  ): Promise<void> {
    const rows = await this.queryIdRows(
      `
        SELECT TOP 1 id
        FROM dbo.tipo_feriado
        WHERE UPPER(codigo) = @0
          AND (@1 IS NULL OR id <> @1)
      `,
      [normalizeCode(codigo), idActual],
    );

    if (rows[0]) {
      throw new ConflictException(
        `Ya existe un tipo de feriado con el codigo "${normalizeCode(codigo)}". Usa otro codigo.`,
      );
    }
  }

  private async queryIdRows(
    sql: string,
    params: unknown[],
  ): Promise<Array<{ id: number | string }>> {
    return await this.dataSource.query(sql, params);
  }
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function mapTipoFeriadoEntity(row: TipoFeriadoOrmEntity): TipoFeriado {
  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    orden: Number(row.orden),
    activo: row.activo,
  };
}
