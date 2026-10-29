import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { SesionEdicionPlanificacion } from '../../domain/entities/sesion-edicion-planificacion';
import {
  IntentoAdquisicionSesionEdicion,
  MINUTOS_EXPIRACION_SESION_EDICION,
  SesionEdicionPlanificacionRepository,
} from '../../domain/repositories/sesion-edicion-planificacion.repository';

interface SesionEdicionRow {
  id_planificacion: number | string;
  id_usuario_editor: number | string;
  adquirido_en: Date;
  ultimo_latido: Date;
  usuario_username: string;
  personal_nombres: string | null;
  personal_apellido_paterno: string | null;
  personal_apellido_materno: string | null;
  rol_codigo: string | null;
}

interface SesionEdicionLockRow {
  id_planificacion: number | string;
  id_usuario_editor: number | string;
  ultimo_latido: Date;
}

@Injectable()
export class TypeOrmSesionEdicionPlanificacionRepository implements SesionEdicionPlanificacionRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async obtenerActiva(
    idPlanificacion: number,
  ): Promise<SesionEdicionPlanificacion | null> {
    const row = await this.obtenerFilaEnriquecida(
      this.dataSource.manager,
      idPlanificacion,
    );

    if (!row) {
      return null;
    }

    if (this.estaVencida(row.ultimo_latido)) {
      // Housekeeping perezoso: se descubre vencida al leer, se limpia y se
      // trata como libre. Ver MINUTOS_EXPIRACION_SESION_EDICION.
      await this.dataSource.query(
        `DELETE FROM dbo.planificacion_sesion_edicion WHERE id_planificacion = @0`,
        [idPlanificacion],
      );
      return null;
    }

    return this.mapRow(row);
  }

  async intentarAdquirirOLatir(
    idPlanificacion: number,
    idUsuarioEditor: number,
  ): Promise<IntentoAdquisicionSesionEdicion> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await this.obtenerFilaParaEscritura(
        manager,
        idPlanificacion,
      );

      const libre = !existing || this.estaVencida(existing.ultimo_latido);
      const esPropia =
        existing !== null &&
        Number(existing.id_usuario_editor) === idUsuarioEditor;

      if (libre || esPropia) {
        await this.upsert(manager, idPlanificacion, idUsuarioEditor, {
          renovarAdquiridoEn: libre,
        });
        const sesion = await this.obtenerFilaEnriquecida(
          manager,
          idPlanificacion,
        );
        return { sesion: this.mapRow(sesion!), controlPropio: true };
      }

      const sesionAjena = await this.obtenerFilaEnriquecida(
        manager,
        idPlanificacion,
      );
      return { sesion: this.mapRow(sesionAjena!), controlPropio: false };
    });
  }

  async forzarControl(
    idPlanificacion: number,
    idUsuarioEditor: number,
  ): Promise<SesionEdicionPlanificacion> {
    return this.dataSource.transaction(async (manager) => {
      await this.obtenerFilaParaEscritura(manager, idPlanificacion);
      await this.upsert(manager, idPlanificacion, idUsuarioEditor, {
        renovarAdquiridoEn: true,
      });
      const sesion = await this.obtenerFilaEnriquecida(
        manager,
        idPlanificacion,
      );
      return this.mapRow(sesion!);
    });
  }

  async liberar(
    idPlanificacion: number,
    idUsuarioEditor: number,
  ): Promise<void> {
    await this.dataSource.query(
      `
        DELETE FROM dbo.planificacion_sesion_edicion
        WHERE id_planificacion = @0 AND id_usuario_editor = @1
      `,
      [idPlanificacion, idUsuarioEditor],
    );
  }

  async liberarTodasDeUsuario(idUsuarioEditor: number): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM dbo.planificacion_sesion_edicion WHERE id_usuario_editor = @0`,
      [idUsuarioEditor],
    );
  }

  private estaVencida(ultimoLatido: Date): boolean {
    const minutosInactivo =
      (Date.now() - new Date(ultimoLatido).getTime()) / 60000;
    return minutosInactivo >= MINUTOS_EXPIRACION_SESION_EDICION;
  }

  // WITH (UPDLOCK, HOLDLOCK) evita que dos intentos de adquisicion
  // concurrentes lean ambos "libre" y ambos escriban: el segundo espera a
  // que el primero termine su transaccion antes de leer.
  private async obtenerFilaParaEscritura(
    manager: EntityManager,
    idPlanificacion: number,
  ): Promise<SesionEdicionLockRow | null> {
    const rows = await manager.query<SesionEdicionLockRow[]>(
      `
        SELECT id_planificacion, id_usuario_editor, ultimo_latido
        FROM dbo.planificacion_sesion_edicion WITH (UPDLOCK, HOLDLOCK)
        WHERE id_planificacion = @0
      `,
      [idPlanificacion],
    );

    return rows[0] ?? null;
  }

  private async obtenerFilaEnriquecida(
    manager: EntityManager,
    idPlanificacion: number,
  ): Promise<SesionEdicionRow | null> {
    const rows = await manager.query<SesionEdicionRow[]>(
      `
        SELECT
          sesion.id_planificacion AS id_planificacion,
          sesion.id_usuario_editor AS id_usuario_editor,
          sesion.adquirido_en AS adquirido_en,
          sesion.ultimo_latido AS ultimo_latido,
          usuario.username AS usuario_username,
          personal.nombres AS personal_nombres,
          personal.apellido_paterno AS personal_apellido_paterno,
          personal.apellido_materno AS personal_apellido_materno,
          rolSeguridad.codigo AS rol_codigo
        FROM dbo.planificacion_sesion_edicion sesion
        INNER JOIN dbo.usuario usuario ON usuario.id = sesion.id_usuario_editor
        LEFT JOIN dbo.personal personal ON personal.id = usuario.id_personal
        LEFT JOIN dbo.rol_seguridad rolSeguridad ON rolSeguridad.id = usuario.id_rol_seguridad
        WHERE sesion.id_planificacion = @0
      `,
      [idPlanificacion],
    );

    return rows[0] ?? null;
  }

  private async upsert(
    manager: EntityManager,
    idPlanificacion: number,
    idUsuarioEditor: number,
    options: { renovarAdquiridoEn: boolean },
  ): Promise<void> {
    if (options.renovarAdquiridoEn) {
      await manager.query(
        `
          MERGE dbo.planificacion_sesion_edicion AS destino
          USING (SELECT @0 AS id_planificacion) AS origen
          ON destino.id_planificacion = origen.id_planificacion
          WHEN MATCHED THEN
            UPDATE SET id_usuario_editor = @1, adquirido_en = GETUTCDATE(), ultimo_latido = GETUTCDATE()
          WHEN NOT MATCHED THEN
            INSERT (id_planificacion, id_usuario_editor, adquirido_en, ultimo_latido)
            VALUES (@0, @1, GETUTCDATE(), GETUTCDATE());
        `,
        [idPlanificacion, idUsuarioEditor],
      );
      return;
    }

    await manager.query(
      `UPDATE dbo.planificacion_sesion_edicion SET ultimo_latido = GETUTCDATE() WHERE id_planificacion = @0`,
      [idPlanificacion],
    );
  }

  private mapRow(row: SesionEdicionRow): SesionEdicionPlanificacion {
    const nombreCompleto = [
      row.personal_nombres,
      row.personal_apellido_paterno,
      row.personal_apellido_materno,
    ]
      .filter((value) => Boolean(value))
      .join(' ');

    return {
      idPlanificacion: Number(row.id_planificacion),
      idUsuarioEditor: Number(row.id_usuario_editor),
      nombreUsuarioEditor: nombreCompleto || row.usuario_username,
      codigoRolEditor: row.rol_codigo ?? '',
      adquiridoEn: new Date(row.adquirido_en),
      ultimoLatido: new Date(row.ultimo_latido),
    };
  }
}
