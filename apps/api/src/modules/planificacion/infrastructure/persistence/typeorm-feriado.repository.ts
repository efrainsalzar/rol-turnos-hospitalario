import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import { Feriado } from '../../domain/entities/feriado';
import {
  FeriadoRepository,
  GuardarFeriadoInput,
  ListarFeriadosFiltro,
} from '../../domain/repositories/feriado.repository';

@Injectable()
export class TypeOrmFeriadoRepository implements FeriadoRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(filtro: ListarFeriadosFiltro): Promise<Feriado[]> {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (filtro.anio !== undefined) {
      condiciones.push(`f.anio = @${params.length}`);
      params.push(filtro.anio);
    }

    if (filtro.mes !== undefined) {
      condiciones.push(`f.mes = @${params.length}`);
      params.push(filtro.mes);
    }

    if (filtro.activo !== undefined) {
      condiciones.push(`f.activo = @${params.length}`);
      params.push(filtro.activo);
    }

    const whereSql =
      condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const rows = await this.dataSource.query<FeriadoRow[]>(
      `
        SELECT
          f.id AS f_id,
          f.id_tipo_feriado AS f_id_tipo_feriado,
          f.nombre AS f_nombre,
          f.anio AS f_anio,
          f.mes AS f_mes,
          f.fecha_inicio AS f_fecha_inicio,
          f.fecha_fin AS f_fecha_fin,
          f.activo AS f_activo,
          tf.codigo AS tf_codigo,
          tf.nombre AS tf_nombre
        FROM dbo.feriado f
        INNER JOIN dbo.tipo_feriado tf ON tf.id = f.id_tipo_feriado
        ${whereSql}
        ORDER BY f.fecha_inicio ASC
      `,
      params,
    );

    return rows.map(mapFeriadoRow);
  }

  async obtenerPorId(id: number): Promise<Feriado | null> {
    const rows = await this.dataSource.query<FeriadoRow[]>(
      `
        SELECT
          f.id AS f_id,
          f.id_tipo_feriado AS f_id_tipo_feriado,
          f.nombre AS f_nombre,
          f.anio AS f_anio,
          f.mes AS f_mes,
          f.fecha_inicio AS f_fecha_inicio,
          f.fecha_fin AS f_fecha_fin,
          f.activo AS f_activo,
          tf.codigo AS tf_codigo,
          tf.nombre AS tf_nombre
        FROM dbo.feriado f
        INNER JOIN dbo.tipo_feriado tf ON tf.id = f.id_tipo_feriado
        WHERE f.id = @0
      `,
      [id],
    );

    return rows[0] ? mapFeriadoRow(rows[0]) : null;
  }

  async crear(input: GuardarFeriadoInput): Promise<Feriado> {
    this.assertRangoValido(input);
    await this.assertTipoFeriadoActivo(input.idTipoFeriado);
    await this.assertSinSuperposicion(input, null);

    const rows = await this.dataSource.query<Array<{ id: number | string }>>(
      `
        INSERT INTO dbo.feriado
        (
          id_tipo_feriado,
          nombre,
          anio,
          mes,
          fecha_inicio,
          fecha_fin,
          activo
        )
        OUTPUT INSERTED.id AS id
        VALUES (@0, @1, @2, @3, @4, @5, @6)
      `,
      [
        input.idTipoFeriado,
        input.nombre.trim(),
        input.anio,
        input.mes,
        input.fechaInicio,
        input.fechaFin,
        input.activo,
      ],
    );

    const created = await this.obtenerPorId(Number(rows[0]?.id));

    if (!created) {
      throw errorAlConfirmarGuardado(
        'feriado',
        null,
        TypeOrmFeriadoRepository.name,
      );
    }

    return created;
  }

  async actualizar(id: number, input: GuardarFeriadoInput): Promise<Feriado> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('feriado', id, TypeOrmFeriadoRepository.name);
    }

    this.assertRangoValido(input);
    await this.assertTipoFeriadoActivo(input.idTipoFeriado);
    await this.assertSinSuperposicion(input, id);

    await this.dataSource.query(
      `
        UPDATE dbo.feriado
        SET
          id_tipo_feriado = @1,
          nombre = @2,
          anio = @3,
          mes = @4,
          fecha_inicio = @5,
          fecha_fin = @6,
          activo = @7,
          updated_at = SYSUTCDATETIME()
        WHERE id = @0
      `,
      [
        id,
        input.idTipoFeriado,
        input.nombre.trim(),
        input.anio,
        input.mes,
        input.fechaInicio,
        input.fechaFin,
        input.activo,
      ],
    );

    const updated = await this.obtenerPorId(id);

    if (!updated) {
      throw errorAlConfirmarGuardado(
        'feriado',
        id,
        TypeOrmFeriadoRepository.name,
      );
    }

    return updated;
  }

  async desactivar(id: number): Promise<void> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('feriado', id, TypeOrmFeriadoRepository.name);
    }

    await this.dataSource.query(
      `
        UPDATE dbo.feriado
        SET activo = 0, updated_at = SYSUTCDATETIME()
        WHERE id = @0
      `,
      [id],
    );
  }

  // El CHECK ck_feriado_pertenece_al_mes ya lo garantiza a nivel de base, pero
  // se valida antes tambien para devolver un mensaje operativo claro en vez
  // de un error crudo de SQL Server.
  private assertRangoValido(input: GuardarFeriadoInput): void {
    if (input.fechaFin < input.fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin del feriado no puede ser anterior a la fecha de inicio.',
      );
    }

    const inicioAnio = Number(input.fechaInicio.slice(0, 4));
    const inicioMes = Number(input.fechaInicio.slice(5, 7));
    const finAnio = Number(input.fechaFin.slice(0, 4));
    const finMes = Number(input.fechaFin.slice(5, 7));

    if (
      inicioAnio !== input.anio ||
      inicioMes !== input.mes ||
      finAnio !== input.anio ||
      finMes !== input.mes
    ) {
      throw new BadRequestException(
        'El feriado debe pertenecer por completo al anio y mes indicados: su rango de fechas no puede cruzar ese mes.',
      );
    }
  }

  private async assertTipoFeriadoActivo(idTipoFeriado: number): Promise<void> {
    const rows = await this.dataSource.query<Array<{ activo: boolean }>>(
      'SELECT activo FROM dbo.tipo_feriado WHERE id = @0',
      [idTipoFeriado],
    );

    if (!rows[0]) {
      throw noEncontrado(
        'tipoFeriado',
        idTipoFeriado,
        TypeOrmFeriadoRepository.name,
      );
    }

    if (!rows[0].activo) {
      throw new BadRequestException(
        'No se puede usar un tipo de feriado inactivo.',
      );
    }
  }

  // Dos feriados activos no pueden cubrir la misma fecha — evita ambiguedad
  // sobre "cual es el feriado" de un dia puntual.
  private async assertSinSuperposicion(
    input: GuardarFeriadoInput,
    idActual: number | null,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ id: number | string }>>(
      `
        SELECT TOP 1 id
        FROM dbo.feriado
        WHERE activo = 1
          AND (@0 IS NULL OR id <> @0)
          AND fecha_inicio <= @2
          AND fecha_fin >= @1
      `,
      [idActual, input.fechaInicio, input.fechaFin],
    );

    if (rows[0]) {
      throw new ConflictException(
        'Ya existe otro feriado activo que cubre alguna de estas fechas.',
      );
    }
  }
}

type FeriadoRow = {
  f_id: number | string;
  f_id_tipo_feriado: number | string;
  f_nombre: string;
  f_anio: number;
  f_mes: number;
  f_fecha_inicio: string;
  f_fecha_fin: string;
  f_activo: boolean;
  tf_codigo: string;
  tf_nombre: string;
};

function mapFeriadoRow(row: FeriadoRow): Feriado {
  return {
    id: Number(row.f_id),
    idTipoFeriado: Number(row.f_id_tipo_feriado),
    codigoTipoFeriado: row.tf_codigo,
    nombreTipoFeriado: row.tf_nombre,
    nombre: row.f_nombre,
    anio: Number(row.f_anio),
    mes: Number(row.f_mes),
    fechaInicio: new Date(row.f_fecha_inicio),
    fechaFin: new Date(row.f_fecha_fin),
    activo: row.f_activo,
  };
}
