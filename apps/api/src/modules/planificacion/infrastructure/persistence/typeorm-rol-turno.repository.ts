import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { AsignacionPersonalOrmEntity } from '../../../personal/infrastructure/persistence/entities/asignacion-personal.orm-entity';
import { PersonalOrmEntity } from '../../../personal/infrastructure/persistence/entities/personal.orm-entity';
import { IncidenciaPersonalOrmEntity } from '../../../operacion/infrastructure/persistence/entities/incidencia-personal.orm-entity';
import { TurnoOrmEntity } from '../../../operacion/infrastructure/persistence/entities/turno.orm-entity';
import { ServicioOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/servicio.orm-entity';
import { NivelCargoOrmEntity } from '../../../personal/infrastructure/persistence/entities/nivel-cargo.orm-entity';
import type { TurnoTramo } from '../../../operacion/domain/entities/turno-tramo';
import { AsignacionPlanificacionDisponible } from '../../domain/entities/asignacion-planificacion-disponible';
import { RolTurnoPlanificacion } from '../../domain/entities/rol-turno-planificacion';
import { ResumenPlanificacionCalendario } from '../../domain/entities/resumen-planificacion-calendario';
import { ResumenPlanificacionPersonal } from '../../domain/entities/resumen-planificacion-personal';
import { buildMonthlyUtcPeriod } from '../../application/helpers/monthly-period';
import {
  AplicarCeldaMatrizRapidaInput,
  ActualizarRolTurnoPlanificacionInput,
  CeldaMatrizPersistida,
  CopiarRegistrosDesdePlanificacionBaseInput,
  CrearRolTurnoPlanificacionInput,
  EstadoCeldaMatrizPlanificacion,
  ListarResumenCalendarioPorPlanificacionFiltro,
  ListarResumenPersonalPorPlanificacionFiltro,
  ListarRolTurnosPorPlanificacionFiltro,
  RegistroCeldaMatrizExistente,
  ResultadoCopiaRegistrosPlanificacion,
  RolTurnoRepository,
  RolTurnoPlanificacionCambioRepository,
  CambioDestinoPlanificacion,
  IncidenciaPersonalValidacion,
  TurnoValidacion,
  VerificarConflictoRolTurnoInput,
} from '../../domain/repositories/rol-turno.repository';
import { buildExcluirOrigenTrasladadoSql } from './planificacion-cambio-asignacion-vista-sql.helper';
import { CalendarioOrmEntity } from './entities/calendario.orm-entity';
import { FeriadoOrmEntity } from './entities/feriado.orm-entity';
import { TipoFeriadoOrmEntity } from './entities/tipo-feriado.orm-entity';
import { PlanificacionOrmEntity } from './entities/planificacion.orm-entity';
import { RolTurnoOrmEntity } from './entities/rol-turno.orm-entity';
import { errorAlConfirmarGuardado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class TypeOrmRolTurnoRepository
  implements RolTurnoRepository, RolTurnoPlanificacionCambioRepository
{
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listarPorPlanificacion(
    idPlanificacion: number,
    filtro: ListarRolTurnosPorPlanificacionFiltro,
  ): Promise<RolTurnoPlanificacion[]> {
    const queryBuilder = this.createDetailQuery().where(
      'rolTurno.id_planificacion = :idPlanificacion',
      {
        idPlanificacion,
      },
    );

    if (filtro.vista === 'ORIGINAL') {
      queryBuilder.andWhere('rolTurno.id_planificacion_cambio IS NULL');
    } else {
      queryBuilder.andWhere(buildExcluirOrigenTrasladadoSql('rolTurno'));
    }

    if (filtro.idAsignacionPersonal) {
      queryBuilder.andWhere(
        'rolTurno.id_asignacion_personal = :idAsignacionPersonal',
        {
          idAsignacionPersonal: filtro.idAsignacionPersonal,
        },
      );
    }

    if (filtro.idCalendario) {
      queryBuilder.andWhere('rolTurno.id_calendario = :idCalendario', {
        idCalendario: filtro.idCalendario,
      });
    }

    const rows = await queryBuilder
      .orderBy('calendario.fecha', 'ASC')
      .addOrderBy('personal.apellido_paterno', 'ASC')
      .addOrderBy('personal.apellido_materno', 'ASC')
      .addOrderBy('personal.nombres', 'ASC')
      .addOrderBy('rolTurno.secuencia_dia', 'ASC')
      .getRawMany<RolTurnoRow>();

    const mapped = rows.map(mapRolTurnoRow);

    const idTurnos = [
      ...new Set(
        mapped.map((r) => r.idTurno).filter((id): id is number => id !== null),
      ),
    ];

    const tramosPorTurno = await this.fetchTramosPorTurnos(idTurnos);

    for (const registro of mapped) {
      if (registro.idTurno !== null) {
        registro.tramos = tramosPorTurno.get(registro.idTurno) ?? [];
      } else {
        registro.tramos = [];
      }
    }

    return mapped;
  }

  async listarResumenPersonalPorPlanificacion(
    idPlanificacion: number,
    filtro: ListarResumenPersonalPorPlanificacionFiltro,
  ): Promise<ResumenPlanificacionPersonal[]> {
    const queryBuilder = this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .innerJoin(
        AsignacionPersonalOrmEntity,
        'asignacionPersonal',
        'asignacionPersonal.id = rolTurno.id_asignacion_personal',
      )
      .innerJoin(
        PersonalOrmEntity,
        'personal',
        'personal.id = asignacionPersonal.id_personal',
      )
      .leftJoin(
        ServicioOrmEntity,
        'servicio',
        'servicio.id = asignacionPersonal.id_servicio',
      )
      .innerJoin(
        CalendarioOrmEntity,
        'calendario',
        'calendario.id = rolTurno.id_calendario',
      )
      .select([
        'rolTurno.id_asignacion_personal AS rol_turno_id_asignacion_personal',
        'personal.id AS personal_id',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'asignacionPersonal.id_servicio AS asignacion_personal_id_servicio',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'COUNT(rolTurno.id) AS total_registros',
        'SUM(CASE WHEN rolTurno.id_turno IS NOT NULL THEN 1 ELSE 0 END) AS total_turnos',
        'SUM(CASE WHEN rolTurno.id_incidencia_personal IS NOT NULL THEN 1 ELSE 0 END) AS total_incidencias_personales',
        'COUNT(DISTINCT rolTurno.id_calendario) AS total_dias_programados',
        'SUM(rolTurno.horas_programadas) AS total_horas_programadas',
        'MIN(calendario.fecha) AS primera_fecha',
        'MAX(calendario.fecha) AS ultima_fecha',
      ])
      .where('rolTurno.id_planificacion = :idPlanificacion', {
        idPlanificacion,
      })
      .groupBy('rolTurno.id_asignacion_personal')
      .addGroupBy('personal.id')
      .addGroupBy('personal.codigo_personal')
      .addGroupBy('personal.nombres')
      .addGroupBy('personal.apellido_paterno')
      .addGroupBy('personal.apellido_materno')
      .addGroupBy('asignacionPersonal.id_servicio')
      .addGroupBy('servicio.codigo')
      .addGroupBy('servicio.nombre');

    if (filtro.idAsignacionPersonal) {
      queryBuilder.andWhere(
        'rolTurno.id_asignacion_personal = :idAsignacionPersonal',
        {
          idAsignacionPersonal: filtro.idAsignacionPersonal,
        },
      );
    }

    const rows = await queryBuilder
      .orderBy('personal.apellido_paterno', 'ASC')
      .addOrderBy('personal.apellido_materno', 'ASC')
      .addOrderBy('personal.nombres', 'ASC')
      .getRawMany<ResumenPersonalRow>();

    return rows.map((row) => ({
      idAsignacionPersonal: Number(row.rol_turno_id_asignacion_personal),
      idPersonal: Number(row.personal_id),
      codigoPersonal: row.personal_codigo_personal,
      nombreCompleto: buildNombreCompleto(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      idServicio:
        row.asignacion_personal_id_servicio === null
          ? null
          : Number(row.asignacion_personal_id_servicio),
      codigoServicio: row.servicio_codigo,
      nombreServicio: row.servicio_nombre,
      totalRegistros: Number(row.total_registros),
      totalTurnos: Number(row.total_turnos),
      totalIncidenciasPersonales: Number(row.total_incidencias_personales),
      totalDiasProgramados: Number(row.total_dias_programados),
      totalHorasProgramadas: Number(row.total_horas_programadas),
      primeraFecha: row.primera_fecha ? new Date(row.primera_fecha) : null,
      ultimaFecha: row.ultima_fecha ? new Date(row.ultima_fecha) : null,
    }));
  }

  async listarResumenCalendarioPorPlanificacion(
    idPlanificacion: number,
    filtro: ListarResumenCalendarioPorPlanificacionFiltro,
  ): Promise<ResumenPlanificacionCalendario[]> {
    const { fechaInicio, fechaFin } =
      await this.obtenerPeriodoMensualPlanificacion(idPlanificacion);

    const queryBuilder = this.dataSource
      .getRepository(CalendarioOrmEntity)
      .createQueryBuilder('calendario')
      .leftJoin(
        RolTurnoOrmEntity,
        'rolTurno',
        'rolTurno.id_calendario = calendario.id AND rolTurno.id_planificacion = :idPlanificacion',
        { idPlanificacion },
      )
      // "Es feriado" se resuelve por join contra dbo.feriado, ya no es
      // columna propia de calendario (docs/database/decisiones-tecnicas.md
      // seccion 58).
      .leftJoin(
        FeriadoOrmEntity,
        'feriado',
        'feriado.activo = 1 AND CAST(calendario.fecha AS date) BETWEEN feriado.fecha_inicio AND feriado.fecha_fin',
      )
      .leftJoin(
        TipoFeriadoOrmEntity,
        'tipoFeriado',
        'tipoFeriado.id = feriado.id_tipo_feriado',
      )
      .select([
        'calendario.id AS calendario_id',
        'calendario.fecha AS calendario_fecha',
        'calendario.anio AS calendario_anio',
        'calendario.mes AS calendario_mes',
        'calendario.dia_mes AS calendario_dia_mes',
        'calendario.dia_semana_nombre AS calendario_dia_semana_nombre',
        'calendario.es_fin_semana AS calendario_es_fin_semana',
        'feriado.id AS feriado_id',
        'feriado.nombre AS feriado_nombre',
        'tipoFeriado.codigo AS tipo_feriado_codigo',
        'COUNT(rolTurno.id) AS total_registros',
        'SUM(CASE WHEN rolTurno.id_turno IS NOT NULL THEN 1 ELSE 0 END) AS total_turnos',
        'SUM(CASE WHEN rolTurno.id_incidencia_personal IS NOT NULL THEN 1 ELSE 0 END) AS total_incidencias_personales',
        'COUNT(DISTINCT rolTurno.id_asignacion_personal) AS total_personas_programadas',
        'COALESCE(SUM(rolTurno.horas_programadas), 0) AS total_horas_programadas',
      ])
      .where(
        'CAST(calendario.fecha AS date) BETWEEN CAST(:fechaInicio AS date) AND CAST(:fechaFin AS date)',
        {
          fechaInicio: toIsoDate(fechaInicio),
          fechaFin: toIsoDate(fechaFin),
        },
      )
      .groupBy('calendario.id')
      .addGroupBy('calendario.fecha')
      .addGroupBy('calendario.anio')
      .addGroupBy('calendario.mes')
      .addGroupBy('calendario.dia_mes')
      .addGroupBy('calendario.dia_semana_nombre')
      .addGroupBy('calendario.es_fin_semana')
      .addGroupBy('feriado.id')
      .addGroupBy('feriado.nombre')
      .addGroupBy('tipoFeriado.codigo');

    if (filtro.idCalendario) {
      queryBuilder.andWhere('calendario.id = :idCalendario', {
        idCalendario: filtro.idCalendario,
      });
    }

    const rows = await queryBuilder
      .orderBy('calendario.fecha', 'ASC')
      .getRawMany<ResumenCalendarioRow>();

    return rows.map((row) => {
      const esFeriado = row.feriado_id !== null && row.feriado_id !== undefined;

      return {
        idCalendario: Number(row.calendario_id),
        fecha: new Date(row.calendario_fecha),
        anio: Number(row.calendario_anio),
        mes: Number(row.calendario_mes),
        diaMes: Number(row.calendario_dia_mes),
        diaSemanaNombre: row.calendario_dia_semana_nombre,
        esFinSemana: Boolean(row.calendario_es_fin_semana),
        esFeriado,
        codigoFeriado: esFeriado ? row.tipo_feriado_codigo : null,
        nombreFeriado: esFeriado ? row.feriado_nombre : null,
        totalRegistros: Number(row.total_registros),
        totalTurnos: Number(row.total_turnos),
        totalIncidenciasPersonales: Number(row.total_incidencias_personales),
        totalPersonasProgramadas: Number(row.total_personas_programadas),
        totalHorasProgramadas: Number(row.total_horas_programadas),
      };
    });
  }

  async listarAsignacionesDisponiblesPorServicio(
    idServicio: number,
  ): Promise<AsignacionPlanificacionDisponible[]> {
    const qb = this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacionPersonal')
      .innerJoin(
        PersonalOrmEntity,
        'personal',
        'personal.id = asignacionPersonal.id_personal',
      )
      .leftJoin(
        NivelCargoOrmEntity,
        'nivelCargo',
        'nivelCargo.id = personal.id_nivel_cargo',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacionPersonal.id_rol_funcional',
      )
      .leftJoin(
        ServicioOrmEntity,
        'servicio',
        'servicio.id = asignacionPersonal.id_servicio',
      )
      .leftJoin(
        'tipo_contrato',
        'tipoContrato',
        'tipoContrato.id = asignacionPersonal.id_tipo_contrato',
      )
      .leftJoin(
        'carga_horaria',
        'cargaHoraria',
        'cargaHoraria.id = asignacionPersonal.id_carga_horaria',
      )
      .select([
        'asignacionPersonal.id AS asignacion_personal_id',
        'asignacionPersonal.es_principal AS asignacion_personal_es_principal',
        'asignacionPersonal.nro_item AS asignacion_personal_nro_item',
        'asignacionPersonal.id_carga_horaria AS asignacion_personal_id_carga_horaria',
        'asignacionPersonal.codigo_fuente_item AS asignacion_personal_codigo_fuente_item',
        'personal.id AS personal_id',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.documento_identidad AS personal_documento_identidad',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'nivelCargo.codigo AS nivel_cargo_codigo',
        'nivelCargo.nombre AS nivel_cargo_nombre',
        'rolFuncional.codigo AS rol_funcional_codigo',
        'rolFuncional.nombre AS rol_funcional_nombre',
        'rolFuncional.es_jefatura AS rol_funcional_es_jefatura',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'tipoContrato.id AS tipo_contrato_id',
        'tipoContrato.codigo AS tipo_contrato_codigo',
        'tipoContrato.nombre AS tipo_contrato_nombre',
        'cargaHoraria.codigo AS carga_horaria_codigo',
        'cargaHoraria.nombre AS carga_horaria_nombre',
        'cargaHoraria.horas_dia_base AS carga_horaria_horas_dia_base',
        'nivelCargo.orden_visual AS nivel_cargo_orden_visual',
      ])
      .where('asignacionPersonal.id_servicio = :idServicio', { idServicio })
      .andWhere('asignacionPersonal.id_servicio IS NOT NULL')
      .andWhere('asignacionPersonal.activo = :activo', { activo: true })
      .andWhere('personal.activo = :activoPersonal', { activoPersonal: true })
      .andWhere(
        '(rolFuncional.codigo IS NULL OR rolFuncional.codigo <> :rolJefaDepartamento)',
        { rolJefaDepartamento: 'JEFE_DEPARTAMENTO' },
      );

    const rows = await qb
      .orderBy('asignacionPersonal.es_principal', 'DESC')
      .addOrderBy('personal.apellido_paterno', 'ASC')
      .addOrderBy('personal.apellido_materno', 'ASC')
      .addOrderBy('personal.nombres', 'ASC')
      .getRawMany<AsignacionDisponibleRow>();

    return rows.map((row) => ({
      idAsignacionPersonal: Number(row.asignacion_personal_id),
      idPersonal: Number(row.personal_id),
      codigoPersonal: row.personal_codigo_personal,
      nroItem: row.asignacion_personal_nro_item,
      idCargaHoraria:
        row.asignacion_personal_id_carga_horaria === null
          ? null
          : Number(row.asignacion_personal_id_carga_horaria),
      codigoCargaHoraria: row.carga_horaria_codigo,
      nombreCargaHoraria: row.carga_horaria_nombre,
      horasDiaBase:
        row.carga_horaria_horas_dia_base === null
          ? null
          : Number(row.carga_horaria_horas_dia_base),
      ci: row.personal_documento_identidad,
      idTipoContrato:
        row.tipo_contrato_id === null ? null : Number(row.tipo_contrato_id),
      codigoTipoContrato: row.tipo_contrato_codigo,
      nombreTipoContrato: row.tipo_contrato_nombre,
      codigoFuenteItem: row.asignacion_personal_codigo_fuente_item,
      apellidoPaterno: row.personal_apellido_paterno,
      apellidoMaterno: row.personal_apellido_materno,
      nombres: row.personal_nombres,
      nombreCompleto: buildNombreCompleto(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      cargoActual: normalizeCargoNombre(
        row.nivel_cargo_codigo,
        row.nivel_cargo_nombre,
      ),
      rolFuncionalCodigo: row.rol_funcional_codigo,
      rolFuncionalNombre: row.rol_funcional_nombre,
      esJefatura:
        row.rol_funcional_es_jefatura === null
          ? false
          : Boolean(row.rol_funcional_es_jefatura),
      servicioCodigo: row.servicio_codigo,
      servicioNombre: row.servicio_nombre,
      esPrincipal: Boolean(row.asignacion_personal_es_principal),
      ordenVisualCargo:
        row.nivel_cargo_orden_visual === null
          ? null
          : Number(row.nivel_cargo_orden_visual),
    }));
  }

  async listarCambiosDestinoPorPlanificacion(
    idPlanificacion: number,
  ): Promise<CambioDestinoPlanificacion[]> {
    const rows = await this.dataSource.query<
      Array<{
        id_asignacion_destino: number | string;
        id: number | string;
        fecha_efectiva: Date;
      }>
    >(
      `
        SELECT id_asignacion_destino, id, fecha_efectiva
        FROM dbo.planificacion_cambio_asignacion
        WHERE id_planificacion_destino = @0
          AND activo = 1
      `,
      [idPlanificacion],
    );

    return rows.map((row) => ({
      idAsignacionDestino: Number(row.id_asignacion_destino),
      idCambio: Number(row.id),
      fechaEfectiva: new Date(row.fecha_efectiva),
    }));
  }

  async obtenerCambioDestinoParaCelda(
    idPlanificacion: number,
    idAsignacionPersonal: number,
    idCalendario: number,
  ): Promise<{ idCambio: number; fechaEfectiva: Date } | null> {
    const rows = await this.dataSource.query<
      Array<{
        id: number | string;
        fecha_efectiva: Date;
      }>
    >(
      `
        SELECT TOP 1 cambio.id, cambio.fecha_efectiva
        FROM dbo.planificacion_cambio_asignacion cambio
        INNER JOIN dbo.calendario calendario
          ON calendario.id = @2
        WHERE cambio.id_planificacion_destino = @0
          AND cambio.id_asignacion_destino = @1
          AND cambio.activo = 1
          AND CAST(calendario.fecha AS date) >= cambio.fecha_efectiva
        ORDER BY cambio.fecha_efectiva DESC, cambio.id DESC
      `,
      [idPlanificacion, idAsignacionPersonal, idCalendario],
    );

    const row = rows[0];
    return row
      ? {
          idCambio: Number(row.id),
          fechaEfectiva: new Date(row.fecha_efectiva),
        }
      : null;
  }

  async obtenerPorIdEnPlanificacion(
    idPlanificacion: number,
    idRolTurno: number,
  ): Promise<RolTurnoPlanificacion | null> {
    const row = await this.createDetailQuery()
      .where('rolTurno.id_planificacion = :idPlanificacion', {
        idPlanificacion,
      })
      .andWhere('rolTurno.id = :idRolTurno', { idRolTurno })
      .getRawOne<RolTurnoRow | undefined>();

    return row ? mapRolTurnoRow(row) : null;
  }

  async contarPorPlanificacion(idPlanificacion: number): Promise<number> {
    return this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .where('rolTurno.id_planificacion = :idPlanificacion', {
        idPlanificacion,
      })
      .getCount();
  }

  async existeAsignacionPersonalEnServicio(
    idAsignacionPersonal: number,
    idServicio: number,
  ): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacionPersonal')
      .where('asignacionPersonal.id = :idAsignacionPersonal', {
        idAsignacionPersonal,
      })
      .andWhere('asignacionPersonal.id_servicio = :idServicio', { idServicio })
      .andWhere('asignacionPersonal.activo = :activo', { activo: true })
      .getCount();

    return count > 0;
  }

  async existeAsignacionPersonalEnDepartamento(
    idAsignacionPersonal: number,
    idDepartamento: number,
  ): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('ap')
      .where('ap.id = :idAsignacionPersonal', { idAsignacionPersonal })
      .andWhere('ap.id_departamento = :idDepartamento', { idDepartamento })
      .andWhere('ap.id_servicio IS NULL')
      .andWhere('ap.activo = :activo', { activo: true })
      .getCount();

    return count > 0;
  }

  async listarAsignacionesDisponiblesPorDepartamento(
    idDepartamento: number,
  ): Promise<AsignacionPlanificacionDisponible[]> {
    const qb = this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacionPersonal')
      .innerJoin(
        PersonalOrmEntity,
        'personal',
        'personal.id = asignacionPersonal.id_personal',
      )
      .leftJoin(
        NivelCargoOrmEntity,
        'nivelCargo',
        'nivelCargo.id = personal.id_nivel_cargo',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacionPersonal.id_rol_funcional',
      )
      .leftJoin(
        'tipo_contrato',
        'tipoContrato',
        'tipoContrato.id = asignacionPersonal.id_tipo_contrato',
      )
      .leftJoin(
        'carga_horaria',
        'cargaHoraria',
        'cargaHoraria.id = asignacionPersonal.id_carga_horaria',
      )
      .select([
        'asignacionPersonal.id AS asignacion_personal_id',
        'asignacionPersonal.es_principal AS asignacion_personal_es_principal',
        'asignacionPersonal.nro_item AS asignacion_personal_nro_item',
        'asignacionPersonal.id_carga_horaria AS asignacion_personal_id_carga_horaria',
        'asignacionPersonal.codigo_fuente_item AS asignacion_personal_codigo_fuente_item',
        'personal.id AS personal_id',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.documento_identidad AS personal_documento_identidad',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'nivelCargo.codigo AS nivel_cargo_codigo',
        'nivelCargo.nombre AS nivel_cargo_nombre',
        'rolFuncional.codigo AS rol_funcional_codigo',
        'rolFuncional.nombre AS rol_funcional_nombre',
        'rolFuncional.es_jefatura AS rol_funcional_es_jefatura',
        'NULL AS servicio_codigo',
        'NULL AS servicio_nombre',
        'tipoContrato.id AS tipo_contrato_id',
        'tipoContrato.codigo AS tipo_contrato_codigo',
        'tipoContrato.nombre AS tipo_contrato_nombre',
        'cargaHoraria.codigo AS carga_horaria_codigo',
        'cargaHoraria.nombre AS carga_horaria_nombre',
        'cargaHoraria.horas_dia_base AS carga_horaria_horas_dia_base',
        'nivelCargo.orden_visual AS nivel_cargo_orden_visual',
      ])
      .where('asignacionPersonal.id_departamento = :idDepartamento', {
        idDepartamento,
      })
      .andWhere('asignacionPersonal.id_servicio IS NULL')
      .andWhere('asignacionPersonal.activo = :activo', { activo: true })
      .andWhere('personal.activo = :activoPersonal', { activoPersonal: true });

    const rows = await qb
      .orderBy('asignacionPersonal.es_principal', 'DESC')
      .addOrderBy('personal.apellido_paterno', 'ASC')
      .addOrderBy('personal.apellido_materno', 'ASC')
      .addOrderBy('personal.nombres', 'ASC')
      .getRawMany<AsignacionDisponibleRow>();

    return rows.map((row) => ({
      idAsignacionPersonal: Number(row.asignacion_personal_id),
      idPersonal: Number(row.personal_id),
      codigoPersonal: row.personal_codigo_personal,
      nroItem: row.asignacion_personal_nro_item,
      idCargaHoraria:
        row.asignacion_personal_id_carga_horaria === null
          ? null
          : Number(row.asignacion_personal_id_carga_horaria),
      codigoCargaHoraria: row.carga_horaria_codigo,
      nombreCargaHoraria: row.carga_horaria_nombre,
      horasDiaBase:
        row.carga_horaria_horas_dia_base === null
          ? null
          : Number(row.carga_horaria_horas_dia_base),
      ci: row.personal_documento_identidad,
      idTipoContrato:
        row.tipo_contrato_id === null ? null : Number(row.tipo_contrato_id),
      codigoTipoContrato: row.tipo_contrato_codigo,
      nombreTipoContrato: row.tipo_contrato_nombre,
      codigoFuenteItem: row.asignacion_personal_codigo_fuente_item,
      apellidoPaterno: row.personal_apellido_paterno,
      apellidoMaterno: row.personal_apellido_materno,
      nombres: row.personal_nombres,
      nombreCompleto: buildNombreCompleto(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      cargoActual: normalizeCargoNombre(
        row.nivel_cargo_codigo,
        row.nivel_cargo_nombre,
      ),
      rolFuncionalCodigo: row.rol_funcional_codigo,
      rolFuncionalNombre: row.rol_funcional_nombre,
      esJefatura:
        row.rol_funcional_es_jefatura === null
          ? false
          : Boolean(row.rol_funcional_es_jefatura),
      servicioCodigo: row.servicio_codigo,
      servicioNombre: row.servicio_nombre,
      esPrincipal: Boolean(row.asignacion_personal_es_principal),
      ordenVisualCargo:
        row.nivel_cargo_orden_visual === null
          ? null
          : Number(row.nivel_cargo_orden_visual),
    }));
  }

  async existeCalendarioEnRango(
    idCalendario: number,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<boolean> {
    const fechaInicioIso = fechaInicio.toISOString().slice(0, 10);
    const fechaFinIso = fechaFin.toISOString().slice(0, 10);

    const count = await this.dataSource
      .getRepository(CalendarioOrmEntity)
      .createQueryBuilder('calendario')
      .where('calendario.id = :idCalendario', { idCalendario })
      .andWhere(
        'CAST(calendario.fecha AS date) BETWEEN CAST(:fechaInicio AS date) AND CAST(:fechaFin AS date)',
        {
          fechaInicio: fechaInicioIso,
          fechaFin: fechaFinIso,
        },
      )
      .getCount();

    return count > 0;
  }

  async obtenerTurnoValidacion(
    idTurno: number,
  ): Promise<TurnoValidacion | null> {
    const row = await this.dataSource
      .getRepository(TurnoOrmEntity)
      .createQueryBuilder('turno')
      .select([
        'turno.id AS turno_id',
        'turno.id_servicio AS turno_id_servicio',
        'turno.codigo AS turno_codigo',
        'turno.nombre AS turno_nombre',
        'turno.hora_inicio AS turno_hora_inicio',
        'turno.hora_fin AS turno_hora_fin',
        'turno.cruza_medianoche AS turno_cruza_medianoche',
        'turno.duracion_horas AS turno_duracion_horas',
        'turno.activo AS turno_activo',
      ])
      .where('turno.id = :idTurno', { idTurno })
      .getRawOne<TurnoValidacionRow | undefined>();

    if (!row) {
      return null;
    }

    return {
      id: Number(row.turno_id),
      idServicio: Number(row.turno_id_servicio),
      codigo: row.turno_codigo,
      nombre: row.turno_nombre,
      horaInicio: row.turno_hora_inicio,
      horaFin: row.turno_hora_fin,
      cruzaMedianoche: Boolean(row.turno_cruza_medianoche),
      duracionHoras: Number(row.turno_duracion_horas),
      activo: Boolean(row.turno_activo),
    };
  }

  async existeIncidenciaPersonal(
    idIncidenciaPersonal: number,
  ): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(IncidenciaPersonalOrmEntity)
      .createQueryBuilder('incidenciaPersonal')
      .where('incidenciaPersonal.id = :idIncidenciaPersonal', {
        idIncidenciaPersonal,
      })
      .getCount();

    return count > 0;
  }

  async obtenerIncidenciaPersonalValidacion(
    idIncidenciaPersonal: number,
  ): Promise<IncidenciaPersonalValidacion | null> {
    const row = await this.dataSource
      .getRepository(IncidenciaPersonalOrmEntity)
      .createQueryBuilder('incidenciaPersonal')
      .select([
        'incidenciaPersonal.id AS incidencia_personal_id',
        'incidenciaPersonal.codigo AS incidencia_personal_codigo',
        'incidenciaPersonal.nombre AS incidencia_personal_nombre',
        'incidenciaPersonal.alcance AS incidencia_personal_alcance',
        'incidenciaPersonal.activo AS incidencia_personal_activo',
      ])
      .where('incidenciaPersonal.id = :idIncidenciaPersonal', {
        idIncidenciaPersonal,
      })
      .getRawOne<IncidenciaPersonalValidacionRow | undefined>();

    if (!row) {
      return null;
    }

    return {
      id: Number(row.incidencia_personal_id),
      codigo: row.incidencia_personal_codigo,
      nombre: row.incidencia_personal_nombre,
      alcance: row.incidencia_personal_alcance as
        | 'GENERAL'
        | 'PERSONAL'
        | 'OTRO',
      activo: Boolean(row.incidencia_personal_activo),
    };
  }

  async existeConflictoSecuencia(
    input: VerificarConflictoRolTurnoInput,
  ): Promise<boolean> {
    const queryBuilder = this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .where('rolTurno.id_planificacion = :idPlanificacion', {
        idPlanificacion: input.idPlanificacion,
      })
      .andWhere('rolTurno.id_asignacion_personal = :idAsignacionPersonal', {
        idAsignacionPersonal: input.idAsignacionPersonal,
      })
      .andWhere('rolTurno.id_calendario = :idCalendario', {
        idCalendario: input.idCalendario,
      })
      .andWhere('rolTurno.secuencia_dia = :secuenciaDia', {
        secuenciaDia: input.secuenciaDia,
      });

    if (input.excluirIdRolTurno) {
      queryBuilder.andWhere('rolTurno.id <> :excluirIdRolTurno', {
        excluirIdRolTurno: input.excluirIdRolTurno,
      });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  async obtenerEstadoCeldaMatriz(
    idPlanificacion: number,
    idAsignacionPersonal: number,
    idCalendario: number,
    idServicio: number | null,
    fechaInicio: Date,
    fechaFin: Date,
  ): Promise<EstadoCeldaMatrizPlanificacion> {
    const [asignacionValida, calendarioValido, registros] = await Promise.all([
      idServicio !== null
        ? this.existeAsignacionPersonalEnServicio(
            idAsignacionPersonal,
            idServicio,
          )
        : Promise.resolve(true),
      this.existeCalendarioEnRango(idCalendario, fechaInicio, fechaFin),
      this.listarRegistrosCeldaMatriz(
        idPlanificacion,
        idAsignacionPersonal,
        idCalendario,
      ),
    ]);

    return {
      asignacionValida,
      calendarioValido,
      registros,
    };
  }

  async crear(
    input: CrearRolTurnoPlanificacionInput,
  ): Promise<RolTurnoPlanificacion> {
    const insertResult = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(RolTurnoOrmEntity)
      .values({
        idPlanificacion: input.idPlanificacion,
        idAsignacionPersonal: input.idAsignacionPersonal,
        idCalendario: input.idCalendario,
        secuenciaDia: input.secuenciaDia,
        idTurno: input.idTurno,
        idIncidenciaPersonal: input.idIncidenciaPersonal,
        horasProgramadas: input.horasProgramadas,
        origenRegistro: input.origenRegistro,
        createdBy: input.idUsuarioOperacion,
        updatedBy: null,
        updatedAt: null,
      })
      .execute();

    const identifier = insertResult.identifiers[0];
    const id =
      identifier && 'id' in identifier ? Number(identifier.id as number) : null;

    if (!id) {
      throw new Error('No se pudo resolver el id del rol_turno creado.');
    }

    const registro = await this.obtenerPorIdEnPlanificacion(
      input.idPlanificacion,
      id,
    );

    if (!registro) {
      throw errorAlConfirmarGuardado(
        'rolTurno',
        id,
        TypeOrmRolTurnoRepository.name,
      );
    }

    return registro;
  }

  async actualizar(
    input: ActualizarRolTurnoPlanificacionInput,
  ): Promise<RolTurnoPlanificacion> {
    await this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder()
      .update(RolTurnoOrmEntity)
      .set({
        idAsignacionPersonal: input.idAsignacionPersonal,
        idCalendario: input.idCalendario,
        secuenciaDia: input.secuenciaDia,
        idTurno: input.idTurno,
        idIncidenciaPersonal: input.idIncidenciaPersonal,
        horasProgramadas: input.horasProgramadas,
        origenRegistro: input.origenRegistro,
        updatedBy: input.idUsuarioOperacion,
        updatedAt: new Date(),
      })
      .where('id = :idRolTurno', { idRolTurno: input.idRolTurno })
      .andWhere('id_planificacion = :idPlanificacion', {
        idPlanificacion: input.idPlanificacion,
      })
      .execute();

    const registro = await this.obtenerPorIdEnPlanificacion(
      input.idPlanificacion,
      input.idRolTurno,
    );

    if (!registro) {
      throw errorAlConfirmarGuardado(
        'rolTurno',
        input.idRolTurno,
        TypeOrmRolTurnoRepository.name,
      );
    }

    return registro;
  }

  async aplicarCeldaMatrizRapida(
    input: AplicarCeldaMatrizRapidaInput,
  ): Promise<CeldaMatrizPersistida> {
    return this.dataSource.transaction(async (manager) => {
      const existing = await manager
        .getRepository(RolTurnoOrmEntity)
        .createQueryBuilder('rolTurno')
        .select([
          'rolTurno.id AS id',
          'rolTurno.secuencia_dia AS secuencia_dia',
          'rolTurno.id_turno AS id_turno',
          'rolTurno.id_incidencia_personal AS id_incidencia_personal',
          'rolTurno.horas_programadas AS horas_programadas',
        ])
        .where('rolTurno.id_planificacion = :idPlanificacion', {
          idPlanificacion: input.idPlanificacion,
        })
        .andWhere('rolTurno.id_asignacion_personal = :idAsignacionPersonal', {
          idAsignacionPersonal: input.idAsignacionPersonal,
        })
        .andWhere('rolTurno.id_calendario = :idCalendario', {
          idCalendario: input.idCalendario,
        })
        .andWhere(
          input.idPlanificacionCambio
            ? 'rolTurno.id_planificacion_cambio = :idPlanificacionCambio'
            : 'rolTurno.id_planificacion_cambio IS NULL',
          { idPlanificacionCambio: input.idPlanificacionCambio },
        )
        .orderBy('rolTurno.secuencia_dia', 'ASC')
        .getRawMany<RegistroCeldaMatrizRapidaRow>();

      if (input.limpiar) {
        if (existing.length > 0) {
          await manager
            .getRepository(RolTurnoOrmEntity)
            .createQueryBuilder()
            .delete()
            .from(RolTurnoOrmEntity)
            .where('id_planificacion = :idPlanificacion', {
              idPlanificacion: input.idPlanificacion,
            })
            .andWhere('id_asignacion_personal = :idAsignacionPersonal', {
              idAsignacionPersonal: input.idAsignacionPersonal,
            })
            .andWhere('id_calendario = :idCalendario', {
              idCalendario: input.idCalendario,
            })
            .andWhere(
              input.idPlanificacionCambio
                ? 'id_planificacion_cambio = :idPlanificacionCambio'
                : 'id_planificacion_cambio IS NULL',
              { idPlanificacionCambio: input.idPlanificacionCambio },
            )
            .execute();
        }

        return {
          idRolTurno: null,
          secuenciaDia: null,
          idTurno: null,
          codigoTurno: null,
          nombreTurno: null,
          horaInicio: null,
          horaFin: null,
          cruzaMedianoche: null,
          idIncidenciaPersonal: null,
          codigoIncidenciaPersonal: null,
          nombreIncidenciaPersonal: null,
          horasProgramadas: null,
        };
      }

      const primary = existing[0];
      const extraIds = existing.slice(1).map((row) => Number(row.id));
      let targetId = primary ? Number(primary.id) : null;

      if (
        primary &&
        Number(primary.id_turno ?? 0) === Number(input.idTurno ?? 0) &&
        Number(primary.id_incidencia_personal ?? 0) ===
          Number(input.idIncidenciaPersonal ?? 0) &&
        Number(primary.horas_programadas) === Number(input.horasProgramadas) &&
        Number(primary.secuencia_dia) === Number(input.secuenciaDia) &&
        extraIds.length === 0
      ) {
        return this.obtenerCeldaMatrizPersistidaPorId(
          manager,
          Number(primary.id),
        );
      }

      if (targetId) {
        await manager
          .getRepository(RolTurnoOrmEntity)
          .createQueryBuilder()
          .update(RolTurnoOrmEntity)
          .set({
            idAsignacionPersonal: input.idAsignacionPersonal,
            idCalendario: input.idCalendario,
            secuenciaDia: input.secuenciaDia,
            idTurno: input.idTurno,
            idIncidenciaPersonal: input.idIncidenciaPersonal,
            horasProgramadas: input.horasProgramadas,
            origenRegistro: input.origenRegistro,
            idPlanificacionCambio: input.idPlanificacionCambio ?? null,
            updatedBy: input.idUsuarioOperacion,
            updatedAt: new Date(),
          })
          .where('id = :idRolTurno', { idRolTurno: targetId })
          .andWhere('id_planificacion = :idPlanificacion', {
            idPlanificacion: input.idPlanificacion,
          })
          .execute();
      } else {
        const insertResult = await manager
          .createQueryBuilder()
          .insert()
          .into(RolTurnoOrmEntity)
          .values({
            idPlanificacion: input.idPlanificacion,
            idAsignacionPersonal: input.idAsignacionPersonal,
            idCalendario: input.idCalendario,
            secuenciaDia: input.secuenciaDia,
            idTurno: input.idTurno,
            idIncidenciaPersonal: input.idIncidenciaPersonal,
            horasProgramadas: input.horasProgramadas,
            origenRegistro: input.origenRegistro,
            idPlanificacionCambio: input.idPlanificacionCambio ?? null,
            createdBy: input.idUsuarioOperacion,
            updatedBy: null,
            updatedAt: null,
          })
          .execute();

        const identifier = insertResult.identifiers[0];
        targetId =
          identifier && 'id' in identifier
            ? Number(identifier.id as number)
            : null;
      }

      if (!targetId) {
        throw new Error('No se pudo resolver el id de la celda persistida.');
      }

      const idsToDelete = existing
        .map((row) => Number(row.id))
        .filter((id) => id !== targetId);

      if (idsToDelete.length > 0) {
        await manager
          .getRepository(RolTurnoOrmEntity)
          .createQueryBuilder()
          .delete()
          .from(RolTurnoOrmEntity)
          .where('id IN (:...ids)', { ids: idsToDelete })
          .execute();
      }

      return this.obtenerCeldaMatrizPersistidaPorId(manager, targetId);
    });
  }

  async eliminar(idPlanificacion: number, idRolTurno: number): Promise<void> {
    await this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder()
      .delete()
      .from(RolTurnoOrmEntity)
      .where('id = :idRolTurno', { idRolTurno })
      .andWhere('id_planificacion = :idPlanificacion', { idPlanificacion })
      .execute();
  }

  async copiarRegistrosDesdePlanificacionBase(
    input: CopiarRegistrosDesdePlanificacionBaseInput,
  ): Promise<ResultadoCopiaRegistrosPlanificacion> {
    const [
      registrosOrigen,
      calendariosObjetivo,
      asignacionesServicio,
      turnosActivos,
    ] = await Promise.all([
      this.listarRegistrosBaseParaCarga(input.idPlanificacionBase),
      this.listarCalendariosPlanificacion(input.idPlanificacionObjetivo),
      this.listarAsignacionesActivasServicioPorPlanificacion(
        input.idPlanificacionObjetivo,
      ),
      this.listarTurnosActivosServicioPorPlanificacion(
        input.idPlanificacionObjetivo,
      ),
    ]);

    const calendarioPorDiaMes = new Map<number, number>(
      calendariosObjetivo.map((item) => [item.diaMes, item.id]),
    );
    const asignacionesActivas = new Set(
      asignacionesServicio.map((item) => item.idAsignacionPersonal),
    );
    const turnosValidos = new Set(turnosActivos.map((item) => item.idTurno));

    let totalRegistrosEliminadosPrevios = 0;

    if (input.modoCarga === 'REEMPLAZAR') {
      const deleteResult = await this.dataSource
        .getRepository(RolTurnoOrmEntity)
        .createQueryBuilder()
        .delete()
        .from(RolTurnoOrmEntity)
        .where('id_planificacion = :idPlanificacionObjetivo', {
          idPlanificacionObjetivo: input.idPlanificacionObjetivo,
        })
        .execute();

      totalRegistrosEliminadosPrevios = deleteResult.affected ?? 0;
    }

    const conflictosExistentes =
      input.modoCarga === 'COMPLEMENTAR'
        ? await this.listarClavesExistentesPlanificacion(
            input.idPlanificacionObjetivo,
          )
        : new Set<string>();

    const values: Array<{
      idPlanificacion: number;
      idAsignacionPersonal: number;
      idCalendario: number;
      secuenciaDia: number;
      idTurno: number | null;
      idIncidenciaPersonal: number | null;
      horasProgramadas: number;
      origenRegistro: 'PLANTILLA';
      createdBy: number;
      updatedBy: null;
      updatedAt: null;
    }> = [];

    let totalRegistrosOmitidosPorConflicto = 0;
    let totalRegistrosOmitidosPorCalendario = 0;
    let totalRegistrosOmitidosPorAsignacion = 0;
    let totalRegistrosOmitidosPorTurnoOIncidenciaPersonal = 0;

    for (const registro of registrosOrigen) {
      const idCalendarioObjetivo = calendarioPorDiaMes.get(registro.diaMes);

      if (!idCalendarioObjetivo) {
        totalRegistrosOmitidosPorCalendario += 1;
        continue;
      }

      if (!asignacionesActivas.has(registro.idAsignacionPersonal)) {
        totalRegistrosOmitidosPorAsignacion += 1;
        continue;
      }

      if (
        (registro.idTurno !== null && !turnosValidos.has(registro.idTurno)) ||
        (registro.idTurno === null && registro.idIncidenciaPersonal === null)
      ) {
        totalRegistrosOmitidosPorTurnoOIncidenciaPersonal += 1;
        continue;
      }

      const key = buildRolTurnoConflictKey(
        registro.idAsignacionPersonal,
        idCalendarioObjetivo,
        registro.secuenciaDia,
      );

      if (conflictosExistentes.has(key)) {
        totalRegistrosOmitidosPorConflicto += 1;
        continue;
      }

      conflictosExistentes.add(key);
      values.push({
        idPlanificacion: input.idPlanificacionObjetivo,
        idAsignacionPersonal: registro.idAsignacionPersonal,
        idCalendario: idCalendarioObjetivo,
        secuenciaDia: registro.secuenciaDia,
        idTurno: registro.idTurno,
        idIncidenciaPersonal: registro.idIncidenciaPersonal,
        horasProgramadas: registro.horasProgramadas,
        origenRegistro: 'PLANTILLA',
        createdBy: input.idUsuarioOperacion,
        updatedBy: null,
        updatedAt: null,
      });
    }

    if (values.length > 0) {
      await this.dataSource
        .createQueryBuilder()
        .insert()
        .into(RolTurnoOrmEntity)
        .values(values)
        .execute();
    }

    return {
      idPlanificacion: input.idPlanificacionObjetivo,
      idPlanificacionBase: input.idPlanificacionBase,
      modoCarga: input.modoCarga,
      totalRegistrosOrigen: registrosOrigen.length,
      totalRegistrosInsertados: values.length,
      totalRegistrosOmitidosPorConflicto,
      totalRegistrosOmitidosPorCalendario,
      totalRegistrosOmitidosPorAsignacion,
      totalRegistrosOmitidosPorTurnoOIncidenciaPersonal,
      totalRegistrosEliminadosPrevios,
    };
  }

  private async listarCalendariosPlanificacion(idPlanificacion: number) {
    const { fechaInicio, fechaFin } =
      await this.obtenerPeriodoMensualPlanificacion(idPlanificacion);

    const rows = await this.dataSource
      .getRepository(CalendarioOrmEntity)
      .createQueryBuilder('calendario')
      .select([
        'calendario.id AS calendario_id',
        'calendario.fecha AS calendario_fecha',
        'calendario.dia_mes AS calendario_dia_mes',
        'calendario.dia_semana_num AS calendario_dia_semana_num',
        'calendario.dia_semana_nombre AS calendario_dia_semana_nombre',
        'calendario.es_feriado AS calendario_es_feriado',
      ])
      .where(
        'CAST(calendario.fecha AS date) BETWEEN CAST(:fechaInicio AS date) AND CAST(:fechaFin AS date)',
        {
          fechaInicio: toIsoDate(fechaInicio),
          fechaFin: toIsoDate(fechaFin),
        },
      )
      .orderBy('calendario.fecha', 'ASC')
      .getRawMany<{
        calendario_id: number | string;
        calendario_fecha: Date;
        calendario_dia_mes: number | string;
        calendario_dia_semana_num: number | string;
        calendario_dia_semana_nombre: string;
        calendario_es_feriado: boolean | number;
      }>();

    return rows.map((row) => ({
      id: Number(row.calendario_id),
      fecha: new Date(row.calendario_fecha),
      diaMes: Number(row.calendario_dia_mes),
      diaSemanaNum: Number(row.calendario_dia_semana_num),
      diaSemanaNombre: row.calendario_dia_semana_nombre,
      esFeriado: Boolean(row.calendario_es_feriado),
    }));
  }

  private async listarRegistrosBaseParaCarga(idPlanificacionBase: number) {
    const rows = await this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .innerJoin(
        CalendarioOrmEntity,
        'calendario',
        'calendario.id = rolTurno.id_calendario',
      )
      .select([
        'rolTurno.id_asignacion_personal AS id_asignacion_personal',
        'calendario.dia_mes AS dia_mes',
        'rolTurno.secuencia_dia AS secuencia_dia',
        'rolTurno.id_turno AS id_turno',
        'rolTurno.id_incidencia_personal AS id_incidencia_personal',
        'rolTurno.horas_programadas AS horas_programadas',
      ])
      .where('rolTurno.id_planificacion = :idPlanificacionBase', {
        idPlanificacionBase,
      })
      .orderBy('calendario.dia_mes', 'ASC')
      .addOrderBy('rolTurno.id_asignacion_personal', 'ASC')
      .addOrderBy('rolTurno.secuencia_dia', 'ASC')
      .getRawMany<{
        id_asignacion_personal: number | string;
        dia_mes: number | string;
        secuencia_dia: number | string;
        id_turno: number | string | null;
        id_incidencia_personal: number | string | null;
        horas_programadas: number | string;
      }>();

    return rows.map((row) => ({
      idAsignacionPersonal: Number(row.id_asignacion_personal),
      diaMes: Number(row.dia_mes),
      secuenciaDia: Number(row.secuencia_dia),
      idTurno: row.id_turno === null ? null : Number(row.id_turno),
      idIncidenciaPersonal:
        row.id_incidencia_personal === null
          ? null
          : Number(row.id_incidencia_personal),
      horasProgramadas: Number(row.horas_programadas),
    }));
  }

  private async listarAsignacionesActivasServicioPorPlanificacion(
    idPlanificacion: number,
  ) {
    const rows = await this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacionPersonal')
      .innerJoin(
        PlanificacionOrmEntity,
        'planificacion',
        'planificacion.id = :idPlanificacion AND planificacion.id_servicio = asignacionPersonal.id_servicio',
        { idPlanificacion },
      )
      .select(['asignacionPersonal.id AS asignacion_personal_id'])
      .where('asignacionPersonal.activo = :activo', { activo: true })
      .getRawMany<{ asignacion_personal_id: number | string }>();

    return rows.map((row) => ({
      idAsignacionPersonal: Number(row.asignacion_personal_id),
    }));
  }

  private async listarTurnosActivosServicioPorPlanificacion(
    idPlanificacion: number,
  ) {
    const rows = await this.dataSource
      .getRepository(TurnoOrmEntity)
      .createQueryBuilder('turno')
      .innerJoin(
        PlanificacionOrmEntity,
        'planificacion',
        'planificacion.id = :idPlanificacion AND planificacion.id_servicio = turno.id_servicio',
        { idPlanificacion },
      )
      .select(['turno.id AS turno_id'])
      .where('turno.activo = :activo', { activo: true })
      .getRawMany<{ turno_id: number | string }>();

    return rows.map((row) => ({
      idTurno: Number(row.turno_id),
    }));
  }

  private async listarClavesExistentesPlanificacion(idPlanificacion: number) {
    const rows = await this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .select([
        'rolTurno.id_asignacion_personal AS id_asignacion_personal',
        'rolTurno.id_calendario AS id_calendario',
        'rolTurno.secuencia_dia AS secuencia_dia',
      ])
      .where('rolTurno.id_planificacion = :idPlanificacion', {
        idPlanificacion,
      })
      .getRawMany<{
        id_asignacion_personal: number | string;
        id_calendario: number | string;
        secuencia_dia: number | string;
      }>();

    return new Set(
      rows.map((row) =>
        buildRolTurnoConflictKey(
          Number(row.id_asignacion_personal),
          Number(row.id_calendario),
          Number(row.secuencia_dia),
        ),
      ),
    );
  }

  private async obtenerPeriodoMensualPlanificacion(idPlanificacion: number) {
    const metadata = await this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder('planificacion')
      .select(['planificacion.anio AS anio', 'planificacion.mes AS mes'])
      .where('planificacion.id = :idPlanificacion', { idPlanificacion })
      .getRawOne<
        | {
            anio: number | string;
            mes: number | string;
          }
        | undefined
      >();

    if (!metadata) {
      throw new Error(
        `No se pudo resolver el periodo mensual de la planificacion ${idPlanificacion}.`,
      );
    }

    return buildMonthlyUtcPeriod(Number(metadata.anio), Number(metadata.mes));
  }

  private async listarRegistrosCeldaMatriz(
    idPlanificacion: number,
    idAsignacionPersonal: number,
    idCalendario: number,
  ): Promise<RegistroCeldaMatrizExistente[]> {
    const rows = await this.dataSource
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .select([
        'rolTurno.id AS id',
        'rolTurno.secuencia_dia AS secuencia_dia',
        'rolTurno.id_turno AS id_turno',
        'rolTurno.id_incidencia_personal AS id_incidencia_personal',
        'rolTurno.horas_programadas AS horas_programadas',
      ])
      .where('rolTurno.id_planificacion = :idPlanificacion', {
        idPlanificacion,
      })
      .andWhere('rolTurno.id_asignacion_personal = :idAsignacionPersonal', {
        idAsignacionPersonal,
      })
      .andWhere('rolTurno.id_calendario = :idCalendario', { idCalendario })
      .orderBy('rolTurno.secuencia_dia', 'ASC')
      .getRawMany<RegistroCeldaMatrizRapidaRow>();

    return rows.map((row) => ({
      idRolTurno: Number(row.id),
      secuenciaDia: Number(row.secuencia_dia),
      idTurno: row.id_turno === null ? null : Number(row.id_turno),
      idIncidenciaPersonal:
        row.id_incidencia_personal === null
          ? null
          : Number(row.id_incidencia_personal),
      horasProgramadas: Number(row.horas_programadas),
    }));
  }

  private async obtenerCeldaMatrizPersistidaPorId(
    manager: DataSource['manager'],
    idRolTurno: number,
  ): Promise<CeldaMatrizPersistida> {
    const row = await manager
      .getRepository(RolTurnoOrmEntity)
      .createQueryBuilder('rolTurno')
      .leftJoin(TurnoOrmEntity, 'turno', 'turno.id = rolTurno.id_turno')
      .leftJoin(
        IncidenciaPersonalOrmEntity,
        'incidenciaPersonal',
        'incidenciaPersonal.id = rolTurno.id_incidencia_personal',
      )
      .select([
        'rolTurno.id AS rol_turno_id',
        'rolTurno.secuencia_dia AS rol_turno_secuencia_dia',
        'rolTurno.id_turno AS rol_turno_id_turno',
        'rolTurno.id_incidencia_personal AS rol_turno_id_incidencia_personal',
        'rolTurno.horas_programadas AS rol_turno_horas_programadas',
        'turno.codigo AS turno_codigo',
        'turno.nombre AS turno_nombre',
        'turno.hora_inicio AS turno_hora_inicio',
        'turno.hora_fin AS turno_hora_fin',
        'turno.cruza_medianoche AS turno_cruza_medianoche',
        'incidenciaPersonal.codigo AS incidencia_personal_codigo',
        'incidenciaPersonal.nombre AS incidencia_personal_nombre',
      ])
      .where('rolTurno.id = :idRolTurno', { idRolTurno })
      .getRawOne<CeldaMatrizPersistidaRow | undefined>();

    if (!row) {
      throw errorAlConfirmarGuardado(
        'rolTurno',
        idRolTurno,
        TypeOrmRolTurnoRepository.name,
      );
    }

    return {
      idRolTurno: Number(row.rol_turno_id),
      secuenciaDia: Number(row.rol_turno_secuencia_dia),
      idTurno:
        row.rol_turno_id_turno === null ? null : Number(row.rol_turno_id_turno),
      codigoTurno: row.turno_codigo,
      nombreTurno: row.turno_nombre,
      horaInicio: row.turno_hora_inicio,
      horaFin: row.turno_hora_fin,
      cruzaMedianoche:
        row.turno_cruza_medianoche === null
          ? null
          : Boolean(row.turno_cruza_medianoche),
      idIncidenciaPersonal:
        row.rol_turno_id_incidencia_personal === null
          ? null
          : Number(row.rol_turno_id_incidencia_personal),
      codigoIncidenciaPersonal: row.incidencia_personal_codigo,
      nombreIncidenciaPersonal: row.incidencia_personal_nombre,
      horasProgramadas: Number(row.rol_turno_horas_programadas),
    };
  }

  private async fetchTramosPorTurnos(
    idTurnos: number[],
  ): Promise<Map<number, TurnoTramo[]>> {
    if (idTurnos.length === 0) {
      return new Map();
    }

    const placeholders = idTurnos.map((_, i) => `@${i}`).join(', ');
    const rows = await this.dataSource.query<
      Array<{
        id: number | string;
        id_turno: number | string;
        orden: number | string;
        hora_inicio: string;
        hora_fin: string;
        duracion_horas: number | string;
        cruza_medianoche: boolean | number;
        activo: boolean | number;
      }>
    >(
      `SELECT id, id_turno, orden, hora_inicio, hora_fin, duracion_horas, cruza_medianoche, activo
       FROM dbo.turno_tramo
       WHERE id_turno IN (${placeholders}) AND activo = 1
       ORDER BY id_turno ASC, orden ASC`,
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

  private createDetailQuery() {
    return (
      this.dataSource
        .getRepository(RolTurnoOrmEntity)
        .createQueryBuilder('rolTurno')
        .innerJoin(
          CalendarioOrmEntity,
          'calendario',
          'calendario.id = rolTurno.id_calendario',
        )
        .innerJoin(
          AsignacionPersonalOrmEntity,
          'asignacionPersonal',
          'asignacionPersonal.id = rolTurno.id_asignacion_personal',
        )
        .innerJoin(
          PersonalOrmEntity,
          'personal',
          'personal.id = asignacionPersonal.id_personal',
        )
        .leftJoin(
          NivelCargoOrmEntity,
          'nivelCargo',
          'nivelCargo.id = personal.id_nivel_cargo',
        )
        .leftJoin(
          'rol_funcional',
          'rolFuncional',
          'rolFuncional.id = asignacionPersonal.id_rol_funcional',
        )
        .leftJoin(
          ServicioOrmEntity,
          'servicio',
          'servicio.id = asignacionPersonal.id_servicio',
        )
        .leftJoin(
          'tipo_contrato',
          'tipoContrato',
          'tipoContrato.id = asignacionPersonal.id_tipo_contrato',
        )
        .leftJoin(
          'carga_horaria',
          'cargaHoraria',
          'cargaHoraria.id = asignacionPersonal.id_carga_horaria',
        )
        .leftJoin(TurnoOrmEntity, 'turno', 'turno.id = rolTurno.id_turno')
        .leftJoin(
          IncidenciaPersonalOrmEntity,
          'incidenciaPersonal',
          'incidenciaPersonal.id = rolTurno.id_incidencia_personal',
        )
        // observacion_mensual es la misma para las hasta 31 filas de rol_turno de una
        // persona en el mes: en vez de una subconsulta correlacionada MAX(om2.id)
        // reevaluada por cada fila, se resuelve una sola vez con un GROUP BY y se
        // une por id (ver docs/rendimiento/analisis-lentitud-matriz-mensual.md).
        .leftJoin(
          (subQuery) =>
            subQuery
              .select('om.id_planificacion', 'id_planificacion')
              .addSelect('om.id_asignacion_personal', 'id_asignacion_personal')
              .addSelect('MAX(om.id)', 'max_id')
              .from('observacion_mensual', 'om')
              .groupBy('om.id_planificacion')
              .addGroupBy('om.id_asignacion_personal'),
          'ultimaObservacionMensual',
          `ultimaObservacionMensual.id_planificacion = rolTurno.id_planificacion
         AND ultimaObservacionMensual.id_asignacion_personal = rolTurno.id_asignacion_personal`,
        )
        .leftJoin(
          'observacion_mensual',
          'observacionMensual',
          'observacionMensual.id = ultimaObservacionMensual.max_id',
        )
        .select([
          'rolTurno.id AS rol_turno_id',
          'rolTurno.id_planificacion AS rol_turno_id_planificacion',
          'rolTurno.id_asignacion_personal AS rol_turno_id_asignacion_personal',
          'rolTurno.id_calendario AS rol_turno_id_calendario',
          'rolTurno.secuencia_dia AS rol_turno_secuencia_dia',
          'rolTurno.id_turno AS rol_turno_id_turno',
          'rolTurno.id_incidencia_personal AS rol_turno_id_incidencia_personal',
          'rolTurno.horas_programadas AS rol_turno_horas_programadas',
          'rolTurno.origen_registro AS rol_turno_origen_registro',
          'calendario.fecha AS calendario_fecha',
          'calendario.dia_mes AS calendario_dia_mes',
          'calendario.dia_semana_nombre AS calendario_dia_semana_nombre',
          'turno.codigo AS turno_codigo',
          'turno.nombre AS turno_nombre',
          'turno.tipo_horario AS turno_tipo_horario',
          'turno.hora_inicio AS turno_hora_inicio',
          'turno.hora_fin AS turno_hora_fin',
          'turno.cruza_medianoche AS turno_cruza_medianoche',
          'incidenciaPersonal.codigo AS incidencia_personal_codigo',
          'incidenciaPersonal.nombre AS incidencia_personal_nombre',
          'personal.id AS personal_id',
          'personal.codigo_personal AS personal_codigo_personal',
          'personal.documento_identidad AS personal_documento_identidad',
          'personal.nombres AS personal_nombres',
          'personal.apellido_paterno AS personal_apellido_paterno',
          'personal.apellido_materno AS personal_apellido_materno',
          'asignacionPersonal.nro_item AS asignacion_personal_nro_item',
          'asignacionPersonal.id_carga_horaria AS asignacion_personal_id_carga_horaria',
          'asignacionPersonal.codigo_fuente_item AS asignacion_personal_codigo_fuente_item',
          'cargaHoraria.codigo AS carga_horaria_codigo',
          'cargaHoraria.nombre AS carga_horaria_nombre',
          'cargaHoraria.horas_dia_base AS carga_horaria_horas_dia_base',
          'tipoContrato.id AS tipo_contrato_id',
          'tipoContrato.codigo AS tipo_contrato_codigo',
          'tipoContrato.nombre AS tipo_contrato_nombre',
          'nivelCargo.codigo AS nivel_cargo_codigo',
          'nivelCargo.nombre AS nivel_cargo_nombre',
          'rolFuncional.codigo AS rol_funcional_codigo',
          'rolFuncional.nombre AS rol_funcional_nombre',
          'rolFuncional.es_jefatura AS rol_funcional_es_jefatura',
          'servicio.codigo AS servicio_codigo',
          'servicio.nombre AS servicio_nombre',
          'observacionMensual.descripcion AS observacion_mensual_descripcion',
        ])
    );
  }
}

interface RolTurnoRow {
  rol_turno_id: number | string;
  rol_turno_id_planificacion: number | string;
  rol_turno_id_asignacion_personal: number | string;
  rol_turno_id_calendario: number | string;
  rol_turno_secuencia_dia: number | string;
  rol_turno_id_turno: number | string | null;
  rol_turno_id_incidencia_personal: number | string | null;
  rol_turno_horas_programadas: number | string;
  rol_turno_origen_registro: 'MANUAL' | 'PLANTILLA' | 'AJUSTE' | 'CAMBIO';
  calendario_fecha: Date;
  calendario_dia_mes: number | string;
  calendario_dia_semana_nombre: string;
  turno_codigo: string | null;
  turno_nombre: string | null;
  turno_tipo_horario: string | null;
  turno_hora_inicio: string | null;
  turno_hora_fin: string | null;
  turno_cruza_medianoche: boolean | number | null;
  incidencia_personal_codigo: string | null;
  incidencia_personal_nombre: string | null;
  personal_id: number | string;
  personal_codigo_personal: string | null;
  personal_documento_identidad: string | null;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  nivel_cargo_codigo: string | null;
  asignacion_personal_nro_item: string | null;
  asignacion_personal_id_carga_horaria: number | string | null;
  asignacion_personal_codigo_fuente_item: string | null;
  carga_horaria_codigo: string | null;
  carga_horaria_nombre: string | null;
  carga_horaria_horas_dia_base: number | string | null;
  tipo_contrato_id: number | string | null;
  tipo_contrato_codigo: string | null;
  tipo_contrato_nombre: string | null;
  nivel_cargo_nombre: string | null;
  rol_funcional_codigo: string | null;
  rol_funcional_nombre: string | null;
  rol_funcional_es_jefatura: boolean | number | null;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  observacion_mensual_descripcion: string | null;
}

interface ResumenPersonalRow {
  rol_turno_id_asignacion_personal: number | string;
  personal_id: number | string;
  personal_codigo_personal: string | null;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  asignacion_personal_id_servicio: number | string | null;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  total_registros: number | string;
  total_turnos: number | string;
  total_incidencias_personales: number | string;
  total_dias_programados: number | string;
  total_horas_programadas: number | string;
  primera_fecha: Date | null;
  ultima_fecha: Date | null;
}

interface ResumenCalendarioRow {
  calendario_id: number | string;
  calendario_fecha: Date;
  calendario_anio: number | string;
  calendario_mes: number | string;
  calendario_dia_mes: number | string;
  calendario_dia_semana_nombre: string;
  calendario_es_fin_semana: boolean | number;
  feriado_id: number | string | null;
  feriado_nombre: string | null;
  tipo_feriado_codigo: string | null;
  total_registros: number | string;
  total_turnos: number | string;
  total_incidencias_personales: number | string;
  total_personas_programadas: number | string;
  total_horas_programadas: number | string;
}

interface TurnoValidacionRow {
  turno_id: number | string;
  turno_id_servicio: number | string;
  turno_codigo: string;
  turno_nombre: string;
  turno_hora_inicio: string;
  turno_hora_fin: string;
  turno_cruza_medianoche: boolean | number;
  turno_duracion_horas: number | string;
  turno_activo: boolean | number;
}

interface RegistroCeldaMatrizRapidaRow {
  id: number | string;
  secuencia_dia: number | string;
  id_turno: number | string | null;
  id_incidencia_personal: number | string | null;
  horas_programadas: number | string;
}

interface CeldaMatrizPersistidaRow {
  rol_turno_id: number | string;
  rol_turno_secuencia_dia: number | string;
  rol_turno_id_turno: number | string | null;
  rol_turno_id_incidencia_personal: number | string | null;
  rol_turno_horas_programadas: number | string;
  turno_codigo: string | null;
  turno_nombre: string | null;
  turno_hora_inicio: string | null;
  turno_hora_fin: string | null;
  turno_cruza_medianoche: boolean | number | null;
  incidencia_personal_codigo: string | null;
  incidencia_personal_nombre: string | null;
}

interface IncidenciaPersonalValidacionRow {
  incidencia_personal_id: number | string;
  incidencia_personal_codigo: string;
  incidencia_personal_nombre: string;
  incidencia_personal_alcance: string;
  incidencia_personal_activo: boolean | number;
}

interface AsignacionDisponibleRow {
  asignacion_personal_id: number | string;
  asignacion_personal_es_principal: boolean | number;
  asignacion_personal_nro_item: string | null;
  asignacion_personal_id_carga_horaria: number | string | null;
  asignacion_personal_codigo_fuente_item: string | null;
  personal_id: number | string;
  personal_codigo_personal: string | null;
  personal_documento_identidad: string | null;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  nivel_cargo_codigo: string | null;
  nivel_cargo_nombre: string | null;
  rol_funcional_codigo: string | null;
  rol_funcional_nombre: string | null;
  rol_funcional_es_jefatura: boolean | number | null;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  tipo_contrato_id: number | string | null;
  tipo_contrato_codigo: string | null;
  tipo_contrato_nombre: string | null;
  carga_horaria_codigo: string | null;
  carga_horaria_nombre: string | null;
  carga_horaria_horas_dia_base: number | string | null;
  nivel_cargo_orden_visual: number | string | null;
}

function mapRolTurnoRow(row: RolTurnoRow): RolTurnoPlanificacion {
  return {
    id: Number(row.rol_turno_id),
    idPlanificacion: Number(row.rol_turno_id_planificacion),
    idAsignacionPersonal: Number(row.rol_turno_id_asignacion_personal),
    idCalendario: Number(row.rol_turno_id_calendario),
    fecha: new Date(row.calendario_fecha),
    diaMes: Number(row.calendario_dia_mes),
    diaSemanaNombre: row.calendario_dia_semana_nombre,
    secuenciaDia: Number(row.rol_turno_secuencia_dia),
    idTurno:
      row.rol_turno_id_turno === null ? null : Number(row.rol_turno_id_turno),
    codigoTurno: row.turno_codigo,
    nombreTurno: row.turno_nombre,
    tipoHorario:
      row.turno_tipo_horario === 'DISCONTINUO' ? 'DISCONTINUO' : 'CONTINUO',
    horaInicio: row.turno_hora_inicio,
    horaFin: row.turno_hora_fin,
    cruzaMedianoche:
      row.turno_cruza_medianoche === null
        ? null
        : Boolean(row.turno_cruza_medianoche),
    idIncidenciaPersonal:
      row.rol_turno_id_incidencia_personal === null
        ? null
        : Number(row.rol_turno_id_incidencia_personal),
    codigoIncidenciaPersonal: row.incidencia_personal_codigo,
    nombreIncidenciaPersonal: row.incidencia_personal_nombre,
    horasProgramadas: Number(row.rol_turno_horas_programadas),
    origenRegistro: row.rol_turno_origen_registro,
    idPersonal: Number(row.personal_id),
    codigoPersonal: row.personal_codigo_personal,
    nroItem: row.asignacion_personal_nro_item,
    idCargaHoraria:
      row.asignacion_personal_id_carga_horaria === null
        ? null
        : Number(row.asignacion_personal_id_carga_horaria),
    codigoCargaHoraria: row.carga_horaria_codigo,
    nombreCargaHoraria: row.carga_horaria_nombre,
    horasDiaBase:
      row.carga_horaria_horas_dia_base === null
        ? null
        : Number(row.carga_horaria_horas_dia_base),
    ci: row.personal_documento_identidad,
    idTipoContrato:
      row.tipo_contrato_id === null ? null : Number(row.tipo_contrato_id),
    codigoTipoContrato: row.tipo_contrato_codigo,
    nombreTipoContrato: row.tipo_contrato_nombre,
    codigoFuenteItem: row.asignacion_personal_codigo_fuente_item,
    apellidoPaterno: row.personal_apellido_paterno,
    apellidoMaterno: row.personal_apellido_materno,
    nombres: row.personal_nombres,
    nombreCompleto: buildNombreCompleto(
      row.personal_nombres,
      row.personal_apellido_paterno,
      row.personal_apellido_materno,
    ),
    cargoActual: normalizeCargoNombre(
      row.nivel_cargo_codigo,
      row.nivel_cargo_nombre,
    ),
    rolFuncionalCodigo: row.rol_funcional_codigo,
    rolFuncionalNombre: row.rol_funcional_nombre,
    esJefatura:
      row.rol_funcional_es_jefatura === null
        ? false
        : Boolean(row.rol_funcional_es_jefatura),
    servicioCodigo: row.servicio_codigo,
    servicioNombre: row.servicio_nombre,
    observacionMensual: row.observacion_mensual_descripcion,
  };
}

function buildNombreCompleto(
  nombres: string,
  apellidoPaterno: string,
  apellidoMaterno: string | null,
): string {
  return [nombres, apellidoPaterno, apellidoMaterno]
    .filter((fragment): fragment is string => Boolean(fragment))
    .join(' ');
}

export function normalizeCargoNombre(
  codigo: string | null,
  nombre: string | null,
): string | null {
  if (!codigo) {
    return nombre;
  }

  switch (codigo) {
    case 'ENF-JS':
    case 'ENF-JD':
      return 'Lic. Enfermeria';
    case 'MED-JS':
    case 'MED-JD':
      return 'Medico';
    case 'ADM-JD':
      return 'Analista administrativo';
    default:
      return nombre;
  }
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildRolTurnoConflictKey(
  idAsignacionPersonal: number,
  idCalendario: number,
  secuenciaDia: number,
): string {
  return `${idAsignacionPersonal}:${idCalendario}:${secuenciaDia}`;
}
