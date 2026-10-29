import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import type { CodigoExportacionRolTurnos } from '../../domain/entities/codigo-exportacion-rol-turnos';
import { CatalogoExportacionRolTurnosRepository } from '../../domain/repositories/catalogo-exportacion-rol-turnos.repository';

type ExportCodeRow = {
  codigo: string;
  nombre: string;
  codigo_exportacion_etiqueta: string | null;
  codigo_exportacion_numerico: string | null;
};

@Injectable()
export class TypeOrmCatalogoExportacionRolTurnosRepository implements CatalogoExportacionRolTurnosRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listarCodigos(): Promise<CodigoExportacionRolTurnos[]> {
    // El catalogo `tipo_turno` se elimino en la migracion 033 (sin rolSeguridad
    // funcional real): el codigo/etiqueta de exportacion de un turno ya no
    // tiene un catalogo global propio, se resuelve por servicio/departamento
    // via `codigo_operativo_servicio` (ver TurnoExportCodeCatalogService).
    // `incidencia_personal` si sigue siendo un catalogo global valido como respaldo.
    const result = await this.dataSource.query<ExportCodeRow[]>(`
      SELECT
        codigo,
        nombre,
        codigo_exportacion_etiqueta,
        codigo_exportacion_numerico
      FROM dbo.incidencia_personal
      WHERE activo = 1
      ORDER BY codigo
    `);

    return normalizeRows(result).map((row) => mapRow(row, 'TIPO_DIA'));
  }
}

function mapRow(
  row: ExportCodeRow,
  origen: CodigoExportacionRolTurnos['origen'],
): CodigoExportacionRolTurnos {
  return {
    codigoInterno: row.codigo.trim().toUpperCase(),
    codigoEtiqueta:
      row.codigo_exportacion_etiqueta?.trim().toUpperCase() ||
      row.codigo.trim().toUpperCase(),
    codigoNumerico:
      row.codigo_exportacion_numerico?.trim().toUpperCase() ||
      row.codigo.trim().toUpperCase(),
    descripcion: row.nombre,
    origen,
  };
}

function normalizeRows(value: unknown): ExportCodeRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isExportCodeRow);
}

function isExportCodeRow(value: unknown): value is ExportCodeRow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const row = value as Partial<ExportCodeRow>;

  return (
    typeof row.codigo === 'string' &&
    typeof row.nombre === 'string' &&
    (typeof row.codigo_exportacion_etiqueta === 'string' ||
      row.codigo_exportacion_etiqueta === null) &&
    (typeof row.codigo_exportacion_numerico === 'string' ||
      row.codigo_exportacion_numerico === null)
  );
}
