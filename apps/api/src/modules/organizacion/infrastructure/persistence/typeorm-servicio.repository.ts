import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { obtenerRestriccionUnicaViolada } from '../../../../infrastructure/persistence/typeorm/violacion-unica';
import type { GuardarServicioDto } from '../../application/dto/guardar-servicio.dto';
import { Turno } from '../../../operacion/domain/entities/turno';
import { TurnoOrmEntity } from '../../../operacion/infrastructure/persistence/entities/turno.orm-entity';
import { Servicio } from '../../domain/entities/servicio';
import { ServicioDetalle } from '../../domain/entities/servicio-detalle';
import {
  ListarServiciosFiltro,
  ServicioRepository,
} from '../../domain/repositories/servicio.repository';
import { DepartamentoOrmEntity } from './entities/departamento.orm-entity';
import { ServicioOrmEntity } from './entities/servicio.orm-entity';

@Injectable()
export class TypeOrmServicioRepository implements ServicioRepository {
  private readonly repository: Repository<ServicioOrmEntity>;

  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(ServicioOrmEntity);
  }

  async listar(filtro?: ListarServiciosFiltro): Promise<Servicio[]> {
    // Alcance empujado a la consulta (WHERE en el repositorio) en vez de
    // traer todos los servicios y filtrar el resultado en memoria — ver
    // docs/seguridad/estrategia-alcance-en-listados-y-consultas.md.
    if (
      (filtro?.idsDepartamentoPermitidos &&
        filtro.idsDepartamentoPermitidos.length === 0) ||
      (filtro?.idsServicioPermitidos &&
        filtro.idsServicioPermitidos.length === 0)
    ) {
      return [];
    }

    const queryBuilder = this.repository
      .createQueryBuilder('servicio')
      .leftJoin(
        DepartamentoOrmEntity,
        'departamento',
        'departamento.id = servicio.id_departamento',
      )
      .leftJoin(
        'asignacion_personal',
        'asignacion',
        'asignacion.id_servicio = servicio.id AND asignacion.activo = :asignacionActiva',
        { asignacionActiva: true },
      )
      .leftJoin(
        'personal',
        'personal',
        'personal.id = asignacion.id_personal AND personal.activo = :personalActivo',
        { personalActivo: true },
      )
      .select([
        'servicio.id AS servicio_id',
        'servicio.id_departamento AS servicio_id_departamento',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'servicio.descripcion AS servicio_descripcion',
        'servicio.tipo_servicio AS servicio_tipo_servicio',
        'servicio.activo AS servicio_activo',
        'departamento.codigo AS departamento_codigo',
        'departamento.nombre AS departamento_nombre',
        'COUNT(DISTINCT personal.id) AS servicio_cantidad_personal_activo',
      ]);

    if (filtro?.idDepartamento) {
      queryBuilder.andWhere('servicio.id_departamento = :idDepartamento', {
        idDepartamento: filtro.idDepartamento,
      });
    }

    if (filtro?.idsDepartamentoPermitidos) {
      queryBuilder.andWhere(
        'servicio.id_departamento IN (:...idsDepartamentoPermitidos)',
        { idsDepartamentoPermitidos: filtro.idsDepartamentoPermitidos },
      );
    }

    if (filtro?.idsServicioPermitidos) {
      queryBuilder.andWhere('servicio.id IN (:...idsServicioPermitidos)', {
        idsServicioPermitidos: filtro.idsServicioPermitidos,
      });
    }

    if (filtro?.soloActivos) {
      queryBuilder.andWhere('servicio.activo = :soloActivos', {
        soloActivos: true,
      });
    }

    const rows = await queryBuilder
      .groupBy('servicio.id')
      .addGroupBy('servicio.id_departamento')
      .addGroupBy('servicio.codigo')
      .addGroupBy('servicio.nombre')
      .addGroupBy('servicio.descripcion')
      .addGroupBy('servicio.tipo_servicio')
      .addGroupBy('servicio.activo')
      .addGroupBy('departamento.codigo')
      .addGroupBy('departamento.nombre')
      .orderBy('servicio.nombre', 'ASC')
      .getRawMany<{
        servicio_id: number | string;
        servicio_id_departamento: number | string;
        servicio_codigo: string;
        servicio_nombre: string;
        servicio_descripcion: string | null;
        servicio_tipo_servicio: string;
        servicio_cantidad_personal_activo: number | string | null;
        servicio_activo: boolean;
        departamento_codigo: string | null;
        departamento_nombre: string | null;
      }>();

    return rows.map((row) => ({
      id: Number(row.servicio_id),
      idDepartamento: Number(row.servicio_id_departamento),
      codigoDepartamento: row.departamento_codigo,
      nombreDepartamento: row.departamento_nombre,
      codigo: row.servicio_codigo,
      nombre: row.servicio_nombre,
      descripcion: row.servicio_descripcion,
      tipoServicio:
        row.servicio_tipo_servicio === 'UNIDAD' ? 'UNIDAD' : 'SERVICIO',
      cantidadPersonalActivo: Number(
        row.servicio_cantidad_personal_activo || 0,
      ),
      activo: row.servicio_activo,
    }));
  }

  async obtenerPorId(id: number): Promise<Servicio | null> {
    const rows = await this.listar();
    return rows.find((row) => row.id === id) ?? null;
  }

  async obtenerDetalle(id: number): Promise<ServicioDetalle | null> {
    const servicio = await this.obtenerPorId(id);

    if (!servicio) {
      return null;
    }

    const [jefaRow, personalCountRow, turnos] = await Promise.all([
      this.dataSource
        .getRepository(ServicioOrmEntity)
        .createQueryBuilder('servicio')
        .innerJoin(
          'asignacion_personal',
          'asignacion',
          'asignacion.id_servicio = servicio.id AND asignacion.activo = :activo',
          { activo: true },
        )
        .innerJoin(
          'rol_funcional',
          'rolFuncional',
          "rolFuncional.id = asignacion.id_rol_funcional AND rolFuncional.codigo = 'JEFE_SERVICIO'",
        )
        .innerJoin(
          'personal',
          'personal',
          'personal.id = asignacion.id_personal',
        )
        .select([
          'personal.id AS personal_id',
          'personal.codigo_personal AS personal_codigo_personal',
          'personal.nombres AS personal_nombres',
          'personal.apellido_paterno AS personal_apellido_paterno',
          'personal.apellido_materno AS personal_apellido_materno',
          'rolFuncional.codigo AS rol_funcional_codigo',
          'rolFuncional.nombre AS rol_funcional_nombre',
        ])
        .where('servicio.id = :id', { id })
        .orderBy('asignacion.es_principal', 'DESC')
        .addOrderBy('personal.apellido_paterno', 'ASC')
        .getRawOne<{
          personal_id: number | string;
          personal_codigo_personal: string | null;
          personal_nombres: string;
          personal_apellido_paterno: string;
          personal_apellido_materno: string | null;
          rol_funcional_codigo: string | null;
          rol_funcional_nombre: string | null;
        } | null>(),
      this.dataSource
        .getRepository(ServicioOrmEntity)
        .createQueryBuilder('servicio')
        .innerJoin(
          'asignacion_personal',
          'asignacion',
          'asignacion.id_servicio = servicio.id AND asignacion.activo = :activo',
          { activo: true },
        )
        .innerJoin(
          'personal',
          'personal',
          'personal.id = asignacion.id_personal AND personal.activo = :personalActivo',
          { personalActivo: true },
        )
        .select('COUNT(DISTINCT asignacion.id_personal)', 'cantidad')
        .where('servicio.id = :id', { id })
        .getRawOne<{ cantidad: number | string } | null>(),
      this.dataSource
        .getRepository(TurnoOrmEntity)
        .createQueryBuilder('turno')
        .leftJoin(
          ServicioOrmEntity,
          'servicio',
          'servicio.id = turno.id_servicio',
        )
        .select([
          'turno.id AS turno_id',
          'turno.id_servicio AS turno_id_servicio',
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
        ])
        .where('turno.id_servicio = :id', { id })
        .orderBy('turno.hora_inicio', 'ASC')
        .getRawMany<{
          turno_id: number | string;
          turno_id_servicio: number | string;
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
        }>(),
    ]);

    return {
      id: servicio.id,
      codigo: servicio.codigo,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      tipoServicio: servicio.tipoServicio,
      activo: servicio.activo,
      departamento: {
        id: servicio.idDepartamento,
        codigo: servicio.codigoDepartamento,
        nombre: servicio.nombreDepartamento,
      },
      cantidadPersonalActivo: personalCountRow
        ? Number(personalCountRow.cantidad)
        : 0,
      jefaServicio: jefaRow
        ? {
            idPersonal: Number(jefaRow.personal_id),
            codigoPersonal: jefaRow.personal_codigo_personal,
            nombreCompleto: [
              jefaRow.personal_nombres,
              jefaRow.personal_apellido_paterno,
              jefaRow.personal_apellido_materno,
            ]
              .filter((value) => Boolean(value))
              .join(' '),
            codigoRolFuncional: jefaRow.rol_funcional_codigo,
            nombreRolFuncional: jefaRow.rol_funcional_nombre,
          }
        : null,
      turnos: turnos.map(
        (row): Turno => ({
          id: Number(row.turno_id),
          idServicio: Number(row.turno_id_servicio),
          codigoServicio: row.servicio_codigo,
          nombreServicio: row.servicio_nombre,
          idDepartamento: null,
          codigoDepartamento: null,
          nombreDepartamento: null,
          codigo: row.turno_codigo,
          nombre: row.turno_nombre,
          codigoVisual: null,
          etiquetaVisual: null,
          tipoHorario:
            row.turno_tipo_horario === 'DISCONTINUO'
              ? 'DISCONTINUO'
              : 'CONTINUO',
          horaInicio: row.turno_hora_inicio,
          horaFin: row.turno_hora_fin,
          cruzaMedianoche: row.turno_cruza_medianoche,
          duracionHoras: Number(row.turno_duracion_horas),
          tramos: [],
          vigenciaDesde: new Date(row.turno_vigencia_desde),
          vigenciaHasta: row.turno_vigencia_hasta
            ? new Date(row.turno_vigencia_hasta)
            : null,
          activo: row.turno_activo,
        }),
      ),
    };
  }

  async crear(input: GuardarServicioDto): Promise<Servicio> {
    const entity = this.repository.create({
      idDepartamento: input.idDepartamento,
      codigo: input.codigo.trim().toUpperCase(),
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim() || null,
      tipoServicio: input.tipoServicio,
      activo: input.activo ?? true,
    });

    const saved = await this.repository.save(entity).catch((error: unknown) => {
      throw traducirDuplicadoServicio(error, input);
    });
    const created = await this.obtenerPorId(Number(saved.id));
    if (!created) {
      throw errorAlConfirmarGuardado(
        'servicio',
        saved.id,
        TypeOrmServicioRepository.name,
      );
    }

    return created;
  }

  async actualizar(id: number, input: GuardarServicioDto): Promise<Servicio> {
    await this.repository
      .update(id, {
        idDepartamento: input.idDepartamento,
        codigo: input.codigo.trim().toUpperCase(),
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        tipoServicio: input.tipoServicio,
        activo: input.activo ?? true,
      })
      .catch((error: unknown) => {
        throw traducirDuplicadoServicio(error, input);
      });

    // UPDATE sobre un id inexistente no falla: afecta 0 filas.
    const updated = await this.obtenerPorId(id);
    if (!updated) {
      throw noEncontrado('servicio', id, TypeOrmServicioRepository.name);
    }

    return updated;
  }

  async activar(id: number): Promise<void> {
    await this.repository.update(id, { activo: true });
  }

  async desactivar(id: number): Promise<void> {
    await this.repository.update(id, { activo: false });
  }
}

function traducirDuplicadoServicio(
  error: unknown,
  input: GuardarServicioDto,
): unknown {
  const restriccion = obtenerRestriccionUnicaViolada(error);

  // El codigo de servicio es unico en toda la institucion, no por departamento.
  if (restriccion === 'uq_servicio_codigo') {
    return new ConflictException(
      `Ya existe un servicio con el codigo ${input.codigo.trim().toUpperCase()} ` +
        '(los codigos de servicio no se repiten entre departamentos). Usa otro codigo.',
    );
  }

  if (restriccion === 'uq_servicio_departamento_nombre') {
    return new ConflictException(
      `Ya existe un servicio llamado "${input.nombre.trim()}" en ese departamento. Usa otro nombre.`,
    );
  }

  if (restriccion !== null) {
    return new ConflictException(
      'Ya existe un servicio con esos datos. Revisa el codigo y el nombre.',
    );
  }

  return error;
}
