import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { Calendario } from '../../domain/entities/calendario';
import {
  CalendarioRepository,
  ListarCalendariosFiltro,
  ResultadoGeneracionCalendario,
} from '../../domain/repositories/calendario.repository';
import { CalendarioOrmEntity } from './entities/calendario.orm-entity';
import { FeriadoOrmEntity } from './entities/feriado.orm-entity';
import { TipoFeriadoOrmEntity } from './entities/tipo-feriado.orm-entity';

@Injectable()
export class TypeOrmCalendarioRepository implements CalendarioRepository {
  private static readonly DIA_SEMANA_NOMBRES = [
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado',
    'Domingo',
  ] as const;

  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(filtro: ListarCalendariosFiltro): Promise<Calendario[]> {
    const queryBuilder = this.baseSelectQuery();

    if (filtro.anio) {
      queryBuilder.andWhere('calendario.anio = :anio', { anio: filtro.anio });
    }

    if (filtro.mes) {
      queryBuilder.andWhere('calendario.mes = :mes', { mes: filtro.mes });
    }

    const rows = await queryBuilder
      .orderBy('calendario.fecha', 'ASC')
      .getRawMany<CalendarioRow>();

    return rows.map(this.mapCalendarioRow);
  }

  async obtenerPorId(id: number): Promise<Calendario | null> {
    const row = await this.baseSelectQuery()
      .where('calendario.id = :id', { id })
      .getRawOne<CalendarioRow>();

    return row ? this.mapCalendarioRow(row) : null;
  }

  async existeMes(anio: number, mes: number): Promise<boolean> {
    const repository = this.dataSource.getRepository(CalendarioOrmEntity);
    const totalDiasEsperados = new Date(Date.UTC(anio, mes, 0)).getUTCDate();

    const diasExistentes = await repository
      .createQueryBuilder('calendario')
      .where('calendario.anio = :anio', { anio })
      .andWhere('calendario.mes = :mes', { mes })
      .getCount();

    return diasExistentes >= totalDiasEsperados;
  }

  async asegurarAnio(anio: number): Promise<ResultadoGeneracionCalendario> {
    let totalDias = 0;
    let diasGenerados = 0;
    let diasExistentes = 0;

    for (let mes = 1; mes <= 12; mes += 1) {
      const resultadoMes = await this.asegurarMes(anio, mes);
      totalDias += resultadoMes.totalDias;
      diasGenerados += resultadoMes.diasGenerados;
      diasExistentes += resultadoMes.diasExistentes;
    }

    return {
      anio,
      totalDias,
      diasGenerados,
      diasExistentes,
    };
  }

  async asegurarMes(
    anio: number,
    mes: number,
  ): Promise<ResultadoGeneracionCalendario> {
    const repository = this.dataSource.getRepository(CalendarioOrmEntity);
    const totalDias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const fechasEsperadas = Array.from(
      { length: totalDias },
      (_, index) => new Date(Date.UTC(anio, mes - 1, index + 1, 0, 0, 0, 0)),
    );

    const existentes = await repository
      .createQueryBuilder('calendario')
      .select(['calendario.dia_mes AS diaMes'])
      .where('calendario.anio = :anio', { anio })
      .andWhere('calendario.mes = :mes', { mes })
      .getRawMany<{ diaMes: number | string }>();

    const fechasExistentes = new Set(
      existentes.map((row) => Number(row.diaMes)),
    );

    const pendientes = fechasEsperadas.filter(
      (fecha) => !fechasExistentes.has(fecha.getUTCDate()),
    );

    if (pendientes.length > 0) {
      for (const fecha of pendientes) {
        const diaSemanaNum = this.getIsoDayOfWeek(fecha);
        await this.dataSource.query(
          `
            INSERT INTO dbo.calendario (
              fecha,
              anio,
              mes,
              dia_mes,
              dia_semana_num,
              dia_semana_nombre,
              semana_mes,
              es_fin_semana
            )
            VALUES (
              @0,
              @1,
              @2,
              @3,
              @4,
              @5,
              @6,
              @7
            )
          `,
          [
            this.toSqlDateString(fecha),
            anio,
            mes,
            fecha.getUTCDate(),
            diaSemanaNum,
            TypeOrmCalendarioRepository.DIA_SEMANA_NOMBRES[diaSemanaNum - 1],
            Math.floor((fecha.getUTCDate() - 1) / 7) + 1,
            diaSemanaNum >= 6,
          ],
        );
      }
    }

    return {
      anio,
      mes,
      totalDias,
      diasGenerados: pendientes.length,
      diasExistentes: totalDias - pendientes.length,
    };
  }

  // "Es feriado" ya no es una columna propia de calendario: se resuelve por
  // join contra dbo.feriado (mismo patron que planificacion <-> calendario,
  // docs/database/decisiones-tecnicas.md seccion 58). Un feriado activo cuyo
  // rango cubre la fecha del dia determina codigo/nombre; si ninguno cubre la
  // fecha, el dia no es feriado.
  private baseSelectQuery() {
    return this.dataSource
      .getRepository(CalendarioOrmEntity)
      .createQueryBuilder('calendario')
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
        'calendario.dia_semana_num AS calendario_dia_semana_num',
        'calendario.dia_semana_nombre AS calendario_dia_semana_nombre',
        'calendario.semana_mes AS calendario_semana_mes',
        'calendario.es_fin_semana AS calendario_es_fin_semana',
        'feriado.id AS feriado_id',
        'feriado.nombre AS feriado_nombre',
        'tipoFeriado.codigo AS tipo_feriado_codigo',
      ]);
  }

  private mapCalendarioRow = (row: CalendarioRow): Calendario => {
    const esFeriado = row.feriado_id !== null && row.feriado_id !== undefined;

    return {
      id: Number(row.calendario_id),
      fecha: new Date(row.calendario_fecha),
      anio: Number(row.calendario_anio),
      mes: Number(row.calendario_mes),
      diaMes: Number(row.calendario_dia_mes),
      diaSemanaNum: Number(row.calendario_dia_semana_num),
      diaSemanaNombre: row.calendario_dia_semana_nombre,
      semanaMes:
        row.calendario_semana_mes === null
          ? null
          : Number(row.calendario_semana_mes),
      esFinSemana: row.calendario_es_fin_semana,
      esFeriado,
      codigoFeriado: esFeriado ? row.tipo_feriado_codigo : null,
      nombreFeriado: esFeriado ? row.feriado_nombre : null,
    };
  };

  private getIsoDayOfWeek(fecha: Date): number {
    const jsDay = fecha.getUTCDay();
    return jsDay === 0 ? 7 : jsDay;
  }

  private toIsoDateString(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
  }

  private toSqlDateString(fecha: Date): string {
    return this.toIsoDateString(fecha).replaceAll('-', '');
  }
}

type CalendarioRow = {
  calendario_id: number | string;
  calendario_fecha: Date;
  calendario_anio: number;
  calendario_mes: number;
  calendario_dia_mes: number;
  calendario_dia_semana_num: number;
  calendario_dia_semana_nombre: string;
  calendario_semana_mes: number | null;
  calendario_es_fin_semana: boolean;
  feriado_id: number | string | null;
  feriado_nombre: string | null;
  tipo_feriado_codigo: string | null;
};
