import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import type { ObservacionDiariaPlanificacion } from '../../domain/entities/observacion-diaria-planificacion';
import { Planificacion } from '../../domain/entities/planificacion';
import type { RolTurnoPlanificacion } from '../../domain/entities/rol-turno-planificacion';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import {
  CerrarYMaterializarHistorialInput,
  PlanificacionHistorialRepository,
} from '../../domain/repositories/planificacion-historial.repository';
import { buildExcluirOrigenTrasladadoSql } from './planificacion-cambio-asignacion-vista-sql.helper';
import { normalizeCargoNombre } from './typeorm-rol-turno.repository';

interface RolTurnoDetalleRow {
  rol_turno_id: number | string;
  id_asignacion_personal: number | string;
  id_calendario: number | string;
  secuencia_dia: number | string;
  id_turno: number | string | null;
  id_incidencia_personal: number | string | null;
  horas_programadas: number | string;
  created_at: Date;
  calendario_fecha: Date;
  personal_id: number | string;
  codigo_personal: string | null;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  rol_funcional_codigo: string | null;
  rol_funcional_nombre: string | null;
  turno_codigo: string | null;
  turno_nombre: string | null;
  turno_hora_inicio: string | null;
  turno_hora_fin: string | null;
  turno_cruza_medianoche: boolean | number | null;
  incidencia_personal_codigo: string | null;
  incidencia_personal_nombre: string | null;
  codigo_visual: string | null;
  etiqueta: string | null;
  nro_item: string | null;
  codigo_carga_horaria: string | null;
  nombre_carga_horaria: string | null;
  horas_dia_base: number | string | null;
  documento_identidad: string | null;
  codigo_tipo_contrato: string | null;
  nombre_tipo_contrato: string | null;
  codigo_fuente_item: string | null;
  nivel_cargo_codigo: string | null;
  nivel_cargo_nombre: string | null;
  es_jefatura: boolean | number | null;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
}

interface TramoRow {
  id_turno: number | string;
  orden: number | string;
  hora_inicio: string;
  hora_fin: string;
  duracion_horas: number | string;
  cruza_medianoche: boolean | number;
}

interface FrozenTramo {
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
}

interface RegistroHistorialRow {
  id: number | string;
  id_planificacion_historial: number | string;
  id_rol_turno: number | string;
  id_asignacion_personal: number | string;
  id_calendario: number | string;
  id_personal: number | string;
  nombre_completo_personal: string;
  codigo_personal: string | null;
  codigo_rol_funcional: string | null;
  nombre_rol_funcional: string | null;
  fecha: Date;
  secuencia_dia: number | string;
  tipo_registro: 'TURNO' | 'TIPO_DIA';
  codigo_turno: string | null;
  nombre_turno: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  cruza_medianoche: boolean | number | null;
  tramos_json: string | null;
  codigo_incidencia_personal: string | null;
  nombre_incidencia_personal: string | null;
  codigo_visual: string | null;
  etiqueta_visual: string | null;
  horas_programadas: number | string;
  created_at: Date;
  nro_item: string | null;
  codigo_carga_horaria: string | null;
  nombre_carga_horaria: string | null;
  horas_dia_base: number | string | null;
  documento_identidad: string | null;
  codigo_tipo_contrato: string | null;
  nombre_tipo_contrato: string | null;
  codigo_fuente_item: string | null;
  cargo_actual: string | null;
  es_jefatura: boolean | number | null;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  id_turno: number | string | null;
  id_incidencia_personal: number | string | null;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
}

interface ObservacionMensualRow {
  id: number | string;
  id_asignacion_personal: number | string;
  tipo_observacion: string;
  descripcion: string;
  created_at: Date;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  creador_username: string | null;
  creador_nombres: string | null;
  creador_apellido_paterno: string | null;
  creador_apellido_materno: string | null;
}

@Injectable()
export class TypeOrmPlanificacionHistorialRepository implements PlanificacionHistorialRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
    @Inject(PlanificacionRepository)
    private readonly planificacionRepository: PlanificacionRepository,
  ) {}

  async existeHistorial(idPlanificacion: number): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ existe: number }>>(
      `SELECT COUNT(*) AS existe FROM dbo.planificacion_historial WHERE id_planificacion = @0`,
      [idPlanificacion],
    );

    return Number(rows[0]?.existe ?? 0) > 0;
  }

  async listarIdsVencidasNoCerradas(): Promise<number[]> {
    // Vencida = ya empezo el mes SIGUIENTE al periodo (anio/mes) de la
    // planificacion. No se compara contra fecha_fin porque esa columna
    // guarda la medianoche del ULTIMO dia del mes (cerraria un dia antes
    // de que el mes realmente termine). DATEADD/CAST son compatibles con
    // SQL Server 2008 R2 (evita DATEFROMPARTS, disponible recien en 2012+).
    const rows = await this.dataSource.query<Array<{ id: number | string }>>(
      `
        SELECT id
        FROM dbo.planificacion
        WHERE activo = 1
          AND estado <> 'CERRADA'
          AND DATEADD(
                MONTH,
                mes,
                CAST(CAST(anio AS VARCHAR(4)) + '0101' AS DATETIME)
              ) <= GETUTCDATE()
      `,
    );

    return rows.map((row) => Number(row.id));
  }

  async listarRegistrosHistorial(
    idPlanificacion: number,
    vista: 'ORIGINAL' | 'EFECTIVA' = 'EFECTIVA',
  ): Promise<RolTurnoPlanificacion[]> {
    // h.vista IS NULL cubre el historial materializado antes de la seccion 146
    // (una sola version, valida para ambas vistas porque nunca hubo traslados
    // que distinguir).
    const rows = await this.dataSource.query<RegistroHistorialRow[]>(
      `
        SELECT h.*
        FROM dbo.rol_turno_historial h
        INNER JOIN dbo.planificacion_historial ph ON ph.id = h.id_planificacion_historial
        WHERE ph.id_planificacion = @0
          AND (h.vista IS NULL OR h.vista = @1)
        ORDER BY h.fecha ASC, h.apellido_paterno ASC, h.secuencia_dia ASC
      `,
      [idPlanificacion, vista],
    );

    if (rows.length === 0) {
      return [];
    }

    const observacionMensualPorAsignacion =
      await this.fetchObservacionMensualHistorialPorAsignacion(
        Number(rows[0].id_planificacion_historial),
      );

    return rows.map((row) => {
      const fecha = new Date(row.fecha);
      const tramos = row.tramos_json
        ? (JSON.parse(row.tramos_json) as FrozenTramo[])
        : [];

      return {
        id: Number(row.id_rol_turno),
        idPlanificacion,
        idAsignacionPersonal: Number(row.id_asignacion_personal),
        idCalendario: Number(row.id_calendario),
        fecha,
        diaMes: fecha.getUTCDate(),
        diaSemanaNombre: buildDiaSemanaNombre(fecha),
        secuenciaDia: Number(row.secuencia_dia),
        idTurno: row.id_turno === null ? null : Number(row.id_turno),
        codigoTurno: row.codigo_turno,
        nombreTurno: row.nombre_turno,
        tipoHorario: tramos.length > 0 ? 'DISCONTINUO' : 'CONTINUO',
        horaInicio: row.hora_inicio,
        horaFin: row.hora_fin,
        cruzaMedianoche:
          row.cruza_medianoche === null ? null : Boolean(row.cruza_medianoche),
        tramos: tramos.map((tramo, index) => ({
          id: index,
          idTurno: row.id_turno === null ? 0 : Number(row.id_turno),
          orden: tramo.orden,
          horaInicio: tramo.horaInicio,
          horaFin: tramo.horaFin,
          duracionHoras: tramo.duracionHoras,
          cruzaMedianoche: tramo.cruzaMedianoche,
          activo: true,
        })),
        idIncidenciaPersonal:
          row.id_incidencia_personal === null
            ? null
            : Number(row.id_incidencia_personal),
        codigoIncidenciaPersonal: row.codigo_incidencia_personal,
        nombreIncidenciaPersonal: row.nombre_incidencia_personal,
        horasProgramadas: Number(row.horas_programadas),
        origenRegistro: 'MANUAL',
        idPersonal: Number(row.id_personal),
        codigoPersonal: row.codigo_personal,
        nroItem: row.nro_item,
        codigoCargaHoraria: row.codigo_carga_horaria,
        nombreCargaHoraria: row.nombre_carga_horaria,
        horasDiaBase:
          row.horas_dia_base === null ? null : Number(row.horas_dia_base),
        ci: row.documento_identidad,
        codigoTipoContrato: row.codigo_tipo_contrato,
        nombreTipoContrato: row.nombre_tipo_contrato,
        codigoFuenteItem: row.codigo_fuente_item,
        apellidoPaterno: row.apellido_paterno,
        apellidoMaterno: row.apellido_materno,
        nombres: row.nombres,
        nombreCompleto: row.nombre_completo_personal,
        cargoActual: row.cargo_actual,
        rolFuncionalCodigo: row.codigo_rol_funcional,
        rolFuncionalNombre: row.nombre_rol_funcional,
        esJefatura: row.es_jefatura === null ? false : Boolean(row.es_jefatura),
        servicioCodigo: row.servicio_codigo,
        servicioNombre: row.servicio_nombre,
        observacionMensual:
          observacionMensualPorAsignacion.get(
            Number(row.id_asignacion_personal),
          ) ?? null,
        codigoVisualCongelado: row.codigo_visual,
        etiquetaVisualCongelada: row.etiqueta_visual,
      };
    });
  }

  async listarObservacionesDiariasHistorial(
    idPlanificacion: number,
  ): Promise<ObservacionDiariaPlanificacion[]> {
    const rows = await this.dataSource.query<
      Array<{
        id_asignacion_personal: number | string;
        id_calendario: number | string;
        tipo_observacion: string;
        descripcion: string;
        created_at: Date;
      }>
    >(
      `
        SELECT h.id_asignacion_personal, h.id_calendario, h.tipo_observacion, h.descripcion, h.created_at
        FROM dbo.observacion_historial h
        INNER JOIN dbo.planificacion_historial ph ON ph.id = h.id_planificacion_historial
        WHERE ph.id_planificacion = @0
      `,
      [idPlanificacion],
    );

    return rows.map((row, index) => ({
      id: index,
      idPlanificacion,
      idAsignacionPersonal: Number(row.id_asignacion_personal),
      idCalendario: Number(row.id_calendario),
      idRolTurno: null,
      tipoObservacion: row.tipo_observacion,
      descripcion: row.descripcion,
      createdBy: 0,
      createdAt: row.created_at,
    }));
  }

  private async fetchObservacionMensualHistorialPorAsignacion(
    idPlanificacionHistorial: number,
  ): Promise<Map<number, string>> {
    const rows = await this.dataSource.query<
      Array<{ id_asignacion_personal: number | string; descripcion: string }>
    >(
      `
        SELECT id_asignacion_personal, descripcion
        FROM dbo.observacion_mensual_historial
        WHERE id_planificacion_historial = @0
        ORDER BY id ASC
      `,
      [idPlanificacionHistorial],
    );

    const result = new Map<number, string>();
    for (const row of rows) {
      result.set(Number(row.id_asignacion_personal), row.descripcion);
    }

    return result;
  }

  async cerrarYMaterializar(
    input: CerrarYMaterializarHistorialInput,
  ): Promise<Planificacion> {
    if (await this.existeHistorial(input.idPlanificacion)) {
      throw new ConflictException(
        'Esta planificacion ya fue cerrada y su historial ya esta guardado. Actualiza la pantalla.',
      );
    }

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const planificacionRow = await this.obtenerPlanificacionHeader(
        runner,
        input.idPlanificacion,
      );

      if (!planificacionRow) {
        throw noEncontrado(
          'planificacion',
          input.idPlanificacion,
          TypeOrmPlanificacionHistorialRepository.name,
        );
      }

      const idConfiguracionOperativa =
        await this.obtenerConfiguracionOperativaId(
          runner,
          planificacionRow.id_servicio,
          planificacionRow.id_departamento,
        );

      const idPlanificacionHistorial = await this.insertarCabeceraHistorial(
        runner,
        planificacionRow,
        input,
      );

      // Se congelan ambas vistas por separado (docs/database/decisiones-
      // tecnicas.md seccion 146): ORIGINAL preserva lo aprobado sin aplicar
      // ningun traslado; EFECTIVA aplica la misma exclusion que ya usa la
      // consulta en vivo. Si nunca hubo un traslado sobre esta planificacion,
      // ambas quedan identicas en contenido, solo distinguidas por `vista`.
      await this.materializarRolTurno(
        runner,
        input.idPlanificacion,
        idPlanificacionHistorial,
        idConfiguracionOperativa,
        'ORIGINAL',
      );
      await this.materializarRolTurno(
        runner,
        input.idPlanificacion,
        idPlanificacionHistorial,
        idConfiguracionOperativa,
        'EFECTIVA',
      );
      // dbo.observacion (observaciones diarias por celda) se elimino en la
      // migracion de base de datos 041 (docs/database/decisiones-tecnicas.md
      // seccion 44): ya no existe fuente de datos para materializar en
      // observacion_historial en este paso. observacion_historial conserva las
      // filas ya congeladas de planificaciones cerradas antes de esa migracion,
      // pero no recibe filas nuevas.
      await this.materializarObservacionMensual(
        runner,
        input.idPlanificacion,
        idPlanificacionHistorial,
      );

      await runner.query(
        `
          UPDATE dbo.planificacion
          SET
            estado = 'CERRADA',
            id_usuario_cierre = @1,
            fecha_cierre = GETUTCDATE(),
            origen_cierre = @2,
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [input.idPlanificacion, input.idUsuarioCierre, input.origenCierre],
      );

      await runner.commitTransaction();
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }

    const cerrada = await this.planificacionRepository.obtenerPorId(
      input.idPlanificacion,
    );

    if (!cerrada) {
      throw errorAlConfirmarGuardado(
        'planificacion',
        input.idPlanificacion,
        TypeOrmPlanificacionHistorialRepository.name,
      );
    }

    return cerrada;
  }

  private async obtenerPlanificacionHeader(
    runner: QueryRunner,
    idPlanificacion: number,
  ): Promise<{
    anio: number;
    mes: number;
    version: number;
    id_servicio: number | null;
    codigo_servicio: string | null;
    nombre_servicio: string | null;
    id_departamento: number | null;
    codigo_departamento: string | null;
    nombre_departamento: string | null;
  } | null> {
    const rows = (await runner.query(
      `
        SELECT
          p.anio,
          p.mes,
          p.version,
          p.id_servicio,
          s.codigo AS codigo_servicio,
          s.nombre AS nombre_servicio,
          p.id_departamento,
          d.codigo AS codigo_departamento,
          d.nombre AS nombre_departamento
        FROM dbo.planificacion p
        LEFT JOIN dbo.servicio s ON s.id = p.id_servicio
        LEFT JOIN dbo.departamento d ON d.id = p.id_departamento
        WHERE p.id = @0
      `,
      [idPlanificacion],
    )) as Array<{
      anio: number;
      mes: number;
      version: number;
      id_servicio: number | null;
      codigo_servicio: string | null;
      nombre_servicio: string | null;
      id_departamento: number | null;
      codigo_departamento: string | null;
      nombre_departamento: string | null;
    }>;

    return rows[0] ?? null;
  }

  private async obtenerConfiguracionOperativaId(
    runner: QueryRunner,
    idServicio: number | null,
    idDepartamento: number | null,
  ): Promise<number | null> {
    const rows = (await runner.query(
      `
        SELECT TOP 1 id
        FROM dbo.configuracion_operativa_servicio
        WHERE activo = 1
          AND (
            (@0 IS NOT NULL AND id_servicio = @0)
            OR (@1 IS NOT NULL AND id_departamento = @1)
          )
      `,
      [idServicio, idDepartamento],
    )) as Array<{ id: number | string }>;

    return rows[0] ? Number(rows[0].id) : null;
  }

  private async insertarCabeceraHistorial(
    runner: QueryRunner,
    planificacionRow: {
      anio: number;
      mes: number;
      version: number;
      id_servicio: number | null;
      codigo_servicio: string | null;
      nombre_servicio: string | null;
      id_departamento: number | null;
      codigo_departamento: string | null;
      nombre_departamento: string | null;
    },
    input: CerrarYMaterializarHistorialInput,
  ): Promise<number> {
    const rows = (await runner.query(
      `
        INSERT INTO dbo.planificacion_historial
        (
          id_planificacion, anio, mes, version,
          id_servicio, codigo_servicio, nombre_servicio,
          id_departamento, codigo_departamento, nombre_departamento,
          estado_final, origen_cierre, id_usuario_cierre, fecha_cierre
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, 'CERRADA', @10, @11, GETUTCDATE())
      `,
      [
        input.idPlanificacion,
        planificacionRow.anio,
        planificacionRow.mes,
        planificacionRow.version,
        planificacionRow.id_servicio,
        planificacionRow.codigo_servicio,
        planificacionRow.nombre_servicio,
        planificacionRow.id_departamento,
        planificacionRow.codigo_departamento,
        planificacionRow.nombre_departamento,
        input.origenCierre,
        input.idUsuarioCierre,
      ],
    )) as Array<{ id: number | string }>;

    return Number(rows[0]?.id);
  }

  private async materializarRolTurno(
    runner: QueryRunner,
    idPlanificacion: number,
    idPlanificacionHistorial: number,
    idConfiguracionOperativa: number | null,
    vista: 'ORIGINAL' | 'EFECTIVA',
  ): Promise<void> {
    const filtroVista =
      vista === 'EFECTIVA'
        ? `AND ${buildExcluirOrigenTrasladadoSql('rt')}`
        : '';

    const rows = (await runner.query(
      `
        SELECT
          rt.id AS rol_turno_id,
          rt.id_asignacion_personal,
          rt.id_calendario,
          rt.secuencia_dia,
          rt.id_turno,
          rt.id_incidencia_personal,
          rt.horas_programadas,
          rt.created_at,
          cal.fecha AS calendario_fecha,
          p.id AS personal_id,
          p.codigo_personal,
          p.nombres,
          p.apellido_paterno,
          p.apellido_materno,
          p.documento_identidad,
          rf.codigo AS rol_funcional_codigo,
          rf.nombre AS rol_funcional_nombre,
          rf.es_jefatura,
          t.codigo AS turno_codigo,
          t.nombre AS turno_nombre,
          t.hora_inicio AS turno_hora_inicio,
          t.hora_fin AS turno_hora_fin,
          t.cruza_medianoche AS turno_cruza_medianoche,
          td.codigo AS incidencia_personal_codigo,
          td.nombre AS incidencia_personal_nombre,
          cos.codigo_visual,
          cos.etiqueta,
          ap.nro_item,
          ap.codigo_fuente_item,
          ch.codigo AS codigo_carga_horaria,
          ch.nombre AS nombre_carga_horaria,
          ch.horas_dia_base,
          tc.codigo AS codigo_tipo_contrato,
          tc.nombre AS nombre_tipo_contrato,
          nc.codigo AS nivel_cargo_codigo,
          nc.nombre AS nivel_cargo_nombre,
          servicio.codigo AS servicio_codigo,
          servicio.nombre AS servicio_nombre
        FROM dbo.rol_turno rt
        INNER JOIN dbo.calendario cal ON cal.id = rt.id_calendario
        INNER JOIN dbo.asignacion_personal ap ON ap.id = rt.id_asignacion_personal
        INNER JOIN dbo.personal p ON p.id = ap.id_personal
        LEFT JOIN dbo.rol_funcional rf ON rf.id = ap.id_rol_funcional
        LEFT JOIN dbo.nivel_cargo nc ON nc.id = p.id_nivel_cargo
        LEFT JOIN dbo.carga_horaria ch ON ch.id = ap.id_carga_horaria
        LEFT JOIN dbo.tipo_contrato tc ON tc.id = ap.id_tipo_contrato
        LEFT JOIN dbo.servicio servicio ON servicio.id = ap.id_servicio
        LEFT JOIN dbo.turno t ON t.id = rt.id_turno
        LEFT JOIN dbo.incidencia_personal td ON td.id = rt.id_incidencia_personal
        LEFT JOIN dbo.codigo_operativo_servicio cos
          ON cos.id_configuracion_operativa_servicio = @1
          AND (
            (rt.id_turno IS NOT NULL AND cos.id_turno = rt.id_turno)
            OR (rt.id_incidencia_personal IS NOT NULL AND cos.id_incidencia_personal = rt.id_incidencia_personal)
          )
        WHERE rt.id_planificacion = @0
          ${filtroVista}
        ORDER BY cal.fecha ASC, p.apellido_paterno ASC, rt.secuencia_dia ASC
      `,
      [idPlanificacion, idConfiguracionOperativa],
    )) as RolTurnoDetalleRow[];

    if (rows.length === 0) {
      return;
    }

    const idTurnos = [
      ...new Set(
        rows
          .map((r) => (r.id_turno !== null ? Number(r.id_turno) : null))
          .filter((id): id is number => id !== null),
      ),
    ];
    const tramosPorTurno = await this.fetchTramosPorTurnos(runner, idTurnos);

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 0;

    for (const row of rows) {
      const idTurno = row.id_turno !== null ? Number(row.id_turno) : null;
      const tramos =
        idTurno !== null ? (tramosPorTurno.get(idTurno) ?? []) : [];

      const rowValues = [
        idPlanificacionHistorial,
        Number(row.rol_turno_id),
        Number(row.id_asignacion_personal),
        Number(row.id_calendario),
        Number(row.personal_id),
        buildNombreCompleto(
          row.nombres,
          row.apellido_paterno,
          row.apellido_materno,
        ),
        row.codigo_personal,
        row.rol_funcional_codigo,
        row.rol_funcional_nombre,
        row.calendario_fecha,
        Number(row.secuencia_dia),
        row.id_turno !== null ? 'TURNO' : 'TIPO_DIA',
        row.turno_codigo,
        row.turno_nombre,
        row.turno_hora_inicio,
        row.turno_hora_fin,
        row.turno_cruza_medianoche === null
          ? null
          : Boolean(row.turno_cruza_medianoche),
        tramos.length > 0 ? JSON.stringify(tramos) : null,
        row.incidencia_personal_codigo,
        row.incidencia_personal_nombre,
        row.codigo_visual,
        row.etiqueta,
        Number(row.horas_programadas),
        row.created_at,
        row.nro_item,
        row.codigo_carga_horaria,
        row.nombre_carga_horaria,
        row.horas_dia_base === null ? null : Number(row.horas_dia_base),
        row.documento_identidad,
        row.codigo_tipo_contrato,
        row.nombre_tipo_contrato,
        row.codigo_fuente_item,
        normalizeCargoNombre(row.nivel_cargo_codigo, row.nivel_cargo_nombre),
        row.es_jefatura === null ? null : Boolean(row.es_jefatura),
        row.servicio_codigo,
        row.servicio_nombre,
        row.id_turno === null ? null : Number(row.id_turno),
        row.id_incidencia_personal === null
          ? null
          : Number(row.id_incidencia_personal),
        row.nombres,
        row.apellido_paterno,
        row.apellido_materno,
        vista,
      ];

      placeholders.push(
        `(${rowValues.map(() => `@${paramIndex++}`).join(', ')})`,
      );
      values.push(...rowValues);
    }

    await this.executeChunkedInsert(
      runner,
      `
        INSERT INTO dbo.rol_turno_historial
        (
          id_planificacion_historial, id_rol_turno, id_asignacion_personal, id_calendario,
          id_personal, nombre_completo_personal,
          codigo_personal, codigo_rol_funcional, nombre_rol_funcional,
          fecha, secuencia_dia, tipo_registro,
          codigo_turno, nombre_turno, hora_inicio, hora_fin, cruza_medianoche, tramos_json,
          codigo_incidencia_personal, nombre_incidencia_personal, codigo_visual, etiqueta_visual,
          horas_programadas, created_at,
          nro_item, codigo_carga_horaria, nombre_carga_horaria, horas_dia_base,
          documento_identidad, codigo_tipo_contrato, nombre_tipo_contrato, codigo_fuente_item,
          cargo_actual, es_jefatura, servicio_codigo, servicio_nombre,
          id_turno, id_incidencia_personal, nombres, apellido_paterno, apellido_materno,
          vista
        )
        VALUES
      `,
      placeholders,
      values,
      42,
    );
  }

  private async fetchTramosPorTurnos(
    runner: QueryRunner,
    idTurnos: number[],
  ): Promise<Map<number, FrozenTramo[]>> {
    const result = new Map<number, FrozenTramo[]>();

    if (idTurnos.length === 0) {
      return result;
    }

    const placeholders = idTurnos.map((_, i) => `@${i}`).join(', ');
    const rows = (await runner.query(
      `
        SELECT id_turno, orden, hora_inicio, hora_fin, duracion_horas, cruza_medianoche
        FROM dbo.turno_tramo
        WHERE id_turno IN (${placeholders}) AND activo = 1
        ORDER BY id_turno ASC, orden ASC
      `,
      idTurnos,
    )) as TramoRow[];

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

  private async materializarObservacionMensual(
    runner: QueryRunner,
    idPlanificacion: number,
    idPlanificacionHistorial: number,
  ): Promise<void> {
    const rows = (await runner.query(
      `
        SELECT
          om.id,
          om.id_asignacion_personal,
          om.tipo_observacion,
          om.descripcion,
          om.created_at,
          p.nombres,
          p.apellido_paterno,
          p.apellido_materno,
          u.username AS creador_username,
          pc.nombres AS creador_nombres,
          pc.apellido_paterno AS creador_apellido_paterno,
          pc.apellido_materno AS creador_apellido_materno
        FROM dbo.observacion_mensual om
        INNER JOIN dbo.asignacion_personal ap ON ap.id = om.id_asignacion_personal
        INNER JOIN dbo.personal p ON p.id = ap.id_personal
        LEFT JOIN dbo.usuario u ON u.id = om.created_by
        LEFT JOIN dbo.personal pc ON pc.id = u.id_personal
        WHERE om.id_planificacion = @0
      `,
      [idPlanificacion],
    )) as ObservacionMensualRow[];

    if (rows.length === 0) {
      return;
    }

    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 0;

    for (const row of rows) {
      const rowValues = [
        idPlanificacionHistorial,
        Number(row.id_asignacion_personal),
        buildNombreCompleto(
          row.nombres,
          row.apellido_paterno,
          row.apellido_materno,
        ),
        row.tipo_observacion,
        row.descripcion,
        buildNombreCreador(row),
        row.created_at,
      ];

      placeholders.push(
        `(${rowValues.map(() => `@${paramIndex++}`).join(', ')})`,
      );
      values.push(...rowValues);
    }

    await this.executeChunkedInsert(
      runner,
      `
        INSERT INTO dbo.observacion_mensual_historial
        (
          id_planificacion_historial, id_asignacion_personal, nombre_completo_personal,
          tipo_observacion, descripcion, nombre_usuario_creador, created_at
        )
        VALUES
      `,
      placeholders,
      values,
      7,
    );
  }

  /**
   * SQL Server acepta hasta 2100 parametros por consulta. Se agrupan las filas
   * en lotes que no superen ese limite para evitar fallos con planificaciones grandes.
   */
  private async executeChunkedInsert(
    runner: QueryRunner,
    insertPrefix: string,
    placeholders: string[],
    values: unknown[],
    columnasPorFila: number,
  ): Promise<void> {
    const maxParams = 2000;
    const filasPorLote = Math.max(1, Math.floor(maxParams / columnasPorFila));

    for (let i = 0; i < placeholders.length; i += filasPorLote) {
      const lotePlaceholders = placeholders.slice(i, i + filasPorLote);
      const loteValues = values.slice(
        i * columnasPorFila,
        (i + lotePlaceholders.length) * columnasPorFila,
      );

      const renumbered = renumberPlaceholders(lotePlaceholders);

      await runner.query(insertPrefix + renumbered.join(', '), loteValues);
    }
  }
}

function renumberPlaceholders(placeholders: string[]): string[] {
  let counter = 0;
  return placeholders.map((group) =>
    group.replace(/@\d+/g, () => `@${counter++}`),
  );
}

function buildNombreCompleto(
  nombres: string,
  apellidoPaterno: string,
  apellidoMaterno: string | null,
): string {
  return [nombres, apellidoPaterno, apellidoMaterno]
    .filter((value) => Boolean(value))
    .join(' ');
}

function buildNombreCreador(row: {
  creador_username: string | null;
  creador_nombres: string | null;
  creador_apellido_paterno: string | null;
  creador_apellido_materno: string | null;
}): string | null {
  if (row.creador_nombres && row.creador_apellido_paterno) {
    return buildNombreCompleto(
      row.creador_nombres,
      row.creador_apellido_paterno,
      row.creador_apellido_materno,
    );
  }

  return row.creador_username;
}

const DIAS_SEMANA = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
];

function buildDiaSemanaNombre(fecha: Date): string {
  return DIAS_SEMANA[fecha.getUTCDay()];
}
