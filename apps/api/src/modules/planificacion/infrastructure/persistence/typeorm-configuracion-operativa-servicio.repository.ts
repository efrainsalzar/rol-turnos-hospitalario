import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { errorAlConfirmarGuardado } from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import {
  AlcanceIncidenciaPersonalOperativo,
  CodigoOperativoServicio,
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
  TramoCodigoOperativo,
} from '../../domain/entities/configuracion-operativa-servicio';
import {
  ActualizarConfiguracionOperativaDepartamentoInput,
  ActualizarConfiguracionOperativaServicioInput,
  ConfiguracionOperativaServicioRepository,
} from '../../domain/repositories/configuracion-operativa-servicio.repository';

@Injectable()
export class TypeOrmConfiguracionOperativaServicioRepository implements ConfiguracionOperativaServicioRepository {
  private static readonly DEFAULT_TURNO_COLORS = [
    '#E8F4FD',
    '#EAF7E9',
    '#FFF4DB',
    '#FCEBEC',
    '#F2ECFF',
    '#E8FAF6',
    '#FFF0F6',
    '#EEF2FF',
    '#F9F6E8',
    '#EAF1F8',
  ] as const;

  // `obtenerPorServicio`/`obtenerPorDepartamento` corren ~8 queries secuenciales
  // (auto-aprovisionamiento incluido). La pantalla de matriz y la exportacion
  // piden esta misma configuracion por caminos HTTP separados dentro de la
  // misma carga (matriz + configuracion-operativa en paralelo; export +
  // catalogo de codigos en serie), duplicando el costo sin necesidad: nada
  // cambia entre una llamada y la otra a milisegundos de distancia. Un TTL
  // corto absorbe esa duplicacion sin arriesgar datos viejos en uso real —
  // cualquier escritura real (guardarConfiguracion*/actualizarCodigoVisual)
  // invalida el cache explicitamente, asi que el TTL solo cubre la ventana
  // entre dos lecturas casi simultaneas, no ediciones del usuario.
  private static readonly CONFIGURACION_CACHE_TTL_MS = 3000;
  private readonly configuracionCache = new Map<
    string,
    {
      value:
        | ConfiguracionOperativaServicio
        | ConfiguracionOperativaDepartamento;
      expiresAt: number;
    }
  >();

  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async obtenerPorPlanificacion(
    idPlanificacion: number,
  ): Promise<
    ConfiguracionOperativaServicio | ConfiguracionOperativaDepartamento | null
  > {
    const planificacion = await this.dataSource
      .query(
        `
          SELECT
            p.id AS planificacion_id,
            p.id_servicio AS id_servicio,
            p.id_departamento AS id_departamento
          FROM dbo.planificacion p
          WHERE p.id = @0
            AND p.activo = 1
        `,
        [idPlanificacion],
      )
      .then((rows: PlanificacionServicioRow[]) => rows[0] ?? null);

    if (!planificacion) {
      return null;
    }

    if (planificacion.id_servicio !== null) {
      return this.obtenerPorServicio(Number(planificacion.id_servicio));
    }

    if (planificacion.id_departamento !== null) {
      return this.obtenerPorDepartamento(Number(planificacion.id_departamento));
    }

    return null;
  }

  async obtenerPorServicio(
    idServicio: number,
  ): Promise<ConfiguracionOperativaServicio | null> {
    const cacheKey = this.buildCacheKey('servicio', idServicio);
    const cached = this.readFromCache(cacheKey);
    if (cached) {
      return cached as ConfiguracionOperativaServicio;
    }

    const headerRows = await this.queryRows<ConfiguracionHeaderRow>(
      `
        SELECT
          cos.id AS configuracion_id,
          s.id AS servicio_id,
          s.codigo AS servicio_codigo,
          s.nombre AS servicio_nombre,
          cos.modo_visual_default,
          cos.permite_multi_registro_dia,
          cos.usa_equivalencia_horaria_exportacion
        FROM dbo.servicio s
        LEFT JOIN dbo.configuracion_operativa_servicio cos
          ON cos.id_servicio = s.id
         AND cos.activo = 1
        WHERE s.id = @0
          AND s.activo = 1
      `,
      [idServicio],
    );

    const header = headerRows[0];

    if (!header) {
      return null;
    }

    const configuracionId =
      header.configuracion_id === null
        ? await this.ensureConfiguracionOperativaActiva(
            Number(header.servicio_id),
          )
        : Number(header.configuracion_id);

    await this.ensureTurnosConfigurados(
      Number(header.servicio_id),
      configuracionId,
    );
    await this.ensureIncidenciasPersonalesPersonalesConfigurados(
      configuracionId,
    );

    const codeRows = await this.queryRows<CodigoOperativoRow>(
      `
        SELECT
          cos.id AS codigo_operativo_servicio_id,
          cos.origen,
          cos.id_turno,
          cos.id_incidencia_personal,
          cos.codigo_visual,
          cos.etiqueta,
          cos.descripcion,
          cos.horas_equivalentes,
          cos.categoria,
          cos.color,
          cos.orden_visual,
          cos.es_laborable,
          cos.requiere_confirmacion,
          cos.activo,
          t.codigo AS turno_codigo,
          t.hora_inicio AS turno_hora_inicio,
          t.hora_fin AS turno_hora_fin,
          td.codigo AS incidencia_personal_codigo,
          td.alcance AS incidencia_personal_alcance
        FROM dbo.codigo_operativo_servicio cos
        LEFT JOIN dbo.turno t
          ON t.id = cos.id_turno
        LEFT JOIN dbo.incidencia_personal td
          ON td.id = cos.id_incidencia_personal
        WHERE cos.id_configuracion_operativa_servicio = @0
          AND cos.activo = 1
          AND (cos.id_turno IS NULL OR t.activo = 1)
          AND (
            cos.id_incidencia_personal IS NULL
            OR (
              td.activo = 1
              AND ISNULL(td.alcance, 'PERSONAL') <> 'GENERAL'
            )
          )
        ORDER BY cos.orden_visual ASC, cos.codigo_visual ASC
      `,
      [configuracionId],
    );

    const configuracion: ConfiguracionOperativaServicio = {
      id: configuracionId,
      idServicio: Number(header.servicio_id),
      codigoServicio: header.servicio_codigo,
      nombreServicio: header.servicio_nombre,
      modoVisualDefault: normalizeModoVisual(header.modo_visual_default),
      permiteMultiRegistroDia: Boolean(header.permite_multi_registro_dia),
      usaEquivalenciaHorariaExportacion: Boolean(
        header.usa_equivalencia_horaria_exportacion,
      ),
      codigosPermitidos: await this.attachTramos(
        codeRows
          .map(mapCodigoOperativoConfigurado)
          .filter(permiteCodigoOperativoEnMatriz),
      ),
    };

    this.writeToCache(cacheKey, configuracion);
    return configuracion;
  }

  async resolverCodigoOperativoEnPlanificacion(
    idPlanificacion: number,
    idCodigoOperativoServicio: number,
  ): Promise<CodigoOperativoServicio | null> {
    const row = await this.dataSource
      .query(
        `
          SELECT
            cos.id AS codigo_operativo_servicio_id,
            cos.origen,
            cos.id_turno,
            cos.id_incidencia_personal,
            cos.codigo_visual,
            cos.etiqueta,
            cos.descripcion,
            cos.horas_equivalentes,
            cos.categoria,
            cos.color,
            cos.orden_visual,
            cos.es_laborable,
            cos.requiere_confirmacion,
            cos.activo,
            t.codigo AS turno_codigo,
            t.hora_inicio AS turno_hora_inicio,
            t.hora_fin AS turno_hora_fin,
            td.codigo AS incidencia_personal_codigo,
            td.alcance AS incidencia_personal_alcance
          FROM dbo.planificacion p
          INNER JOIN dbo.configuracion_operativa_servicio cfg
            ON (
              (p.id_servicio IS NOT NULL AND cfg.id_servicio = p.id_servicio)
              OR
              (p.id_departamento IS NOT NULL AND cfg.id_departamento = p.id_departamento)
            )
            AND cfg.activo = 1
          INNER JOIN dbo.codigo_operativo_servicio cos
            ON cos.id_configuracion_operativa_servicio = cfg.id
           AND cos.activo = 1
          LEFT JOIN dbo.turno t
            ON t.id = cos.id_turno
          LEFT JOIN dbo.incidencia_personal td
            ON td.id = cos.id_incidencia_personal
          WHERE p.id = @0
            AND p.activo = 1
            AND cos.id = @1
            AND (
              cos.id_incidencia_personal IS NULL
              OR (
                td.activo = 1
                AND ISNULL(td.alcance, 'PERSONAL') <> 'GENERAL'
              )
            )
        `,
        [idPlanificacion, idCodigoOperativoServicio],
      )
      .then((rows: CodigoOperativoRow[]) => rows[0] ?? null);

    return row ? mapCodigoOperativoConfigurado(row) : null;
  }

  async guardarConfiguracionServicio(
    input: ActualizarConfiguracionOperativaServicioInput,
  ): Promise<ConfiguracionOperativaServicio> {
    const configuracionId = await this.ensureConfiguracionOperativaActiva(
      input.idServicio,
    );
    const codigosExistentes = await this.queryIdRows(
      `
        SELECT id
        FROM dbo.codigo_operativo_servicio
        WHERE id_configuracion_operativa_servicio = @0
      `,
      [configuracionId],
    );
    const idsPermitidos = new Set(
      codigosExistentes.map((row) => Number(row.id)),
    );

    for (const codigo of input.codigos) {
      if (!idsPermitidos.has(codigo.id)) {
        // Pasa si la pantalla quedo abierta mientras otro usuario cambiaba los
        // horarios o incidencias del servicio: los codigos que envia ya no son suyos.
        new Logger(TypeOrmConfiguracionOperativaServicioRepository.name).warn(
          `Codigo operativo id=${codigo.id} no pertenece a servicio=${input.idServicio}.`,
        );
        throw new ConflictException(
          'Algunos codigos de la configuracion cambiaron desde que abriste la pantalla. ' +
            'Actualiza la pantalla e intenta de nuevo.',
        );
      }
    }

    await this.dataSource.query(
      `
        UPDATE dbo.configuracion_operativa_servicio
        SET
          modo_visual_default = @1,
          permite_multi_registro_dia = @2,
          usa_equivalencia_horaria_exportacion = @3,
          updated_at = GETDATE()
        WHERE id = @0
      `,
      [
        configuracionId,
        input.modoVisualDefault,
        input.permiteMultiRegistroDia ? 1 : 0,
        input.usaEquivalenciaHorariaExportacion ? 1 : 0,
      ],
    );

    for (const codigo of input.codigos) {
      await this.dataSource.query(
        `
          UPDATE dbo.codigo_operativo_servicio
          SET
            codigo_visual = @1,
            etiqueta = @2,
            descripcion = @3,
            color = @4,
            orden_visual = @5,
            activo = @6,
            updated_at = GETDATE()
          WHERE id = @0
        `,
        [
          codigo.id,
          codigo.codigoVisual.trim(),
          codigo.etiqueta.trim(),
          codigo.descripcion?.trim() || null,
          codigo.color?.trim() || null,
          codigo.ordenVisual,
          codigo.activo ? 1 : 0,
        ],
      );
    }

    this.configuracionCache.clear();
    const configuracion = await this.obtenerPorServicio(input.idServicio);

    if (!configuracion) {
      throw errorAlConfirmarGuardado(
        'configuracionOperativa',
        input.idServicio,
        TypeOrmConfiguracionOperativaServicioRepository.name,
      );
    }

    return configuracion;
  }

  async actualizarCodigoVisual(
    id: number,
    patch: { codigoVisual?: string; etiqueta?: string; color?: string },
  ): Promise<void> {
    const setClauses: string[] = ['updated_at = GETDATE()'];
    const params: unknown[] = [id];

    if (patch.codigoVisual !== undefined) {
      setClauses.push(`codigo_visual = @${params.length}`);
      params.push(patch.codigoVisual.trim());
    }

    if (patch.etiqueta !== undefined) {
      setClauses.push(`etiqueta = @${params.length}`);
      params.push(patch.etiqueta.trim());
    }

    if (patch.color !== undefined) {
      setClauses.push(`color = @${params.length}`);
      params.push(patch.color.trim() || null);
    }

    await this.dataSource.query(
      `UPDATE dbo.codigo_operativo_servicio SET ${setClauses.join(', ')} WHERE id = @0`,
      params,
    );

    this.configuracionCache.clear();
  }

  async obtenerPorDepartamento(
    idDepartamento: number,
  ): Promise<ConfiguracionOperativaDepartamento | null> {
    const cacheKey = this.buildCacheKey('departamento', idDepartamento);
    const cached = this.readFromCache(cacheKey);
    if (cached) {
      return cached as ConfiguracionOperativaDepartamento;
    }

    const headerRows = await this.queryRows<DepartamentoHeaderRow>(
      `
        SELECT
          cos.id AS configuracion_id,
          d.id AS departamento_id,
          d.codigo AS departamento_codigo,
          d.nombre AS departamento_nombre,
          cos.modo_visual_default,
          cos.permite_multi_registro_dia,
          cos.usa_equivalencia_horaria_exportacion
        FROM dbo.departamento d
        LEFT JOIN dbo.configuracion_operativa_servicio cos
          ON cos.id_departamento = d.id
         AND cos.activo = 1
        WHERE d.id = @0
          AND d.activo = 1
      `,
      [idDepartamento],
    );

    const header = headerRows[0];

    if (!header) {
      return null;
    }

    const configuracionId =
      header.configuracion_id === null
        ? await this.ensureConfiguracionOperativaDepartamentoActiva(
            Number(header.departamento_id),
          )
        : Number(header.configuracion_id);

    await this.ensureTurnosDepartamentoConfigurados(
      Number(header.departamento_id),
      configuracionId,
    );
    await this.ensureIncidenciasPersonalesPersonalesConfigurados(
      configuracionId,
    );

    const codeRows = await this.queryRows<CodigoOperativoRow>(
      `
        SELECT
          cos.id AS codigo_operativo_servicio_id,
          cos.origen,
          cos.id_turno,
          cos.id_incidencia_personal,
          cos.codigo_visual,
          cos.etiqueta,
          cos.descripcion,
          cos.horas_equivalentes,
          cos.categoria,
          cos.color,
          cos.orden_visual,
          cos.es_laborable,
          cos.requiere_confirmacion,
          cos.activo,
          t.codigo AS turno_codigo,
          t.hora_inicio AS turno_hora_inicio,
          t.hora_fin AS turno_hora_fin,
          td.codigo AS incidencia_personal_codigo,
          td.alcance AS incidencia_personal_alcance
        FROM dbo.codigo_operativo_servicio cos
        LEFT JOIN dbo.turno t
          ON t.id = cos.id_turno
        LEFT JOIN dbo.incidencia_personal td
          ON td.id = cos.id_incidencia_personal
        WHERE cos.id_configuracion_operativa_servicio = @0
          AND cos.activo = 1
          AND (cos.id_turno IS NULL OR t.activo = 1)
          AND (
            cos.id_incidencia_personal IS NULL
            OR (
              td.activo = 1
              AND ISNULL(td.alcance, 'PERSONAL') <> 'GENERAL'
            )
          )
        ORDER BY cos.orden_visual ASC, cos.codigo_visual ASC
      `,
      [configuracionId],
    );

    const configuracion: ConfiguracionOperativaDepartamento = {
      id: configuracionId,
      idDepartamento: Number(header.departamento_id),
      codigoDepartamento: header.departamento_codigo,
      nombreDepartamento: header.departamento_nombre,
      modoVisualDefault: normalizeModoVisual(header.modo_visual_default),
      permiteMultiRegistroDia: Boolean(header.permite_multi_registro_dia),
      usaEquivalenciaHorariaExportacion: Boolean(
        header.usa_equivalencia_horaria_exportacion,
      ),
      codigosPermitidos: await this.attachTramos(
        codeRows
          .map(mapCodigoOperativoConfigurado)
          .filter(permiteCodigoOperativoEnMatriz),
      ),
    };

    this.writeToCache(cacheKey, configuracion);
    return configuracion;
  }

  async guardarConfiguracionDepartamento(
    input: ActualizarConfiguracionOperativaDepartamentoInput,
  ): Promise<ConfiguracionOperativaDepartamento> {
    const configuracionId =
      await this.ensureConfiguracionOperativaDepartamentoActiva(
        input.idDepartamento,
      );

    const codigosExistentes = await this.queryIdRows(
      `
        SELECT id
        FROM dbo.codigo_operativo_servicio
        WHERE id_configuracion_operativa_servicio = @0
      `,
      [configuracionId],
    );

    const idsPermitidos = new Set(
      codigosExistentes.map((row) => Number(row.id)),
    );

    for (const codigo of input.codigos) {
      if (!idsPermitidos.has(codigo.id)) {
        // Pasa si la pantalla quedo abierta mientras otro usuario cambiaba los
        // horarios o incidencias del departamento: los codigos que envia ya no son suyos.
        new Logger(TypeOrmConfiguracionOperativaServicioRepository.name).warn(
          `Codigo operativo id=${codigo.id} no pertenece a departamento=${input.idDepartamento}.`,
        );
        throw new ConflictException(
          'Algunos codigos de la configuracion cambiaron desde que abriste la pantalla. ' +
            'Actualiza la pantalla e intenta de nuevo.',
        );
      }
    }

    await this.dataSource.query(
      `
        UPDATE dbo.configuracion_operativa_servicio
        SET
          modo_visual_default = @1,
          permite_multi_registro_dia = @2,
          usa_equivalencia_horaria_exportacion = @3,
          updated_at = GETDATE()
        WHERE id = @0
      `,
      [
        configuracionId,
        input.modoVisualDefault,
        input.permiteMultiRegistroDia ? 1 : 0,
        input.usaEquivalenciaHorariaExportacion ? 1 : 0,
      ],
    );

    for (const codigo of input.codigos) {
      await this.dataSource.query(
        `
          UPDATE dbo.codigo_operativo_servicio
          SET
            codigo_visual = @1,
            etiqueta = @2,
            descripcion = @3,
            color = @4,
            orden_visual = @5,
            activo = @6,
            updated_at = GETDATE()
          WHERE id = @0
        `,
        [
          codigo.id,
          codigo.codigoVisual.trim(),
          codigo.etiqueta.trim(),
          codigo.descripcion?.trim() || null,
          codigo.color?.trim() || null,
          codigo.ordenVisual,
          codigo.activo ? 1 : 0,
        ],
      );
    }

    this.configuracionCache.clear();
    const configuracion = await this.obtenerPorDepartamento(
      input.idDepartamento,
    );

    if (!configuracion) {
      throw errorAlConfirmarGuardado(
        'configuracionOperativa',
        input.idDepartamento,
        TypeOrmConfiguracionOperativaServicioRepository.name,
      );
    }

    return configuracion;
  }

  private async buscarConfiguracionDepartamentoActivaId(
    idDepartamento: number,
  ): Promise<number | null> {
    const rows = await this.queryIdRows(
      `
        SELECT TOP 1 id
        FROM dbo.configuracion_operativa_servicio
        WHERE id_departamento = @0
          AND activo = 1
      `,
      [idDepartamento],
    );

    return rows[0] ? Number(rows[0].id) : null;
  }

  private async ensureConfiguracionOperativaDepartamentoActiva(
    idDepartamento: number,
  ): Promise<number> {
    const existente =
      await this.buscarConfiguracionDepartamentoActivaId(idDepartamento);
    if (existente) {
      return existente;
    }

    // Misma carrera SELECT/INSERT documentada en ensureConfiguracionOperativaActiva,
    // protegida por uq_configuracion_operativa_servicio_id_departamento (migracion 034).
    let configuracionId: number;
    try {
      const inserted = await this.queryIdRows(
        `
          INSERT INTO dbo.configuracion_operativa_servicio
          (
            id_servicio,
            id_departamento,
            modo_visual_default,
            permite_multi_registro_dia,
            usa_equivalencia_horaria_exportacion,
            activo
          )
          OUTPUT INSERTED.id AS id
          VALUES
          (
            NULL,
            @0,
            'ETIQUETAS',
            1,
            1,
            1
          )
        `,
        [idDepartamento],
      );
      configuracionId = Number(inserted[0]?.id);
    } catch (error) {
      if (!esErrorDeClaveDuplicada(error)) {
        throw error;
      }

      const ganadora =
        await this.buscarConfiguracionDepartamentoActivaId(idDepartamento);
      if (!ganadora) {
        throw error;
      }
      configuracionId = ganadora;
    }

    await this.ensureIncidenciasPersonalesPersonalesConfigurados(
      configuracionId,
    );
    return configuracionId;
  }

  private async ensureTurnosConfigurados(
    idServicio: number,
    configuracionId: number,
  ): Promise<void> {
    const rows = await this.queryRows<FallbackTurnoRow>(
      `
        SELECT
          t.id AS id_turno,
          t.codigo AS turno_codigo,
          t.nombre AS turno_nombre,
          t.hora_inicio AS turno_hora_inicio,
          t.hora_fin AS turno_hora_fin,
          t.duracion_horas
        FROM dbo.turno t
        WHERE t.id_servicio = @0
          AND t.activo = 1
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.codigo_operativo_servicio cos
            WHERE cos.id_configuracion_operativa_servicio = @1
              AND cos.id_turno = t.id
          )
      `,
      [idServicio, configuracionId],
    );

    for (const row of rows) {
      await this.insertIgnorandoDuplicados(
        `
          INSERT INTO dbo.codigo_operativo_servicio
          (
            id_configuracion_operativa_servicio,
            origen,
            id_turno,
            id_incidencia_personal,
            codigo_visual,
            etiqueta,
            descripcion,
            horas_equivalentes,
            categoria,
            color,
            orden_visual,
            es_laborable,
            requiere_confirmacion,
            activo
          )
          VALUES
          (
            @0,
            'TURNO',
            @1,
            NULL,
            @2,
            @3,
            @4,
            @5,
            'TRABAJO',
            @6,
            0,
            1,
            0,
            1
          )
        `,
        [
          configuracionId,
          Number(row.id_turno),
          '',
          '',
          row.turno_nombre || row.turno_codigo,
          Number(row.duracion_horas),
          await this.resolveNextTurnoColor(configuracionId),
        ],
      );
    }

    // La coloracion solo puede quedar pendiente si esta pasada inserto un
    // turno nuevo (los ya coloreados no se tocan); saltarla en el caso comun
    // (nada nuevo que provisionar) evita un SELECT mas en cada carga de la
    // matriz (ver docs/rendimiento/analisis-lentitud-matriz-mensual.md).
    if (rows.length > 0) {
      await this.ensureTurnoColors(configuracionId);
    }
  }

  private async ensureTurnosDepartamentoConfigurados(
    idDepartamento: number,
    configuracionId: number,
  ): Promise<void> {
    const rows = await this.queryRows<FallbackTurnoRow>(
      `
        SELECT
          t.id AS id_turno,
          t.codigo AS turno_codigo,
          t.nombre AS turno_nombre,
          t.hora_inicio AS turno_hora_inicio,
          t.hora_fin AS turno_hora_fin,
          t.duracion_horas
        FROM dbo.turno t
        WHERE t.id_departamento = @0
          AND t.activo = 1
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.codigo_operativo_servicio cos
            WHERE cos.id_configuracion_operativa_servicio = @1
              AND cos.id_turno = t.id
          )
      `,
      [idDepartamento, configuracionId],
    );

    for (const row of rows) {
      await this.insertIgnorandoDuplicados(
        `
          INSERT INTO dbo.codigo_operativo_servicio
          (
            id_configuracion_operativa_servicio,
            origen,
            id_turno,
            id_incidencia_personal,
            codigo_visual,
            etiqueta,
            descripcion,
            horas_equivalentes,
            categoria,
            color,
            orden_visual,
            es_laborable,
            requiere_confirmacion,
            activo
          )
          VALUES
          (
            @0,
            'TURNO',
            @1,
            NULL,
            @2,
            @3,
            @4,
            @5,
            'TRABAJO',
            @6,
            0,
            1,
            0,
            1
          )
        `,
        [
          configuracionId,
          Number(row.id_turno),
          '',
          '',
          row.turno_nombre || row.turno_codigo,
          Number(row.duracion_horas),
          await this.resolveNextTurnoColor(configuracionId),
        ],
      );
    }

    if (rows.length > 0) {
      await this.ensureTurnoColors(configuracionId);
    }
  }

  private async ensureTurnoColors(configuracionId: number): Promise<void> {
    const rows = await this.queryRows<{
      id: number | string;
      color: string | null;
    }>(
      `
        SELECT id, color
        FROM dbo.codigo_operativo_servicio
        WHERE id_configuracion_operativa_servicio = @0
          AND origen = 'TURNO'
          AND activo = 1
        ORDER BY orden_visual ASC, id ASC
      `,
      [configuracionId],
    );

    const usedColors = new Set(
      rows
        .map((row) => row.color?.trim().toUpperCase() || null)
        .filter((color): color is string => Boolean(color)),
    );

    for (const row of rows) {
      if (row.color?.trim()) {
        continue;
      }

      const nextColor = this.pickNextOperationalTurnoColor(usedColors);
      usedColors.add(nextColor.toUpperCase());

      await this.dataSource.query(
        `
          UPDATE dbo.codigo_operativo_servicio
          SET
            color = @1,
            updated_at = GETDATE()
          WHERE id = @0
        `,
        [Number(row.id), nextColor],
      );
    }
  }

  private async resolveNextTurnoColor(
    configuracionId: number,
  ): Promise<string> {
    const rows = await this.queryRows<{ color: string | null }>(
      `
        SELECT color
        FROM dbo.codigo_operativo_servicio
        WHERE id_configuracion_operativa_servicio = @0
          AND origen = 'TURNO'
          AND activo = 1
          AND color IS NOT NULL
      `,
      [configuracionId],
    );

    const usedColors = new Set(
      rows
        .map((row) => row.color?.trim().toUpperCase() || null)
        .filter((color): color is string => Boolean(color)),
    );

    return this.pickNextOperationalTurnoColor(usedColors);
  }

  private pickNextOperationalTurnoColor(usedColors: Set<string>): string {
    const nextColor =
      TypeOrmConfiguracionOperativaServicioRepository.DEFAULT_TURNO_COLORS.find(
        (color) => !usedColors.has(color.toUpperCase()),
      );

    if (nextColor) {
      return nextColor;
    }

    const paletteIndex =
      usedColors.size %
      TypeOrmConfiguracionOperativaServicioRepository.DEFAULT_TURNO_COLORS
        .length;

    return TypeOrmConfiguracionOperativaServicioRepository.DEFAULT_TURNO_COLORS[
      paletteIndex
    ];
  }

  private async buscarConfiguracionServicioActivaId(
    idServicio: number,
  ): Promise<number | null> {
    const rows = await this.queryIdRows(
      `
        SELECT TOP 1 id
        FROM dbo.configuracion_operativa_servicio
        WHERE id_servicio = @0
          AND activo = 1
      `,
      [idServicio],
    );

    return rows[0] ? Number(rows[0].id) : null;
  }

  private async ensureConfiguracionOperativaActiva(
    idServicio: number,
  ): Promise<number> {
    const existente =
      await this.buscarConfiguracionServicioActivaId(idServicio);
    if (existente) {
      return existente;
    }

    // El SELECT y el INSERT corren en pasos separados sin transaccion: si dos
    // requests concurrentes (ej. matriz y configuracion-operativa pedidas en
    // paralelo al abrir una planificacion recien creada) llegan casi juntas,
    // ambas pueden ver "no existe" antes de que la otra confirme su INSERT.
    // El indice unico uq_configuracion_operativa_servicio_id_servicio (migracion
    // 034) evita que se duplique la fila; aqui absorbemos ese conflicto esperado
    // en vez de propagarlo como 500, mismo patron que insertIgnorandoDuplicados
    // usa para codigo_operativo_servicio.
    let configuracionId: number;
    try {
      const inserted = await this.queryIdRows(
        `
          INSERT INTO dbo.configuracion_operativa_servicio
          (
            id_servicio,
            modo_visual_default,
            permite_multi_registro_dia,
            usa_equivalencia_horaria_exportacion,
            activo
          )
          OUTPUT INSERTED.id AS id
          VALUES
          (
            @0,
            'ETIQUETAS',
            1,
            1,
            1
          )
        `,
        [idServicio],
      );
      configuracionId = Number(inserted[0]?.id);
    } catch (error) {
      if (!esErrorDeClaveDuplicada(error)) {
        throw error;
      }

      const ganadora =
        await this.buscarConfiguracionServicioActivaId(idServicio);
      if (!ganadora) {
        throw error;
      }
      configuracionId = ganadora;
    }

    await this.ensureTurnosConfigurados(idServicio, configuracionId);
    await this.ensureIncidenciasPersonalesPersonalesConfigurados(
      configuracionId,
    );
    return configuracionId;
  }

  private async ensureIncidenciasPersonalesPersonalesConfigurados(
    configuracionId: number,
  ): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE cos
        SET
          cos.activo = 0,
          cos.updated_at = GETDATE()
        FROM dbo.codigo_operativo_servicio cos
        LEFT JOIN dbo.incidencia_personal td
          ON td.id = cos.id_incidencia_personal
        WHERE cos.id_configuracion_operativa_servicio = @0
          AND cos.origen = 'TIPO_DIA'
          AND cos.activo = 1
          AND (
            td.id IS NULL
            OR td.activo = 0
            OR ISNULL(td.alcance, 'PERSONAL') = 'GENERAL'
          )
      `,
      [configuracionId],
    );

    const existentes = await this.queryRows<
      FallbackIncidenciaPersonalRow & {
        id_codigo_operativo_servicio: number | string;
        cos_codigo_visual: string;
        cos_etiqueta: string;
        cos_descripcion: string | null;
        cos_horas_equivalentes: number | string;
        cos_categoria: string;
        cos_es_laborable: boolean | number;
      }
    >(
      `
        SELECT
          cos.id AS id_codigo_operativo_servicio,
          cos.codigo_visual AS cos_codigo_visual,
          cos.etiqueta AS cos_etiqueta,
          cos.descripcion AS cos_descripcion,
          cos.horas_equivalentes AS cos_horas_equivalentes,
          cos.categoria AS cos_categoria,
          cos.es_laborable AS cos_es_laborable,
          td.id AS id_incidencia_personal,
          td.codigo AS incidencia_personal_codigo,
          td.nombre AS incidencia_personal_nombre,
          td.descripcion AS incidencia_personal_descripcion,
          td.alcance AS incidencia_personal_alcance,
          td.es_laborable,
          td.genera_horas_trabajadas
        FROM dbo.codigo_operativo_servicio cos
        INNER JOIN dbo.incidencia_personal td
          ON td.id = cos.id_incidencia_personal
        WHERE cos.id_configuracion_operativa_servicio = @0
          AND cos.origen = 'TIPO_DIA'
          AND td.activo = 1
          AND ISNULL(td.alcance, 'PERSONAL') <> 'GENERAL'
      `,
      [configuracionId],
    );

    for (const row of existentes) {
      const codigoVisual = fallbackCodigoIncidenciaPersonal(
        row.incidencia_personal_codigo,
      );
      const etiqueta = row.incidencia_personal_nombre;
      const descripcion =
        row.incidencia_personal_descripcion ?? row.incidencia_personal_nombre;
      const horasEquivalentes =
        Number(row.es_laborable) && Number(row.genera_horas_trabajadas) ? 1 : 0;
      const categoria = fallbackCategoriaIncidenciaPersonal(
        row.incidencia_personal_codigo,
      );
      const esLaborable = Boolean(row.es_laborable);

      // Sincronizacion idempotente: la mayoria de las lecturas de la matriz no
      // tienen nada que sincronizar (nadie edito el catalogo desde la ultima
      // vez), asi que saltar el UPDATE cuando los valores ya coinciden evita
      // N escrituras innecesarias en cada carga (ver docs/rendimiento/analisis-lentitud-matriz-mensual.md).
      const yaSincronizado =
        row.cos_codigo_visual === codigoVisual &&
        row.cos_etiqueta === etiqueta &&
        (row.cos_descripcion ?? null) === (descripcion ?? null) &&
        Number(row.cos_horas_equivalentes) === horasEquivalentes &&
        row.cos_categoria === categoria &&
        Boolean(row.cos_es_laborable) === esLaborable;

      if (yaSincronizado) {
        continue;
      }

      await this.dataSource.query(
        `
          UPDATE dbo.codigo_operativo_servicio
          SET
            codigo_visual = @1,
            etiqueta = @2,
            descripcion = @3,
            horas_equivalentes = @4,
            categoria = @5,
            es_laborable = @6,
            updated_at = GETDATE()
          WHERE id = @0
        `,
        [
          Number(row.id_codigo_operativo_servicio),
          codigoVisual,
          etiqueta,
          descripcion,
          horasEquivalentes,
          categoria,
          esLaborable,
        ],
      );
    }

    const rows = await this.queryRows<FallbackIncidenciaPersonalRow>(
      `
        SELECT
          td.id AS id_incidencia_personal,
          td.codigo AS incidencia_personal_codigo,
          td.nombre AS incidencia_personal_nombre,
          td.descripcion AS incidencia_personal_descripcion,
          td.alcance AS incidencia_personal_alcance,
          td.es_laborable,
          td.genera_horas_trabajadas
        FROM dbo.incidencia_personal td
        WHERE td.activo = 1
          AND ISNULL(td.alcance, 'PERSONAL') <> 'GENERAL'
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.codigo_operativo_servicio cos
            WHERE cos.id_configuracion_operativa_servicio = @0
              AND cos.id_incidencia_personal = td.id
          )
        ORDER BY td.codigo ASC
      `,
      [configuracionId],
    );

    let orderVisual = 1000;

    for (const row of rows) {
      await this.insertIgnorandoDuplicados(
        `
          INSERT INTO dbo.codigo_operativo_servicio
          (
            id_configuracion_operativa_servicio,
            origen,
            id_turno,
            id_incidencia_personal,
            codigo_visual,
            etiqueta,
            descripcion,
            horas_equivalentes,
            categoria,
            color,
            orden_visual,
            es_laborable,
            requiere_confirmacion,
            activo
          )
          VALUES
          (
            @0,
            'TIPO_DIA',
            NULL,
            @1,
            @2,
            @3,
            @4,
            @5,
            @6,
            NULL,
            @7,
            @8,
            0,
            1
          )
        `,
        [
          configuracionId,
          Number(row.id_incidencia_personal),
          fallbackCodigoIncidenciaPersonal(row.incidencia_personal_codigo),
          row.incidencia_personal_nombre,
          row.incidencia_personal_descripcion ?? row.incidencia_personal_nombre,
          Number(row.es_laborable) && Number(row.genera_horas_trabajadas)
            ? 1
            : 0,
          fallbackCategoriaIncidenciaPersonal(row.incidencia_personal_codigo),
          orderVisual,
          Boolean(row.es_laborable),
        ],
      );
      orderVisual += 10;
    }
  }

  private async attachTramos(
    codigos: CodigoOperativoServicio[],
  ): Promise<CodigoOperativoServicio[]> {
    const idTurnos = [
      ...new Set(
        codigos
          .filter((c) => c.origen === 'TURNO' && c.idTurno !== null)
          .map((c) => c.idTurno as number),
      ),
    ];

    if (idTurnos.length === 0) {
      return codigos;
    }

    const tramosPorTurno = await this.fetchTramosPorTurnos(idTurnos);

    for (const codigo of codigos) {
      if (codigo.origen === 'TURNO' && codigo.idTurno !== null) {
        codigo.tramos = tramosPorTurno.get(codigo.idTurno) ?? [];
      }
    }

    return codigos;
  }

  private async fetchTramosPorTurnos(
    idTurnos: number[],
  ): Promise<Map<number, TramoCodigoOperativo[]>> {
    const placeholders = idTurnos.map((_, i) => `@${i}`).join(', ');
    const rows = await this.queryRows<{
      id_turno: number | string;
      orden: number | string;
      hora_inicio: string;
      hora_fin: string;
      duracion_horas: number | string;
      cruza_medianoche: boolean | number;
    }>(
      `
        SELECT id_turno, orden, hora_inicio, hora_fin, duracion_horas, cruza_medianoche
        FROM dbo.turno_tramo
        WHERE id_turno IN (${placeholders})
          AND activo = 1
        ORDER BY id_turno ASC, orden ASC
      `,
      idTurnos,
    );

    const result = new Map<number, TramoCodigoOperativo[]>();

    for (const r of rows) {
      const idTurno = Number(r.id_turno);
      if (!result.has(idTurno)) {
        result.set(idTurno, []);
      }
      result.get(idTurno)!.push({
        orden: Number(r.orden),
        horaInicio: r.hora_inicio,
        horaFin: r.hora_fin,
        duracionHoras: Number(r.duracion_horas),
        cruzaMedianoche: Boolean(r.cruza_medianoche),
      });
    }

    return result;
  }

  // El auto-aprovisionamiento (ensureTurnos*/ensureIncidenciasPersonales*) hace un
  // SELECT NOT EXISTS y luego INSERT en pasos separados: si dos requests concurrentes
  // (doble clic, dos pestanas) llegan a la vez, ambas pueden pasar el NOT EXISTS antes
  // de que la otra confirme su INSERT. El indice unico uq_codigo_operativo_servicio_config_origen_ref
  // (migracion 044) evita que eso duplique la fila; aqui solo absorbemos ese conflicto
  // esperado en vez de convertirlo en un error 500 visible para el usuario.
  private async insertIgnorandoDuplicados(
    sql: string,
    params: unknown[],
  ): Promise<void> {
    try {
      await this.dataSource.query(sql, params);
    } catch (error) {
      if (!esErrorDeClaveDuplicada(error)) {
        throw error;
      }
    }
  }

  private buildCacheKey(tipo: 'servicio' | 'departamento', id: number): string {
    return `${tipo}:${id}`;
  }

  private readFromCache(
    key: string,
  ):
    | ConfiguracionOperativaServicio
    | ConfiguracionOperativaDepartamento
    | null {
    const entry = this.configuracionCache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < Date.now()) {
      this.configuracionCache.delete(key);
      return null;
    }

    return entry.value;
  }

  private writeToCache(
    key: string,
    value: ConfiguracionOperativaServicio | ConfiguracionOperativaDepartamento,
  ): void {
    this.configuracionCache.set(key, {
      value,
      expiresAt:
        Date.now() +
        TypeOrmConfiguracionOperativaServicioRepository.CONFIGURACION_CACHE_TTL_MS,
    });
  }

  private async queryIdRows(
    sql: string,
    params: unknown[],
  ): Promise<Array<{ id: number | string }>> {
    return this.dataSource.query(sql, params);
  }

  private async queryRows<T>(sql: string, params?: unknown[]): Promise<T[]> {
    return this.dataSource.query(sql, params);
  }
}

function mapCodigoOperativoConfigurado(
  row: CodigoOperativoRow,
): CodigoOperativoServicio {
  return {
    id: Number(row.codigo_operativo_servicio_id),
    origen: row.origen as 'TURNO' | 'TIPO_DIA',
    idTurno: row.id_turno === null ? null : Number(row.id_turno),
    idIncidenciaPersonal:
      row.id_incidencia_personal === null
        ? null
        : Number(row.id_incidencia_personal),
    alcanceIncidenciaPersonal:
      row.id_incidencia_personal === null
        ? null
        : (row.incidencia_personal_alcance as AlcanceIncidenciaPersonalOperativo),
    codigoInterno:
      row.turno_codigo ?? row.incidencia_personal_codigo ?? row.codigo_visual,
    codigoVisual: row.codigo_visual,
    etiqueta: row.etiqueta,
    descripcion: row.descripcion,
    horasEquivalentes: Number(row.horas_equivalentes),
    horaInicio: row.turno_hora_inicio,
    horaFin: row.turno_hora_fin,
    tramos: [],
    categoria: row.categoria as CodigoOperativoServicio['categoria'],
    color: row.color,
    ordenVisual: Number(row.orden_visual),
    esLaborable: Boolean(row.es_laborable),
    requiereConfirmacion: Boolean(row.requiere_confirmacion),
    activo: Boolean(row.activo),
  };
}

// SQL Server 2627: violacion de constraint UNIQUE. 2601: violacion de indice UNIQUE.
function esErrorDeClaveDuplicada(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError = (error as { driverError?: { number?: number } })
    .driverError;
  return driverError?.number === 2627 || driverError?.number === 2601;
}

function permiteCodigoOperativoEnMatriz(
  codigo: CodigoOperativoServicio,
): boolean {
  return (
    codigo.origen !== 'TIPO_DIA' ||
    codigo.alcanceIncidenciaPersonal !== 'GENERAL'
  );
}

function normalizeModoVisual(value: string | null): 'ETIQUETAS' | 'NUMERICO' {
  return value === 'NUMERICO' ? 'NUMERICO' : 'ETIQUETAS';
}

function fallbackCodigoIncidenciaPersonal(codigo: string): string {
  switch (codigo) {
    case 'LICENCIA':
      return 'LI';
    case 'VACACION':
      return 'VA';
    case 'FERIADO':
      return 'FN';
    case 'BAJA_MEDICA':
      return 'BM';
    case 'DESCANSO':
      return 'DE';
    case 'PERMISO':
      return 'PE';
    case 'FALTA':
      return 'FA';
    case 'COMISION':
      return 'CO';
    default:
      return codigo;
  }
}

function fallbackCategoriaIncidenciaPersonal(
  codigo: string,
): CodigoOperativoServicio['categoria'] {
  switch (codigo) {
    case 'LICENCIA':
      return 'LICENCIA';
    case 'VACACION':
      return 'VACACION';
    case 'FERIADO':
      return 'FERIADO';
    case 'BAJA_MEDICA':
      return 'LICENCIA';
    default:
      return 'DESCANSO';
  }
}

interface PlanificacionServicioRow {
  planificacion_id: number | string;
  id_servicio: number | string | null;
  id_departamento: number | string | null;
}

interface ConfiguracionHeaderRow {
  configuracion_id: number | string | null;
  servicio_id: number | string;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  modo_visual_default: string | null;
  permite_multi_registro_dia: boolean | number;
  usa_equivalencia_horaria_exportacion: boolean | number;
}

interface DepartamentoHeaderRow {
  configuracion_id: number | string | null;
  departamento_id: number | string;
  departamento_codigo: string | null;
  departamento_nombre: string | null;
  modo_visual_default: string | null;
  permite_multi_registro_dia: boolean | number;
  usa_equivalencia_horaria_exportacion: boolean | number;
}

interface CodigoOperativoRow {
  codigo_operativo_servicio_id: number | string;
  origen: string;
  id_turno: number | string | null;
  id_incidencia_personal: number | string | null;
  codigo_visual: string;
  etiqueta: string;
  descripcion: string | null;
  horas_equivalentes: number | string;
  categoria: string;
  color: string | null;
  orden_visual: number | string;
  es_laborable: boolean | number;
  requiere_confirmacion: boolean | number;
  activo: boolean | number;
  turno_codigo: string | null;
  turno_hora_inicio: string | null;
  turno_hora_fin: string | null;
  incidencia_personal_codigo: string | null;
  incidencia_personal_alcance: string | null;
}

interface FallbackTurnoRow {
  id_turno: number | string;
  turno_codigo: string;
  turno_nombre: string | null;
  turno_hora_inicio: string;
  turno_hora_fin: string;
  duracion_horas: number | string;
}

interface FallbackIncidenciaPersonalRow {
  id_incidencia_personal: number | string;
  incidencia_personal_codigo: string;
  incidencia_personal_nombre: string;
  incidencia_personal_descripcion: string | null;
  incidencia_personal_alcance: string;
  es_laborable: boolean | number;
  genera_horas_trabajadas: boolean | number;
}
