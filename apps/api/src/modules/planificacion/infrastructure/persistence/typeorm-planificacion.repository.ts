import { Inject, Injectable } from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { getPaginatedRawMany } from '../../../../infrastructure/persistence/query/paginated-raw-query';
import { DepartamentoOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/departamento.orm-entity';
import { ServicioOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/servicio.orm-entity';
import { AsignacionPersonalOrmEntity } from '../../../personal/infrastructure/persistence/entities/asignacion-personal.orm-entity';
import { UsuarioOrmEntity } from '../../../seguridad/infrastructure/persistence/entities/usuario.orm-entity';
import { Planificacion } from '../../domain/entities/planificacion';
import {
  ListarPlanificacionesFiltro,
  PlanificacionRepository,
} from '../../domain/repositories/planificacion.repository';
import { buildMonthlyUtcPeriod } from '../../application/helpers/monthly-period';
import { PlanificacionOrmEntity } from './entities/planificacion.orm-entity';
import { errorAlConfirmarGuardado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class TypeOrmPlanificacionRepository implements PlanificacionRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(filtro: ListarPlanificacionesFiltro): Promise<Planificacion[]> {
    const queryBuilder = this.aplicarFiltros(this.createBaseQuery(), filtro);

    const rows = await getPaginatedRawMany<PlanificacionRow>(
      this.dataSource,
      queryBuilder
        .orderBy('planificacion.anio', 'DESC')
        .addOrderBy('planificacion.mes', 'DESC')
        .addOrderBy('servicio.nombre', 'ASC')
        .addOrderBy('planificacion.version', 'DESC'),
      filtro,
      'base_query.planificacion_anio DESC, base_query.planificacion_mes DESC, base_query.servicio_nombre ASC, base_query.planificacion_version DESC',
    );

    return rows.map(mapPlanificacionRow);
  }

  async contar(filtro: ListarPlanificacionesFiltro): Promise<number> {
    return this.aplicarFiltros(this.createBaseQuery(), filtro).getCount();
  }

  private aplicarFiltros(
    queryBuilder: SelectQueryBuilder<PlanificacionOrmEntity>,
    filtro: ListarPlanificacionesFiltro,
  ): SelectQueryBuilder<PlanificacionOrmEntity> {
    if (filtro.idServicio) {
      queryBuilder.andWhere('planificacion.id_servicio = :idServicio', {
        idServicio: filtro.idServicio,
      });
    }

    if (filtro.idDepartamento) {
      queryBuilder.andWhere(
        '(servicio.id_departamento = :idDepartamento OR planificacion.id_departamento = :idDepartamento)',
        { idDepartamento: filtro.idDepartamento },
      );
    }

    if (filtro.idPersonal) {
      this.aplicarFiltroParticipacionPersonal(queryBuilder, filtro.idPersonal);
    }

    if (filtro.anio) {
      queryBuilder.andWhere('planificacion.anio = :anio', {
        anio: filtro.anio,
      });
    }

    if (filtro.mes) {
      queryBuilder.andWhere('planificacion.mes = :mes', { mes: filtro.mes });
    }

    if (filtro.periodosPermitidos?.length) {
      const params: Record<string, number> = {};
      const clauses = filtro.periodosPermitidos.map((periodo, index) => {
        params[`anioPermitido${index}`] = periodo.anio;
        params[`mesPermitido${index}`] = periodo.mes;
        return `(planificacion.anio = :anioPermitido${index} AND planificacion.mes = :mesPermitido${index})`;
      });
      queryBuilder.andWhere(`(${clauses.join(' OR ')})`, params);
    }

    if (filtro.estado) {
      queryBuilder.andWhere('planificacion.estado = :estado', {
        estado: filtro.estado,
      });
    }

    queryBuilder.andWhere('planificacion.activo = :activo', { activo: true });

    return queryBuilder;
  }

  async obtenerPorId(id: number): Promise<Planificacion | null> {
    const row = await this.createBaseQuery()
      .andWhere('planificacion.activo = :activo', { activo: true })
      .andWhere('planificacion.id = :id', { id })
      .getRawOne<PlanificacionRow | undefined>();

    return row ? mapPlanificacionRow(row) : null;
  }

  async obtenerNombreServicio(idServicio: number): Promise<string | null> {
    const row = await this.dataSource
      .getRepository(ServicioOrmEntity)
      .createQueryBuilder('servicio')
      .select('servicio.nombre', 'nombre')
      .where('servicio.id = :idServicio', { idServicio })
      .getRawOne<{ nombre: string }>();

    return row?.nombre ?? null;
  }

  async obtenerNombreDepartamento(
    idDepartamento: number,
  ): Promise<string | null> {
    const row = await this.dataSource
      .getRepository(DepartamentoOrmEntity)
      .createQueryBuilder('departamento')
      .select('departamento.nombre', 'nombre')
      .where('departamento.id = :idDepartamento', { idDepartamento })
      .getRawOne<{ nombre: string }>();

    return row?.nombre ?? null;
  }

  async existePersonalActivoEnServicio(idServicio: number): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('ap')
      .where('ap.id_servicio = :idServicio', { idServicio })
      .andWhere('ap.activo = :activo', { activo: true })
      .getCount();

    return count > 0;
  }

  async existePersonalActivoEnDepartamento(
    idDepartamento: number,
  ): Promise<boolean> {
    // Solo personal asignado directamente al departamento (sin servicio asignado).
    const count = await this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('ap')
      .where('ap.id_departamento = :idDepartamento', { idDepartamento })
      .andWhere('ap.id_servicio IS NULL')
      .andWhere('ap.activo = :activo', { activo: true })
      .getCount();

    return count > 0;
  }

  async existeUsuario(idUsuario: number): Promise<boolean> {
    const count = await this.dataSource
      .getRepository(UsuarioOrmEntity)
      .createQueryBuilder('usuario')
      .where('usuario.id = :idUsuario', { idUsuario })
      .getCount();

    return count > 0;
  }

  async obtenerSiguienteVersion(
    idServicio: number | null,
    idDepartamento: number | null,
    anio: number,
    mes: number,
  ): Promise<number> {
    const qb = this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder('planificacion')
      .select('MAX(planificacion.version)', 'max_version')
      .where('planificacion.anio = :anio', { anio })
      .andWhere('planificacion.mes = :mes', { mes });

    if (idServicio !== null) {
      qb.andWhere('planificacion.id_servicio = :idServicio', { idServicio });
    } else {
      qb.andWhere('planificacion.id_departamento = :idDepartamento', {
        idDepartamento,
      }).andWhere('planificacion.id_servicio IS NULL');
    }

    const row = await qb.getRawOne<{ max_version: number | string | null }>();

    return row?.max_version ? Number(row.max_version) + 1 : 1;
  }

  async existePlanificacionActivaPeriodo(input: {
    idServicio: number | null;
    idDepartamento: number | null;
    anio: number;
    mes: number;
    excluirIdPlanificacion?: number;
  }): Promise<boolean> {
    const qb = this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder('planificacion')
      .where('planificacion.anio = :anio', { anio: input.anio })
      .andWhere('planificacion.mes = :mes', { mes: input.mes })
      .andWhere('planificacion.activo = :activo', { activo: true });

    if (input.idServicio !== null) {
      qb.andWhere('planificacion.id_servicio = :idServicio', {
        idServicio: input.idServicio,
      });
    } else {
      qb.andWhere('planificacion.id_departamento = :idDepartamento', {
        idDepartamento: input.idDepartamento,
      }).andWhere('planificacion.id_servicio IS NULL');
    }

    if (input.excluirIdPlanificacion) {
      qb.andWhere('planificacion.id <> :excluirIdPlanificacion', {
        excluirIdPlanificacion: input.excluirIdPlanificacion,
      });
    }

    return (await qb.getCount()) > 0;
  }

  async crearBorrador(input: {
    idServicio: number | null;
    idDepartamento: number | null;
    anio: number;
    mes: number;
    version: number;
    fechaInicio: Date;
    fechaFin: Date;
    idUsuarioCreador: number;
  }): Promise<Planificacion> {
    const insertResult = await this.dataSource
      .createQueryBuilder()
      .insert()
      .into(PlanificacionOrmEntity)
      .values({
        idServicio: input.idServicio,
        idDepartamento: input.idDepartamento,
        anio: input.anio,
        mes: input.mes,
        version: input.version,
        estado: 'BORRADOR',
        activo: true,
        fechaInicio: input.fechaInicio,
        fechaFin: input.fechaFin,
        idUsuarioCreador: input.idUsuarioCreador,
        idUsuarioPublicador: null,
        fechaPublicacion: null,
        idUsuarioCierre: null,
        fechaCierre: null,
      })
      .execute();

    const identifier = insertResult.identifiers[0];
    const id =
      identifier && 'id' in identifier ? Number(identifier.id as number) : null;

    if (!id) {
      throw new Error('No se pudo resolver el id de la planificacion creada.');
    }

    const planificacion = await this.obtenerPorId(id);

    if (!planificacion) {
      throw errorAlConfirmarGuardado(
        'planificacion',
        id,
        TypeOrmPlanificacionRepository.name,
      );
    }

    return planificacion;
  }

  async cambiarEstado(
    idPlanificacion: number,
    estado: 'BORRADOR' | 'REVISION' | 'APROBADA' | 'CERRADA',
    idUsuarioOperacion: number,
  ): Promise<Planificacion> {
    const partial: Partial<PlanificacionOrmEntity> = {
      estado,
      updatedAt: new Date(),
    };

    if (estado === 'APROBADA') {
      partial.idUsuarioPublicador = idUsuarioOperacion;
      partial.fechaPublicacion = new Date();
    }

    if (estado === 'CERRADA') {
      partial.idUsuarioCierre = idUsuarioOperacion;
      partial.fechaCierre = new Date();
    }

    await this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder()
      .update(PlanificacionOrmEntity)
      .set(partial)
      .where('id = :idPlanificacion', { idPlanificacion })
      .execute();

    const planificacion = await this.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw errorAlConfirmarGuardado(
        'planificacion',
        idPlanificacion,
        TypeOrmPlanificacionRepository.name,
      );
    }

    return planificacion;
  }

  async eliminarLogico(idPlanificacion: number): Promise<void> {
    await this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder()
      .update(PlanificacionOrmEntity)
      .set({
        activo: false,
        updatedAt: new Date(),
      })
      .where('id = :idPlanificacion', { idPlanificacion })
      .execute();
  }

  async publicar(
    idPlanificacion: number,
    idUsuarioPublicador: number,
  ): Promise<Planificacion> {
    await this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder()
      .update(PlanificacionOrmEntity)
      .set({
        estado: 'APROBADA',
        idUsuarioPublicador,
        fechaPublicacion: new Date(),
        updatedAt: new Date(),
      })
      .where('id = :idPlanificacion', { idPlanificacion })
      .execute();

    const planificacion = await this.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw errorAlConfirmarGuardado(
        'planificacion',
        idPlanificacion,
        TypeOrmPlanificacionRepository.name,
      );
    }

    return planificacion;
  }

  async cerrar(
    idPlanificacion: number,
    idUsuarioCierre: number,
  ): Promise<Planificacion> {
    await this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder()
      .update(PlanificacionOrmEntity)
      .set({
        estado: 'CERRADA',
        idUsuarioCierre,
        fechaCierre: new Date(),
        updatedAt: new Date(),
      })
      .where('id = :idPlanificacion', { idPlanificacion })
      .execute();

    const planificacion = await this.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw errorAlConfirmarGuardado(
        'planificacion',
        idPlanificacion,
        TypeOrmPlanificacionRepository.name,
      );
    }

    return planificacion;
  }

  /**
   * Filtra planificaciones donde el personal tiene turnos registrados, ya sea
   * en `rol_turno` (planificaciones abiertas) o en `rol_turno_historial`
   * (planificaciones ya cerradas). `asignacion_personal` no tiene relacion
   * directa con `planificacion` (es un registro de vigencia, no de periodo),
   * por lo que el vinculo real solo existe a traves de estas dos tablas.
   */
  private aplicarFiltroParticipacionPersonal(
    queryBuilder: SelectQueryBuilder<PlanificacionOrmEntity>,
    idPersonal: number,
  ): void {
    queryBuilder.andWhere(
      `(
        EXISTS (
          SELECT 1 FROM dbo.rol_turno rt
          INNER JOIN dbo.asignacion_personal ap ON ap.id = rt.id_asignacion_personal
          WHERE rt.id_planificacion = planificacion.id AND ap.id_personal = :idPersonal
        )
        OR EXISTS (
          SELECT 1 FROM dbo.rol_turno_historial rth
          INNER JOIN dbo.planificacion_historial ph ON ph.id = rth.id_planificacion_historial
          INNER JOIN dbo.asignacion_personal ap2 ON ap2.id = rth.id_asignacion_personal
          WHERE ph.id_planificacion = planificacion.id AND ap2.id_personal = :idPersonal
        )
      )`,
      { idPersonal },
    );
  }

  private createBaseQuery() {
    return this.dataSource
      .getRepository(PlanificacionOrmEntity)
      .createQueryBuilder('planificacion')
      .leftJoin(
        ServicioOrmEntity,
        'servicio',
        'servicio.id = planificacion.id_servicio',
      )
      .leftJoin(
        DepartamentoOrmEntity,
        'departamento',
        'departamento.id = COALESCE(planificacion.id_departamento, servicio.id_departamento)',
      )
      .select([
        'planificacion.id AS planificacion_id',
        'planificacion.id_servicio AS planificacion_id_servicio',
        'planificacion.id_departamento AS planificacion_id_departamento',
        'planificacion.anio AS planificacion_anio',
        'planificacion.mes AS planificacion_mes',
        'planificacion.version AS planificacion_version',
        'planificacion.estado AS planificacion_estado',
        'planificacion.activo AS planificacion_activo',
        'planificacion.fecha_inicio AS planificacion_fecha_inicio',
        'planificacion.fecha_fin AS planificacion_fecha_fin',
        'planificacion.fecha_publicacion AS planificacion_fecha_publicacion',
        'planificacion.fecha_cierre AS planificacion_fecha_cierre',
        'planificacion.created_at AS planificacion_created_at',
        'planificacion.updated_at AS planificacion_updated_at',
        'servicio.id_departamento AS servicio_id_departamento',
        'departamento.codigo AS departamento_codigo',
        'departamento.nombre AS departamento_nombre',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        `CASE
          WHEN planificacion.id_servicio IS NOT NULL THEN
            (SELECT COUNT(1)
             FROM dbo.asignacion_personal ap
             INNER JOIN dbo.personal p ON p.id = ap.id_personal
             LEFT JOIN dbo.rol_funcional rf ON rf.id = ap.id_rol_funcional
             WHERE ap.id_servicio = planificacion.id_servicio
               AND ap.activo = 1
               AND p.activo = 1
               AND (rf.codigo IS NULL OR rf.codigo <> 'JEFE_DEPARTAMENTO'))
          ELSE
            (SELECT COUNT(1)
             FROM dbo.asignacion_personal ap
             INNER JOIN dbo.personal p ON p.id = ap.id_personal
             WHERE ap.id_departamento = planificacion.id_departamento
               AND ap.id_servicio IS NULL
               AND ap.activo = 1
               AND p.activo = 1)
         END AS servicio_total_personal_planificable`,
      ]);
  }
}

interface PlanificacionRow {
  planificacion_id: number | string;
  planificacion_id_servicio: number | string | null;
  planificacion_id_departamento: number | string | null;
  servicio_id_departamento: number | string | null;
  departamento_codigo: string | null;
  departamento_nombre: string | null;
  planificacion_anio: number;
  planificacion_mes: number;
  planificacion_version: number;
  planificacion_estado: 'BORRADOR' | 'REVISION' | 'APROBADA' | 'CERRADA';
  planificacion_activo: boolean | number;
  planificacion_fecha_inicio: Date;
  planificacion_fecha_fin: Date;
  planificacion_fecha_publicacion: Date | null;
  planificacion_fecha_cierre: Date | null;
  planificacion_created_at: Date;
  planificacion_updated_at: Date;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  servicio_total_personal_planificable: number | string;
}

function mapPlanificacionRow(row: PlanificacionRow): Planificacion {
  const anio = Number(row.planificacion_anio);
  const mes = Number(row.planificacion_mes);

  return {
    id: Number(row.planificacion_id),
    idServicio:
      row.planificacion_id_servicio === null ||
      row.planificacion_id_servicio === undefined
        ? null
        : Number(row.planificacion_id_servicio),
    idDepartamento:
      row.planificacion_id_departamento !== null &&
      row.planificacion_id_departamento !== undefined
        ? Number(row.planificacion_id_departamento)
        : row.servicio_id_departamento !== null &&
            row.servicio_id_departamento !== undefined
          ? Number(row.servicio_id_departamento)
          : null,
    codigoDepartamento: row.departamento_codigo,
    nombreDepartamento: row.departamento_nombre,
    codigoServicio: row.servicio_codigo,
    nombreServicio: row.servicio_nombre,
    cantidadPersonalPlanificable: Number(
      row.servicio_total_personal_planificable,
    ),
    anio,
    mes,
    version: Number(row.planificacion_version),
    estado: row.planificacion_estado,
    activo: Boolean(row.planificacion_activo),
    // Rebuild the monthly period from anio/mes to avoid timezone drift
    // from SQL datetime values when the server/client locale shifts dates.
    ...buildMonthlyUtcPeriod(anio, mes),
    fechaPublicacion: row.planificacion_fecha_publicacion
      ? new Date(row.planificacion_fecha_publicacion)
      : null,
    fechaCierre: row.planificacion_fecha_cierre
      ? new Date(row.planificacion_fecha_cierre)
      : null,
    createdAt: new Date(row.planificacion_created_at),
    updatedAt: new Date(row.planificacion_updated_at),
  };
}
