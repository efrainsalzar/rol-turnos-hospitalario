import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { ObservacionMensualPlanificacion } from '../../domain/entities/observacion-mensual-planificacion';
import {
  ObservacionPlanificacionRepository,
  UpsertObservacionMensualPlanificacionInput,
} from '../../domain/repositories/observacion-planificacion.repository';

@Injectable()
export class TypeOrmObservacionPlanificacionRepository implements ObservacionPlanificacionRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async upsertObservacionMensual(
    input: UpsertObservacionMensualPlanificacionInput,
  ): Promise<ObservacionMensualPlanificacion | null> {
    const descripcion = input.descripcion.trim();

    const existing = await this.executeTypedQuery<ObservacionMensualRow>(
      `
        SELECT TOP 1
          om.id,
          om.id_planificacion,
          om.id_asignacion_personal,
          om.tipo_observacion,
          om.descripcion,
          om.created_by,
          om.created_at
        FROM dbo.observacion_mensual om
        WHERE om.id_planificacion = @0
          AND om.id_asignacion_personal = @1
        ORDER BY om.id DESC
      `,
      [input.idPlanificacion, input.idAsignacionPersonal],
    );

    if (!descripcion) {
      if (existing.length > 0) {
        await this.dataSource.query(
          `DELETE FROM dbo.observacion_mensual WHERE id = @0`,
          [existing[0].id],
        );
      }

      return null;
    }

    if (existing.length > 0) {
      await this.dataSource.query(
        `
          UPDATE dbo.observacion_mensual
          SET tipo_observacion = @1,
              descripcion = @2,
              created_by = @3,
              created_at = GETUTCDATE()
          WHERE id = @0
        `,
        [
          existing[0].id,
          input.tipoObservacion,
          descripcion,
          input.idUsuarioOperacion,
        ],
      );

      return this.obtenerPorId(Number(existing[0].id));
    }

    const inserted = await this.executeTypedQuery<IdentityRow>(
      `
        INSERT INTO dbo.observacion_mensual
        (
          id_planificacion,
          id_asignacion_personal,
          tipo_observacion,
          descripcion,
          created_by
        )
        OUTPUT INSERTED.id AS id
        VALUES (@0, @1, @2, @3, @4);
      `,
      [
        input.idPlanificacion,
        input.idAsignacionPersonal,
        input.tipoObservacion,
        descripcion,
        input.idUsuarioOperacion,
      ],
    );

    return this.obtenerPorId(Number(inserted[0].id));
  }

  private async obtenerPorId(
    id: number,
  ): Promise<ObservacionMensualPlanificacion | null> {
    const rows = await this.executeTypedQuery<ObservacionMensualRow>(
      `
        SELECT
          om.id,
          om.id_planificacion,
          om.id_asignacion_personal,
          om.tipo_observacion,
          om.descripcion,
          om.created_by,
          om.created_at
        FROM dbo.observacion_mensual om
        WHERE om.id = @0
      `,
      [id],
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    return {
      id: Number(row.id),
      idPlanificacion: Number(row.id_planificacion),
      idAsignacionPersonal: Number(row.id_asignacion_personal),
      tipoObservacion: row.tipo_observacion,
      descripcion: row.descripcion,
      createdBy: Number(row.created_by),
      createdAt: new Date(row.created_at),
    };
  }

  private async executeTypedQuery<TRow>(
    sql: string,
    parameters?: unknown[],
  ): Promise<TRow[]> {
    const rowsUnknown: unknown = await this.dataSource.query(sql, parameters);

    return rowsUnknown as TRow[];
  }
}

type IdentityRow = {
  id: number | string;
};

type ObservacionMensualRow = {
  id: number | string;
  id_planificacion: number | string;
  id_asignacion_personal: number | string;
  tipo_observacion: string;
  descripcion: string;
  created_by: number | string;
  created_at: Date | string;
};
