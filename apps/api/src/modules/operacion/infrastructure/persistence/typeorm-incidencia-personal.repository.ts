import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { IncidenciaPersonal } from '../../domain/entities/incidencia-personal';
import {
  ImpactoUsoCatalogo,
  ResultadoLimpiezaCeldas,
} from '../../domain/entities/impacto-uso-catalogo';
import {
  GuardarIncidenciaPersonalInput,
  ListarIncidenciasPersonalesFiltro,
  IncidenciaPersonalRepository,
} from '../../domain/repositories/incidencia-personal.repository';
import { IncidenciaPersonalOrmEntity } from './entities/incidencia-personal.orm-entity';

@Injectable()
export class TypeOrmIncidenciaPersonalRepository implements IncidenciaPersonalRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(
    filtro?: ListarIncidenciasPersonalesFiltro,
  ): Promise<IncidenciaPersonal[]> {
    const rows = await this.dataSource
      .getRepository(IncidenciaPersonalOrmEntity)
      .find({
        order: {
          codigo: 'ASC',
        },
      });

    const incidenciasPersonales = rows.map(mapIncidenciaPersonalEntity);

    if (!filtro?.alcance) {
      return incidenciasPersonales;
    }

    return incidenciasPersonales.filter(
      (incidenciaPersonal) => incidenciaPersonal.alcance === filtro.alcance,
    );
  }

  async obtenerPorId(id: number): Promise<IncidenciaPersonal | null> {
    const row = await this.dataSource
      .getRepository(IncidenciaPersonalOrmEntity)
      .createQueryBuilder('incidenciaPersonal')
      .where('incidenciaPersonal.id = :id', { id })
      .getOne();

    return row ? mapIncidenciaPersonalEntity(row) : null;
  }

  async crear(
    input: GuardarIncidenciaPersonalInput,
  ): Promise<IncidenciaPersonal> {
    await this.assertCodigoDisponible(input.codigo, null);

    const rows = await this.queryIdRows(
      `
        INSERT INTO dbo.incidencia_personal
        (
          codigo,
          nombre,
          descripcion,
          es_laborable,
          genera_horas_trabajadas,
          computa_para_meta_horas,
          requiere_respaldo,
          activo
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (@0, @1, @2, @3, @4, @5, @6, @7)
      `,
      [
        input.codigo.trim().toUpperCase(),
        input.nombre.trim(),
        input.descripcion,
        input.esLaborable,
        input.generaHorasTrabajadas,
        input.computaParaMetaHoras,
        input.requiereRespaldo,
        input.activo,
      ],
    );

    const created = await this.obtenerPorId(Number(rows[0]?.id));

    if (!created) {
      throw errorAlConfirmarGuardado(
        'incidenciaPersonal',
        rows[0]?.id ?? null,
        TypeOrmIncidenciaPersonalRepository.name,
      );
    }

    return created;
  }

  async actualizar(
    id: number,
    input: GuardarIncidenciaPersonalInput,
  ): Promise<IncidenciaPersonal> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado(
        'incidenciaPersonal',
        id,
        TypeOrmIncidenciaPersonalRepository.name,
      );
    }

    await this.assertCodigoDisponible(input.codigo, id);

    await this.dataSource.query(
      `
        UPDATE dbo.incidencia_personal
        SET
          codigo = @1,
          nombre = @2,
          descripcion = @3,
          es_laborable = @4,
          genera_horas_trabajadas = @5,
          computa_para_meta_horas = @6,
          requiere_respaldo = @7,
          activo = @8,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [
        id,
        input.codigo.trim().toUpperCase(),
        input.nombre.trim(),
        input.descripcion,
        input.esLaborable,
        input.generaHorasTrabajadas,
        input.computaParaMetaHoras,
        input.requiereRespaldo,
        input.activo,
      ],
    );

    const updated = await this.obtenerPorId(id);

    if (!updated) {
      throw errorAlConfirmarGuardado(
        'incidenciaPersonal',
        id,
        TypeOrmIncidenciaPersonalRepository.name,
      );
    }

    return updated;
  }

  async desactivar(id: number): Promise<void> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado(
        'incidenciaPersonal',
        id,
        TypeOrmIncidenciaPersonalRepository.name,
      );
    }

    await this.dataSource.query(
      `
        UPDATE dbo.incidencia_personal
        SET
          activo = 0,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [id],
    );
  }

  async obtenerImpactoUso(id: number): Promise<ImpactoUsoCatalogo> {
    const rows = await this.queryRows<{
      id: number | string;
      anio: number;
      mes: number;
      estado: string;
      total_celdas: number | string;
    }>(
      `
        SELECT p.id, p.anio, p.mes, p.estado, COUNT(rt.id) AS total_celdas
        FROM dbo.rol_turno rt
        INNER JOIN dbo.planificacion p ON p.id = rt.id_planificacion
        WHERE rt.id_incidencia_personal = @0 AND p.estado <> 'CERRADA'
        GROUP BY p.id, p.anio, p.mes, p.estado
        ORDER BY p.anio, p.mes
      `,
      [id],
    );

    const planificaciones = rows.map((row) => ({
      id: Number(row.id),
      anio: Number(row.anio),
      mes: Number(row.mes),
      estado: row.estado,
      totalCeldas: Number(row.total_celdas),
    }));

    return {
      totalCeldas: planificaciones.reduce((sum, p) => sum + p.totalCeldas, 0),
      totalPlanificaciones: planificaciones.length,
      planificaciones,
    };
  }

  async limpiarCeldasAsociadas(id: number): Promise<ResultadoLimpiezaCeldas> {
    const rows = await this.queryRows<{ id_planificacion: number | string }>(
      `
        DELETE rt
        OUTPUT DELETED.id_planificacion AS id_planificacion
        FROM dbo.rol_turno rt
        INNER JOIN dbo.planificacion p ON p.id = rt.id_planificacion
        WHERE rt.id_incidencia_personal = @0 AND p.estado <> 'CERRADA'
      `,
      [id],
    );

    const planificacionesAfectadas = new Set(
      rows.map((row) => Number(row.id_planificacion)),
    ).size;

    return { celdasEliminadas: rows.length, planificacionesAfectadas };
  }

  private async assertCodigoDisponible(
    codigo: string,
    idActual: number | null,
  ): Promise<void> {
    const rows = await this.queryIdRows(
      `
        SELECT TOP 1 id
        FROM dbo.incidencia_personal
        WHERE UPPER(codigo) = @0
          AND (@1 IS NULL OR id <> @1)
      `,
      [codigo.trim().toUpperCase(), idActual],
    );

    if (rows[0]) {
      throw new ConflictException(
        `Ya existe una incidencia de personal con el codigo ${codigo.trim().toUpperCase()}. Usa otro codigo.`,
      );
    }
  }

  private async queryIdRows(
    sql: string,
    params: unknown[],
  ): Promise<Array<{ id: number | string }>> {
    return await this.dataSource.query(sql, params);
  }

  private async queryRows<T>(sql: string, params: unknown[]): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }
}

function mapIncidenciaPersonalEntity(
  row: IncidenciaPersonalOrmEntity,
): IncidenciaPersonal {
  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    alcance: row.alcance,
    esLaborable: row.esLaborable,
    generaHorasTrabajadas: row.generaHorasTrabajadas,
    computaParaMetaHoras: row.computaParaMetaHoras,
    requiereRespaldo: row.requiereRespaldo,
    activo: row.activo,
  };
}
