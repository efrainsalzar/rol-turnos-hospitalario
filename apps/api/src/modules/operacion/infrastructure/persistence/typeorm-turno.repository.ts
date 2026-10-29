import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { DepartamentoOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/departamento.orm-entity';
import { ServicioOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/servicio.orm-entity';
import { Turno } from '../../domain/entities/turno';
import { TurnoTramo } from '../../domain/entities/turno-tramo';
import {
  ImpactoUsoCatalogo,
  ResultadoLimpiezaCeldas,
  ResultadoPropagacionHorario,
} from '../../domain/entities/impacto-uso-catalogo';
import {
  GuardarTurnoInput,
  ListarTurnosFiltro,
  TurnoRepository,
} from '../../domain/repositories/turno.repository';
import { TurnoOrmEntity } from './entities/turno.orm-entity';

@Injectable()
export class TypeOrmTurnoRepository implements TurnoRepository {
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

  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(filtro: ListarTurnosFiltro): Promise<Turno[]> {
    const queryBuilder = this.dataSource
      .getRepository(TurnoOrmEntity)
      .createQueryBuilder('turno')
      .leftJoin(
        ServicioOrmEntity,
        'servicio',
        'servicio.id = turno.id_servicio',
      )
      .leftJoin(
        DepartamentoOrmEntity,
        'departamento',
        'departamento.id = turno.id_departamento',
      )
      .select([
        'turno.id AS turno_id',
        'turno.id_servicio AS turno_id_servicio',
        'turno.id_departamento AS turno_id_departamento',
        'turno.codigo AS turno_codigo',
        'turno.nombre AS turno_nombre',
        'turno.tipo_horario AS turno_tipo_horario',
        'turno.hora_inicio AS turno_hora_inicio',
        'turno.hora_fin AS turno_hora_fin',
        'turno.cruza_medianoche AS turno_cruza_medianoche',
        'turno.duracion_horas AS turno_duracion_horas',
        'turno.vigencia_desde AS turno_vigencia_desde',
        'turno.vigencia_hasta AS turno_vigencia_hasta',
        'turno.activo AS turno_activo',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'departamento.codigo AS departamento_codigo',
        'departamento.nombre AS departamento_nombre',
      ]);

    if (filtro.idServicio) {
      queryBuilder.andWhere('turno.id_servicio = :idServicio', {
        idServicio: filtro.idServicio,
      });
    } else if (filtro.idDepartamento) {
      // Muestra tanto los turnos directos del departamento como los turnos
      // de los servicios que pertenecen a ese departamento.
      queryBuilder.andWhere(
        '(turno.id_departamento = :idDepartamento OR turno.id_servicio IN (SELECT id FROM dbo.servicio WHERE id_departamento = :idDepartamento))',
        { idDepartamento: filtro.idDepartamento },
      );
    }

    if (typeof filtro.activo === 'boolean') {
      queryBuilder.andWhere('turno.activo = :activo', {
        activo: filtro.activo,
      });
    }

    const rows = await queryBuilder
      .orderBy('turno.hora_inicio', 'ASC')
      .getRawMany<RawTurnoRow>();

    const paginados = slicePage(rows, filtro.page, filtro.pageSize);
    const idTurnos = paginados.map((r) => Number(r.turno_id));
    const tramosPorTurno = await this.fetchTramosPorTurnos(idTurnos);
    const codigosPorTurno = await this.fetchCodigosVisualesPorTurnos(idTurnos);

    return paginados.map((row) =>
      mapRawToTurno(row, tramosPorTurno, codigosPorTurno),
    );
  }

  async contar(filtro: ListarTurnosFiltro): Promise<number> {
    const queryBuilder = this.dataSource
      .getRepository(TurnoOrmEntity)
      .createQueryBuilder('turno');

    if (filtro.idServicio) {
      queryBuilder.andWhere('turno.id_servicio = :idServicio', {
        idServicio: filtro.idServicio,
      });
    } else if (filtro.idDepartamento) {
      queryBuilder.andWhere(
        '(turno.id_departamento = :idDepartamento OR turno.id_servicio IN (SELECT id FROM dbo.servicio WHERE id_departamento = :idDepartamento))',
        { idDepartamento: filtro.idDepartamento },
      );
    }

    if (typeof filtro.activo === 'boolean') {
      queryBuilder.andWhere('turno.activo = :activo', {
        activo: filtro.activo,
      });
    }

    return queryBuilder.getCount();
  }

  async obtenerPorId(id: number): Promise<Turno | null> {
    const rows = await this.dataSource
      .getRepository(TurnoOrmEntity)
      .createQueryBuilder('turno')
      .leftJoin(
        ServicioOrmEntity,
        'servicio',
        'servicio.id = turno.id_servicio',
      )
      .leftJoin(
        DepartamentoOrmEntity,
        'departamento',
        'departamento.id = turno.id_departamento',
      )
      .select([
        'turno.id AS turno_id',
        'turno.id_servicio AS turno_id_servicio',
        'turno.id_departamento AS turno_id_departamento',
        'turno.codigo AS turno_codigo',
        'turno.nombre AS turno_nombre',
        'turno.tipo_horario AS turno_tipo_horario',
        'turno.hora_inicio AS turno_hora_inicio',
        'turno.hora_fin AS turno_hora_fin',
        'turno.cruza_medianoche AS turno_cruza_medianoche',
        'turno.duracion_horas AS turno_duracion_horas',
        'turno.vigencia_desde AS turno_vigencia_desde',
        'turno.vigencia_hasta AS turno_vigencia_hasta',
        'turno.activo AS turno_activo',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'departamento.codigo AS departamento_codigo',
        'departamento.nombre AS departamento_nombre',
      ])
      .where('turno.id = :id', { id })
      .getRawMany<RawTurnoRow>();

    const row = rows[0];

    if (!row) {
      return null;
    }

    const tramos = await this.fetchTramosPorTurno(Number(row.turno_id));
    const tramosPorTurno = new Map([[Number(row.turno_id), tramos]]);
    const codigosPorTurno = await this.fetchCodigosVisualesPorTurnos([
      Number(row.turno_id),
    ]);

    return mapRawToTurno(row, tramosPorTurno, codigosPorTurno);
  }

  async crear(input: GuardarTurnoInput): Promise<Turno> {
    assertXorScope(input);

    if (input.idServicio) {
      await this.assertServicioExiste(input.idServicio);
      await this.assertTurnoServicioDisponible(
        input.idServicio,
        input.codigo,
        input.vigenciaDesde,
        null,
      );
    } else {
      await this.assertDepartamentoExiste(input.idDepartamento!);
      await this.assertTurnoDepartamentoDisponible(
        input.idDepartamento!,
        input.codigo,
        input.vigenciaDesde,
        null,
      );
    }

    const rows = await this.queryIdRows(
      `
        INSERT INTO dbo.turno
        (
          id_servicio,
          id_departamento,
          codigo,
          nombre,
          tipo_horario,
          hora_inicio,
          hora_fin,
          cruza_medianoche,
          duracion_horas,
          vigencia_desde,
          vigencia_hasta,
          activo
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11)
      `,
      [
        input.idServicio ?? null,
        input.idDepartamento ?? null,
        input.codigo.trim().toUpperCase(),
        input.nombre.trim(),
        input.tipoHorario,
        input.horaInicio,
        input.horaFin,
        input.cruzaMedianoche,
        input.duracionHoras,
        input.vigenciaDesde,
        input.vigenciaHasta,
        input.activo,
      ],
    );

    const idTurno = Number(rows[0]?.id);
    await this.saveTramos(idTurno, input.tramos);

    const created = await this.obtenerPorId(idTurno);

    if (!created) {
      throw errorAlConfirmarGuardado(
        'turno',
        idTurno,
        TypeOrmTurnoRepository.name,
      );
    }

    if (created.idServicio) {
      await this.syncCodigoOperativoServicio(created, undefined, {
        codigoVisual: input.codigoVisual,
        etiqueta: input.etiqueta,
      });
    }

    return created;
  }

  async actualizar(id: number, input: GuardarTurnoInput): Promise<Turno> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('turno', id, TypeOrmTurnoRepository.name);
    }

    assertXorScope(input);

    if (input.idServicio) {
      await this.assertServicioExiste(input.idServicio);
      await this.assertTurnoServicioDisponible(
        input.idServicio,
        input.codigo,
        input.vigenciaDesde,
        id,
      );
    } else {
      await this.assertDepartamentoExiste(input.idDepartamento!);
      await this.assertTurnoDepartamentoDisponible(
        input.idDepartamento!,
        input.codigo,
        input.vigenciaDesde,
        id,
      );
    }

    await this.dataSource.query(
      `
        UPDATE dbo.turno
        SET
          id_servicio = @1,
          id_departamento = @2,
          codigo = @3,
          nombre = @4,
          tipo_horario = @5,
          hora_inicio = @6,
          hora_fin = @7,
          cruza_medianoche = @8,
          duracion_horas = @9,
          vigencia_desde = @10,
          vigencia_hasta = @11,
          activo = @12,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [
        id,
        input.idServicio ?? null,
        input.idDepartamento ?? null,
        input.codigo.trim().toUpperCase(),
        input.nombre.trim(),
        input.tipoHorario,
        input.horaInicio,
        input.horaFin,
        input.cruzaMedianoche,
        input.duracionHoras,
        input.vigenciaDesde,
        input.vigenciaHasta,
        input.activo,
      ],
    );

    await this.saveTramos(id, input.tramos);

    const updated = await this.obtenerPorId(id);

    if (!updated) {
      throw errorAlConfirmarGuardado('turno', id, TypeOrmTurnoRepository.name);
    }

    if (updated.idServicio) {
      const idServicioAnterior =
        actual.idServicio !== updated.idServicio
          ? (actual.idServicio ?? undefined)
          : undefined;
      await this.syncCodigoOperativoServicio(updated, idServicioAnterior);
    } else if (updated.idDepartamento) {
      // Los turnos de departamento no tienen un sync eager equivalente al de
      // servicio (su codigo_operativo_servicio se provisiona de forma perezosa
      // via ensureTurnosDepartamentoConfigurados). Sin este UPDATE, nombre y
      // horas quedarian congelados con el valor de la creacion inicial.
      await this.updateDescripcionYHorasCodigoOperativo(
        id,
        updated.nombre,
        updated.duracionHoras,
      );
    }

    if (input.codigoVisual !== undefined || input.etiqueta !== undefined) {
      await this.updateLabelesCodigoOperativo(
        id,
        input.codigoVisual,
        input.etiqueta,
      );
    }

    return updated;
  }

  async desactivar(id: number): Promise<void> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('turno', id, TypeOrmTurnoRepository.name);
    }

    await this.dataSource.query(
      `
        UPDATE dbo.turno
        SET
          activo = 0,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [id],
    );

    // El codigo operativo se desactiva siempre (servicio o departamento):
    // es un UPDATE generico por id_turno, no depende del scope del turno.
    await this.deactivateCodigoOperativoServicio(id);
  }

  async activar(id: number): Promise<void> {
    const actual = await this.obtenerPorId(id);

    if (!actual) {
      throw noEncontrado('turno', id, TypeOrmTurnoRepository.name);
    }

    await this.dataSource.query(
      `
        UPDATE dbo.turno
        SET
          activo = 1,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [id],
    );

    const updated = await this.obtenerPorId(id);

    if (updated?.idServicio) {
      await this.syncCodigoOperativoServicio(updated);
    } else if (updated?.idDepartamento) {
      await this.reactivateCodigoOperativoServicio(id);
    }
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
        WHERE rt.id_turno = @0 AND p.estado <> 'CERRADA'
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

  async propagarHorarioACeldas(
    id: number,
    duracionHoras: number,
    idUsuarioOperacion: number,
  ): Promise<ResultadoPropagacionHorario> {
    const rows = await this.queryRows<{ id: number | string }>(
      `
        UPDATE rt
        SET
          horas_programadas = @1,
          updated_by = @2,
          updated_at = GETUTCDATE()
        OUTPUT INSERTED.id AS id
        FROM dbo.rol_turno rt
        INNER JOIN dbo.planificacion p ON p.id = rt.id_planificacion
        WHERE rt.id_turno = @0 AND p.estado <> 'CERRADA'
      `,
      [id, duracionHoras, idUsuarioOperacion],
    );

    return { celdasActualizadas: rows.length };
  }

  async limpiarCeldasAsociadas(id: number): Promise<ResultadoLimpiezaCeldas> {
    const rows = await this.queryRows<{ id_planificacion: number | string }>(
      `
        DELETE rt
        OUTPUT DELETED.id_planificacion AS id_planificacion
        FROM dbo.rol_turno rt
        INNER JOIN dbo.planificacion p ON p.id = rt.id_planificacion
        WHERE rt.id_turno = @0 AND p.estado <> 'CERRADA'
      `,
      [id],
    );

    const planificacionesAfectadas = new Set(
      rows.map((row) => Number(row.id_planificacion)),
    ).size;

    return { celdasEliminadas: rows.length, planificacionesAfectadas };
  }

  private async fetchTramosPorTurno(idTurno: number): Promise<TurnoTramo[]> {
    const rows = await this.queryRows<{
      id: number | string;
      id_turno: number | string;
      orden: number | string;
      hora_inicio: string;
      hora_fin: string;
      duracion_horas: number | string;
      cruza_medianoche: boolean | number;
      activo: boolean | number;
    }>(
      `
        SELECT id, id_turno, orden, hora_inicio, hora_fin, duracion_horas, cruza_medianoche, activo
        FROM dbo.turno_tramo
        WHERE id_turno = @0
          AND activo = 1
        ORDER BY orden ASC
      `,
      [idTurno],
    );

    return rows.map((r) => ({
      id: Number(r.id),
      idTurno: Number(r.id_turno),
      orden: Number(r.orden),
      horaInicio: r.hora_inicio,
      horaFin: r.hora_fin,
      duracionHoras: Number(r.duracion_horas),
      cruzaMedianoche: Boolean(r.cruza_medianoche),
      activo: Boolean(r.activo),
    }));
  }

  private async fetchTramosPorTurnos(
    idTurnos: number[],
  ): Promise<Map<number, TurnoTramo[]>> {
    if (idTurnos.length === 0) {
      return new Map();
    }

    const placeholders = idTurnos.map((_, i) => `@${i}`).join(', ');
    const rows = await this.queryRows<{
      id: number | string;
      id_turno: number | string;
      orden: number | string;
      hora_inicio: string;
      hora_fin: string;
      duracion_horas: number | string;
      cruza_medianoche: boolean | number;
      activo: boolean | number;
    }>(
      `
        SELECT id, id_turno, orden, hora_inicio, hora_fin, duracion_horas, cruza_medianoche, activo
        FROM dbo.turno_tramo
        WHERE id_turno IN (${placeholders})
          AND activo = 1
        ORDER BY id_turno ASC, orden ASC
      `,
      idTurnos,
    );

    const result = new Map<number, TurnoTramo[]>();

    for (const r of rows) {
      const idTurno = Number(r.id_turno);
      if (!result.has(idTurno)) {
        result.set(idTurno, []);
      }
      result.get(idTurno)!.push({
        id: Number(r.id),
        idTurno,
        orden: Number(r.orden),
        horaInicio: r.hora_inicio,
        horaFin: r.hora_fin,
        duracionHoras: Number(r.duracion_horas),
        cruzaMedianoche: Boolean(r.cruza_medianoche),
        activo: Boolean(r.activo),
      });
    }

    return result;
  }

  private async fetchCodigosVisualesPorTurnos(
    idTurnos: number[],
  ): Promise<
    Map<number, { codigoVisual: string | null; etiqueta: string | null }>
  > {
    if (idTurnos.length === 0) {
      return new Map();
    }

    const placeholders = idTurnos.map((_, i) => `@${i}`).join(', ');
    const rows = await this.queryRows<{
      id_turno: number | string;
      codigo_visual: string | null;
      etiqueta: string | null;
    }>(
      `
        SELECT id_turno, codigo_visual, etiqueta
        FROM dbo.codigo_operativo_servicio
        WHERE id_turno IN (${placeholders})
          AND activo = 1
      `,
      idTurnos,
    );

    const result = new Map<
      number,
      { codigoVisual: string | null; etiqueta: string | null }
    >();

    for (const r of rows) {
      result.set(Number(r.id_turno), {
        codigoVisual: r.codigo_visual?.trim() || null,
        etiqueta: r.etiqueta?.trim() || null,
      });
    }

    return result;
  }

  private async saveTramos(
    idTurno: number,
    tramos: Array<{
      orden: number;
      horaInicio: string;
      horaFin: string;
      duracionHoras: number;
      cruzaMedianoche: boolean;
    }>,
  ): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM dbo.turno_tramo WHERE id_turno = @0`,
      [idTurno],
    );

    for (const tramo of tramos) {
      await this.dataSource.query(
        `
          INSERT INTO dbo.turno_tramo
            (id_turno, orden, hora_inicio, hora_fin, duracion_horas, cruza_medianoche, activo)
          VALUES
            (@0, @1, @2, @3, @4, @5, 1)
        `,
        [
          idTurno,
          tramo.orden,
          tramo.horaInicio,
          tramo.horaFin,
          tramo.duracionHoras,
          tramo.cruzaMedianoche ? 1 : 0,
        ],
      );
    }
  }

  private async assertServicioExiste(idServicio: number): Promise<void> {
    const rows = await this.queryIdRows(
      `SELECT TOP 1 id FROM dbo.servicio WHERE id = @0 AND activo = 1`,
      [idServicio],
    );

    if (!rows[0]) {
      throw noEncontrado('servicio', idServicio, TypeOrmTurnoRepository.name);
    }
  }

  private async assertDepartamentoExiste(
    idDepartamento: number,
  ): Promise<void> {
    const rows = await this.queryIdRows(
      `SELECT TOP 1 id FROM dbo.departamento WHERE id = @0 AND activo = 1`,
      [idDepartamento],
    );

    if (!rows[0]) {
      throw noEncontrado(
        'departamento',
        idDepartamento,
        TypeOrmTurnoRepository.name,
      );
    }
  }

  private async assertTurnoServicioDisponible(
    idServicio: number,
    codigo: string,
    vigenciaDesde: string,
    idActual: number | null,
  ): Promise<void> {
    const rows = await this.queryIdRows(
      `
        SELECT TOP 1 id
        FROM dbo.turno
        WHERE id_servicio = @0
          AND UPPER(codigo) = @1
          AND CAST(vigencia_desde AS DATE) = CAST(@2 AS DATE)
          AND (@3 IS NULL OR id <> @3)
      `,
      [idServicio, codigo.trim().toUpperCase(), vigenciaDesde, idActual],
    );

    if (rows[0]) {
      throw new ConflictException(
        `Ya existe un horario con el codigo ${codigo.trim().toUpperCase()} en este servicio que rige desde el ${formatearFecha(vigenciaDesde)}. ` +
          'Usa otro codigo o cambia la fecha de inicio de vigencia.',
      );
    }
  }

  private async assertTurnoDepartamentoDisponible(
    idDepartamento: number,
    codigo: string,
    vigenciaDesde: string,
    idActual: number | null,
  ): Promise<void> {
    const rows = await this.queryIdRows(
      `
        SELECT TOP 1 id
        FROM dbo.turno
        WHERE id_departamento = @0
          AND UPPER(codigo) = @1
          AND CAST(vigencia_desde AS DATE) = CAST(@2 AS DATE)
          AND (@3 IS NULL OR id <> @3)
      `,
      [idDepartamento, codigo.trim().toUpperCase(), vigenciaDesde, idActual],
    );

    if (rows[0]) {
      throw new ConflictException(
        `Ya existe un horario con el codigo ${codigo.trim().toUpperCase()} en este departamento que rige desde el ${formatearFecha(vigenciaDesde)}. ` +
          'Usa otro codigo o cambia la fecha de inicio de vigencia.',
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

  private async syncCodigoOperativoServicio(
    turno: Turno,
    idServicioAnterior?: number,
    displayConfig?: { codigoVisual?: string; etiqueta?: string },
  ): Promise<void> {
    if (!turno.idServicio) {
      return;
    }

    const targetConfigId = await this.obtenerConfiguracionOperativaActivaId(
      turno.idServicio,
    );

    if (idServicioAnterior && idServicioAnterior !== turno.idServicio) {
      const previousConfigId =
        await this.obtenerConfiguracionOperativaActivaId(idServicioAnterior);

      if (previousConfigId !== null && previousConfigId !== targetConfigId) {
        await this.dataSource.query(
          `
            UPDATE dbo.codigo_operativo_servicio
            SET
              activo = 0,
              updated_at = GETDATE()
            WHERE id_turno = @0
              AND id_configuracion_operativa_servicio = @1
          `,
          [turno.id, previousConfigId],
        );
      }
    }

    if (targetConfigId === null) {
      await this.deactivateCodigoOperativoServicio(turno.id);
      return;
    }

    const existingRows = await this.queryRows<{
      id: number | string;
      color: string | null;
      orden_visual: number | string;
      id_configuracion_operativa_servicio: number | string;
    }>(
      `
        SELECT TOP 1
          id,
          color,
          orden_visual,
          id_configuracion_operativa_servicio
        FROM dbo.codigo_operativo_servicio
        WHERE id_turno = @0
      `,
      [turno.id],
    );
    const existing = existingRows[0]
      ? {
          id: Number(existingRows[0].id),
          color: existingRows[0].color?.trim() || null,
          ordenVisual: Number(existingRows[0].orden_visual),
          idConfiguracionOperativaServicio: Number(
            existingRows[0].id_configuracion_operativa_servicio,
          ),
        }
      : null;

    const resolvedColor = await this.resolveTurnoColor(
      targetConfigId,
      turno.id,
      existing?.idConfiguracionOperativaServicio === targetConfigId
        ? existing.color
        : null,
    );

    // El orden visual se preserva si ya existia, o se asigna 0 como posicion inicial.
    const ordenVisual = existing?.ordenVisual ?? 0;

    if (existing) {
      await this.dataSource.query(
        `
          UPDATE dbo.codigo_operativo_servicio
          SET
            id_configuracion_operativa_servicio = @1,
            origen = 'TURNO',
            id_incidencia_personal = NULL,
            descripcion = @2,
            horas_equivalentes = @3,
            categoria = 'TRABAJO',
            color = @4,
            orden_visual = @5,
            es_laborable = 1,
            requiere_confirmacion = 0,
            activo = @6,
            updated_at = GETDATE()
          WHERE id = @0
        `,
        [
          existing.id,
          targetConfigId,
          turno.nombre,
          turno.duracionHoras,
          resolvedColor,
          ordenVisual,
          turno.activo ? 1 : 0,
        ],
      );

      return;
    }

    await this.dataSource.query(
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
          @7,
          1,
          0,
          @8
        )
      `,
      [
        targetConfigId,
        turno.id,
        displayConfig?.codigoVisual?.trim() ?? '',
        displayConfig?.etiqueta?.trim() ?? turno.nombre,
        turno.nombre,
        turno.duracionHoras,
        resolvedColor,
        ordenVisual,
        turno.activo ? 1 : 0,
      ],
    );
  }

  private async updateLabelesCodigoOperativo(
    idTurno: number,
    codigoVisual?: string,
    etiqueta?: string,
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [idTurno];

    if (codigoVisual !== undefined) {
      sets.push(`codigo_visual = @${params.length}`);
      params.push(codigoVisual.trim());
    }
    if (etiqueta !== undefined) {
      sets.push(`etiqueta = @${params.length}`);
      params.push(etiqueta.trim());
    }

    if (sets.length === 0) return;

    await this.dataSource.query(
      `UPDATE dbo.codigo_operativo_servicio SET ${sets.join(', ')}, updated_at = GETDATE() WHERE id_turno = @0 AND activo = 1`,
      params,
    );
  }

  private async resolveTurnoColor(
    idConfiguracionOperativaServicio: number,
    idTurno: number,
    preferredColor: string | null,
  ): Promise<string> {
    const rows = await this.queryRows<{ color: string | null }>(
      `
        SELECT color
        FROM dbo.codigo_operativo_servicio
        WHERE id_configuracion_operativa_servicio = @0
          AND origen = 'TURNO'
          AND activo = 1
          AND id_turno <> @1
          AND color IS NOT NULL
      `,
      [idConfiguracionOperativaServicio, idTurno],
    );

    const usedColors = new Set(
      rows
        .map((row) => row.color?.trim().toUpperCase() || null)
        .filter((color): color is string => Boolean(color)),
    );
    const normalizedPreferred = preferredColor?.trim().toUpperCase() || null;

    if (normalizedPreferred && !usedColors.has(normalizedPreferred)) {
      return normalizedPreferred;
    }

    const nextColor = TypeOrmTurnoRepository.DEFAULT_TURNO_COLORS.find(
      (color) => !usedColors.has(color.toUpperCase()),
    );

    if (nextColor) {
      return nextColor;
    }

    const paletteIndex =
      usedColors.size % TypeOrmTurnoRepository.DEFAULT_TURNO_COLORS.length;
    return TypeOrmTurnoRepository.DEFAULT_TURNO_COLORS[paletteIndex];
  }

  private async deactivateCodigoOperativoServicio(
    idTurno: number,
  ): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE dbo.codigo_operativo_servicio
        SET
          activo = 0,
          updated_at = GETDATE()
        WHERE id_turno = @0
      `,
      [idTurno],
    );
  }

  // Reactiva la fila de codigo_operativo_servicio existente de un turno de
  // departamento (no crea una nueva: eso lo resuelve ensureTurnosDepartamentoConfigurados
  // en la proxima lectura de configuracion operativa).
  private async reactivateCodigoOperativoServicio(
    idTurno: number,
  ): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE dbo.codigo_operativo_servicio
        SET
          activo = 1,
          updated_at = GETDATE()
        WHERE id_turno = @0
      `,
      [idTurno],
    );
  }

  private async updateDescripcionYHorasCodigoOperativo(
    idTurno: number,
    nombre: string,
    duracionHoras: number,
  ): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE dbo.codigo_operativo_servicio
        SET
          descripcion = @1,
          horas_equivalentes = @2,
          updated_at = GETDATE()
        WHERE id_turno = @0
      `,
      [idTurno, nombre, duracionHoras],
    );
  }

  private async obtenerConfiguracionOperativaActivaId(
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
}

interface RawTurnoRow {
  turno_id: number | string;
  turno_id_servicio: number | string | null;
  turno_id_departamento: number | string | null;
  turno_codigo: string;
  turno_nombre: string;
  turno_tipo_horario: string;
  turno_hora_inicio: string;
  turno_hora_fin: string;
  turno_cruza_medianoche: boolean;
  turno_duracion_horas: number | string;
  turno_vigencia_desde: Date;
  turno_vigencia_hasta: Date | null;
  turno_activo: boolean;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  departamento_codigo: string | null;
  departamento_nombre: string | null;
}

function mapRawToTurno(
  row: RawTurnoRow,
  tramosPorTurno: Map<number, TurnoTramo[]>,
  codigosPorTurno: Map<
    number,
    { codigoVisual: string | null; etiqueta: string | null }
  >,
): Turno {
  const codigoVisual = codigosPorTurno.get(Number(row.turno_id));

  return {
    id: Number(row.turno_id),
    idServicio:
      row.turno_id_servicio != null ? Number(row.turno_id_servicio) : null,
    codigoServicio: row.servicio_codigo,
    nombreServicio: row.servicio_nombre,
    idDepartamento:
      row.turno_id_departamento != null
        ? Number(row.turno_id_departamento)
        : null,
    codigoDepartamento: row.departamento_codigo,
    nombreDepartamento: row.departamento_nombre,
    codigo: row.turno_codigo,
    nombre: row.turno_nombre,
    codigoVisual: codigoVisual?.codigoVisual ?? null,
    etiquetaVisual: codigoVisual?.etiqueta ?? null,
    tipoHorario:
      row.turno_tipo_horario === 'DISCONTINUO' ? 'DISCONTINUO' : 'CONTINUO',
    horaInicio: row.turno_hora_inicio,
    horaFin: row.turno_hora_fin,
    cruzaMedianoche: row.turno_cruza_medianoche,
    duracionHoras: Number(row.turno_duracion_horas),
    tramos: tramosPorTurno.get(Number(row.turno_id)) ?? [],
    vigenciaDesde: new Date(row.turno_vigencia_desde),
    vigenciaHasta: row.turno_vigencia_hasta
      ? new Date(row.turno_vigencia_hasta)
      : null,
    activo: row.turno_activo,
  };
}

// vigenciaDesde llega como 'YYYY-MM-DD' (o ISO); se muestra como DD/MM/YYYY.
function formatearFecha(valor: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  return coincidencia
    ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`
    : valor;
}

function assertXorScope(input: GuardarTurnoInput): void {
  const tieneServicio = input.idServicio != null;
  const tieneDepartamento = input.idDepartamento != null;

  if (!tieneServicio && !tieneDepartamento) {
    throw new BadRequestException(
      'Indica si el horario pertenece a un servicio o a un departamento.',
    );
  }

  if (tieneServicio && tieneDepartamento) {
    throw new BadRequestException(
      'El horario debe pertenecer a un servicio o a un departamento, no a ambos.',
    );
  }
}

function slicePage<T>(rows: T[], page?: number, pageSize?: number): T[] {
  if (!page || !pageSize) {
    return rows;
  }

  const offset = Math.max(0, (page - 1) * pageSize);
  return rows.slice(offset, offset + pageSize);
}
