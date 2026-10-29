import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryRunner, SelectQueryBuilder } from 'typeorm';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
  type EntidadMensaje,
} from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { obtenerRestriccionUnicaViolada } from '../../../../infrastructure/persistence/typeorm/violacion-unica';
import { getPaginatedRawMany } from '../../../../infrastructure/persistence/query/paginated-raw-query';
import { AsignacionConsulta } from '../../domain/entities/asignacion-consulta';
import { CargaHoraria } from '../../domain/entities/carga-horaria';
import { NivelCargoBase } from '../../domain/entities/nivel-cargo-base';
import { Personal } from '../../domain/entities/personal';
import { PersonalVinculable } from '../../domain/entities/personal-vinculable';
import { RolFuncionalBase } from '../../domain/entities/rol-funcional-base';
import {
  HistorialAsignacionConsulta,
  PersonalDetalle,
} from '../../domain/entities/personal-detalle';
import { TipoContrato } from '../../domain/entities/tipo-contrato';
import {
  ActualizarAsignacionInput,
  ActualizarTipoContratoInput,
  CerrarAsignacionInput,
  ConflictoPlanificacionAsignacion,
  CrearTipoContratoInput,
  EstadoPlanificacionAprobadaUnidad,
  GuardarCargaHorariaInput,
  GuardarNivelCargoInput,
  GuardarAsignacionInput,
  GuardarPersonalInput,
  ListarAsignacionesFiltro,
  ListarPersonalFiltro,
  MoverAsignacionInput,
  PersonalRepository,
} from '../../domain/repositories/personal.repository';
import { AsignacionPersonalOrmEntity } from './entities/asignacion-personal.orm-entity';
import { PersonalOrmEntity } from './entities/personal.orm-entity';

@Injectable()
export class TypeOrmPersonalRepository implements PersonalRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
  ) {}

  async listar(filtro: ListarPersonalFiltro): Promise<Personal[]> {
    const queryBuilder = this.dataSource
      .getRepository(PersonalOrmEntity)
      .createQueryBuilder('personal')
      .leftJoin(
        AsignacionPersonalOrmEntity,
        'asignacionPrincipal',
        'asignacionPrincipal.id_personal = personal.id AND asignacionPrincipal.activo = :asignacionActiva AND asignacionPrincipal.es_principal = :esPrincipal',
        {
          asignacionActiva: true,
          esPrincipal: true,
        },
      )
      .leftJoin(
        'servicio',
        'servicioPrincipal',
        'servicioPrincipal.id = asignacionPrincipal.id_servicio',
      )
      .leftJoin(
        'nivel_cargo',
        'nivelCargo',
        'nivelCargo.id = personal.id_nivel_cargo',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacionPrincipal.id_rol_funcional',
      )
      .select([
        'personal.id AS personal_id',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'personal.documento_identidad AS personal_documento_identidad',
        'personal.id_nivel_cargo AS personal_id_nivel_cargo',
        'personal.activo AS personal_activo',
        'nivelCargo.codigo AS nivel_cargo_codigo',
        'nivelCargo.nombre AS nivel_cargo_nombre',
        // Solo se necesita saber si existe una asignacion PRINCIPAL activa
        // (docs/database/decisiones-tecnicas.md seccion 78) — servicioPrincipal
        // y rolFuncional se mantienen unicamente como soporte de los filtros
        // idServicio/idDepartamento/rolFuncionalCodigo de abajo, no se seleccionan.
        'asignacionPrincipal.id AS asignacion_principal_id',
      ])
      .distinct(true);

    if (filtro.idServicio) {
      // Incluye personal sin asignacion activa: visible en el catalogo aunque aun no este asignado
      queryBuilder.andWhere(
        '(asignacionPrincipal.id_servicio = :idServicio OR asignacionPrincipal.id_personal IS NULL)',
        { idServicio: filtro.idServicio },
      );
    }

    if (filtro.idDepartamento) {
      // Incluye personal sin asignacion activa: visible en el catalogo aunque aun no este asignado
      queryBuilder.andWhere(
        '(asignacionPrincipal.id_departamento = :idDepartamento OR servicioPrincipal.id_departamento = :idDepartamento OR asignacionPrincipal.id_personal IS NULL)',
        { idDepartamento: filtro.idDepartamento },
      );
    }

    if (filtro.idNivelCargo) {
      queryBuilder.andWhere('personal.id_nivel_cargo = :idNivelCargo', {
        idNivelCargo: filtro.idNivelCargo,
      });
    }

    if (filtro.rolFuncionalCodigo) {
      queryBuilder.andWhere('rolFuncional.codigo = :rolFuncionalCodigo', {
        rolFuncionalCodigo: filtro.rolFuncionalCodigo,
      });
    }

    if (filtro.nombre) {
      queryBuilder.andWhere(
        "(personal.nombres LIKE :nombre OR personal.apellido_paterno LIKE :nombre OR personal.apellido_materno LIKE :nombre OR personal.codigo_personal LIKE :nombre OR personal.documento_identidad LIKE :nombre OR (ISNULL(personal.apellido_paterno, '') + ' ' + ISNULL(personal.apellido_materno, '') + ', ' + ISNULL(personal.nombres, '')) LIKE :nombre)",
        { nombre: `%${filtro.nombre}%` },
      );
    }

    if (typeof filtro.activo === 'boolean') {
      queryBuilder.andWhere('personal.activo = :activo', {
        activo: filtro.activo,
      });
    }

    const rows = await getPaginatedRawMany<PersonalListRow>(
      this.dataSource,
      queryBuilder
        .orderBy('personal.apellido_paterno', 'ASC')
        .addOrderBy('personal.apellido_materno', 'ASC')
        .addOrderBy('personal.nombres', 'ASC'),
      filtro,
      'base_query.personal_apellido_paterno ASC, base_query.personal_apellido_materno ASC, base_query.personal_nombres ASC',
    );

    return rows.map(mapPersonalRow);
  }

  // Proyeccion propia para Seguridad/Usuarios (vincular personal a un usuario):
  // solo necesita servicio/departamento/jefatura de personal activo, no el resto
  // del detalle de asignacion (item, tipo contrato, carga horaria) que trae
  // listar() para su propio filtrado (docs/database/decisiones-tecnicas.md
  // seccion 78).
  async listarVinculablesUsuario(): Promise<PersonalVinculable[]> {
    const rows = await this.executeTypedQuery<PersonalVinculableRow>(
      `
        SELECT
          personal.id AS personal_id,
          personal.codigo_personal AS personal_codigo_personal,
          personal.nombres AS personal_nombres,
          personal.apellido_paterno AS personal_apellido_paterno,
          personal.apellido_materno AS personal_apellido_materno,
          servicioPrincipal.id AS servicio_principal_id,
          servicioPrincipal.nombre AS servicio_principal_nombre,
          departamentoPrincipal.id AS departamento_principal_id,
          departamentoPrincipal.nombre AS departamento_principal_nombre,
          ISNULL(rolFuncional.es_jefatura, 0) AS rol_funcional_es_jefatura
        FROM dbo.personal personal
        LEFT JOIN dbo.asignacion_personal asignacionPrincipal
          ON asignacionPrincipal.id_personal = personal.id
         AND asignacionPrincipal.activo = 1
         AND asignacionPrincipal.es_principal = 1
        LEFT JOIN dbo.servicio servicioPrincipal
          ON servicioPrincipal.id = asignacionPrincipal.id_servicio
        LEFT JOIN dbo.departamento departamentoPrincipal
          ON departamentoPrincipal.id = COALESCE(asignacionPrincipal.id_departamento, servicioPrincipal.id_departamento)
        LEFT JOIN dbo.rol_funcional rolFuncional
          ON rolFuncional.id = asignacionPrincipal.id_rol_funcional
        WHERE personal.activo = 1
        ORDER BY personal.apellido_paterno ASC, personal.apellido_materno ASC, personal.nombres ASC
      `,
      [],
    );

    return rows.map((row) => ({
      id: Number(row.personal_id),
      codigoPersonal: row.personal_codigo_personal,
      nombreCompleto: buildNombreCompleto(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      idServicioPrincipal:
        row.servicio_principal_id === null
          ? null
          : Number(row.servicio_principal_id),
      nombreServicioPrincipal: row.servicio_principal_nombre,
      idDepartamentoPrincipal:
        row.departamento_principal_id === null
          ? null
          : Number(row.departamento_principal_id),
      nombreDepartamentoPrincipal: row.departamento_principal_nombre,
      esJefaturaRolFuncional: Boolean(row.rol_funcional_es_jefatura),
    }));
  }

  async contar(filtro: ListarPersonalFiltro): Promise<number> {
    const queryBuilder = this.dataSource
      .getRepository(PersonalOrmEntity)
      .createQueryBuilder('personal')
      .leftJoin(
        AsignacionPersonalOrmEntity,
        'asignacionPrincipal',
        'asignacionPrincipal.id_personal = personal.id AND asignacionPrincipal.activo = :asignacionActiva AND asignacionPrincipal.es_principal = :esPrincipal',
        {
          asignacionActiva: true,
          esPrincipal: true,
        },
      )
      .leftJoin(
        'servicio',
        'servicioPrincipal',
        'servicioPrincipal.id = asignacionPrincipal.id_servicio',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacionPrincipal.id_rol_funcional',
      )
      .distinct(true);

    if (filtro.idServicio) {
      queryBuilder.andWhere(
        '(asignacionPrincipal.id_servicio = :idServicio OR asignacionPrincipal.id_personal IS NULL)',
        { idServicio: filtro.idServicio },
      );
    }

    if (filtro.idDepartamento) {
      queryBuilder.andWhere(
        '(asignacionPrincipal.id_departamento = :idDepartamento OR servicioPrincipal.id_departamento = :idDepartamento OR asignacionPrincipal.id_personal IS NULL)',
        { idDepartamento: filtro.idDepartamento },
      );
    }

    if (filtro.idNivelCargo) {
      queryBuilder.andWhere('personal.id_nivel_cargo = :idNivelCargo', {
        idNivelCargo: filtro.idNivelCargo,
      });
    }

    if (filtro.rolFuncionalCodigo) {
      queryBuilder.andWhere('rolFuncional.codigo = :rolFuncionalCodigo', {
        rolFuncionalCodigo: filtro.rolFuncionalCodigo,
      });
    }

    if (filtro.nombre) {
      queryBuilder.andWhere(
        "(personal.nombres LIKE :nombre OR personal.apellido_paterno LIKE :nombre OR personal.apellido_materno LIKE :nombre OR personal.codigo_personal LIKE :nombre OR personal.documento_identidad LIKE :nombre OR (ISNULL(personal.apellido_paterno, '') + ' ' + ISNULL(personal.apellido_materno, '') + ', ' + ISNULL(personal.nombres, '')) LIKE :nombre)",
        { nombre: `%${filtro.nombre}%` },
      );
    }

    if (typeof filtro.activo === 'boolean') {
      queryBuilder.andWhere('personal.activo = :activo', {
        activo: filtro.activo,
      });
    }

    return queryBuilder.getCount();
  }

  async obtenerPorId(idPersonal: number): Promise<Personal | null> {
    const rows = await this.executeTypedQuery<PersonalListRow>(
      `
        SELECT
          personal.id AS personal_id,
          personal.codigo_personal AS personal_codigo_personal,
          personal.nombres AS personal_nombres,
          personal.apellido_paterno AS personal_apellido_paterno,
          personal.apellido_materno AS personal_apellido_materno,
          personal.documento_identidad AS personal_documento_identidad,
          personal.id_nivel_cargo AS personal_id_nivel_cargo,
          personal.activo AS personal_activo,
          nivelCargo.codigo AS nivel_cargo_codigo,
          nivelCargo.nombre AS nivel_cargo_nombre,
          asignacionPrincipal.id AS asignacion_principal_id
        FROM dbo.personal personal
        LEFT JOIN dbo.asignacion_personal asignacionPrincipal
          ON asignacionPrincipal.id_personal = personal.id
         AND asignacionPrincipal.activo = 1
         AND asignacionPrincipal.es_principal = 1
        LEFT JOIN dbo.nivel_cargo nivelCargo
          ON nivelCargo.id = personal.id_nivel_cargo
        WHERE personal.id = @0
      `,
      [idPersonal],
    );

    return rows[0] ? mapPersonalRow(rows[0]) : null;
  }

  async obtenerDetalle(idPersonal: number): Promise<PersonalDetalle | null> {
    const row = await this.dataSource
      .getRepository(PersonalOrmEntity)
      .createQueryBuilder('personal')
      .leftJoin(
        AsignacionPersonalOrmEntity,
        'asignacionPrincipal',
        'asignacionPrincipal.id_personal = personal.id AND asignacionPrincipal.activo = :asignacionActiva AND asignacionPrincipal.es_principal = :esPrincipal',
        {
          asignacionActiva: true,
          esPrincipal: true,
        },
      )
      .leftJoin(
        'servicio',
        'servicioPrincipal',
        'servicioPrincipal.id = asignacionPrincipal.id_servicio',
      )
      .leftJoin(
        'departamento',
        'departamentoPrincipal',
        'departamentoPrincipal.id = COALESCE(asignacionPrincipal.id_departamento, servicioPrincipal.id_departamento)',
      )
      .leftJoin(
        'nivel_cargo',
        'nivelCargo',
        'nivelCargo.id = personal.id_nivel_cargo',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacionPrincipal.id_rol_funcional',
      )
      .leftJoin('usuario', 'usuario', 'usuario.id_personal = personal.id')
      .leftJoin(
        'rol_seguridad',
        'rolUsuario',
        'rolUsuario.id = usuario.id_rol_seguridad',
      )
      .select([
        'personal.id AS personal_id',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'personal.documento_identidad AS personal_documento_identidad',
        'personal.activo AS personal_activo',
        'nivelCargo.id AS nivel_cargo_id',
        'nivelCargo.codigo AS nivel_cargo_codigo',
        'nivelCargo.nombre AS nivel_cargo_nombre',
        'rolFuncional.id AS rol_funcional_id',
        'rolFuncional.codigo AS rol_funcional_codigo',
        'rolFuncional.nombre AS rol_funcional_nombre',
        'rolFuncional.es_jefatura AS rol_funcional_es_jefatura',
        'servicioPrincipal.id AS servicio_principal_id',
        'servicioPrincipal.codigo AS servicio_principal_codigo',
        'servicioPrincipal.nombre AS servicio_principal_nombre',
        'departamentoPrincipal.id AS departamento_principal_id',
        'departamentoPrincipal.codigo AS departamento_principal_codigo',
        'departamentoPrincipal.nombre AS departamento_principal_nombre',
        'usuario.id AS usuario_id',
        'usuario.username AS usuario_username',
        'usuario.tipo_usuario AS usuario_tipo_usuario',
        'usuario.activo AS usuario_activo',
        'rolUsuario.id AS usuario_rol_id',
        'rolUsuario.codigo AS usuario_rol_codigo',
        'rolUsuario.nombre AS usuario_rol_nombre',
      ])
      .where('personal.id = :idPersonal', { idPersonal })
      .getRawOne<PersonalDetailRow | null>();

    if (!row) {
      return null;
    }

    const [asignacionesVigentes, asignacionesHistoricas] = await Promise.all([
      this.listarAsignaciones({
        idPersonal,
        activo: true,
      }),
      this.listarHistorialAsignaciones(idPersonal),
    ]);

    return {
      id: Number(row.personal_id),
      codigoPersonal: row.personal_codigo_personal,
      nombres: row.personal_nombres,
      apellidoPaterno: row.personal_apellido_paterno,
      apellidoMaterno: row.personal_apellido_materno,
      documentoIdentidad: row.personal_documento_identidad,
      nombreCompleto: buildNombreCompleto(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      activo: row.personal_activo,
      cargoActual:
        row.nivel_cargo_id === null
          ? null
          : {
              id: Number(row.nivel_cargo_id),
              codigo: row.nivel_cargo_codigo,
              nombre: normalizeCargoNombre(
                row.nivel_cargo_codigo,
                row.nivel_cargo_nombre,
              ),
            },
      usuario:
        row.usuario_id === null
          ? null
          : {
              id: Number(row.usuario_id),
              username: row.usuario_username,
              tipoUsuario: row.usuario_tipo_usuario,
              activo: row.usuario_activo,
              rolSeguridad:
                row.usuario_rol_id === null
                  ? null
                  : {
                      id: Number(row.usuario_rol_id),
                      codigo: row.usuario_rol_codigo,
                      nombre: row.usuario_rol_nombre,
                    },
            },
      rolFuncionalActual:
        row.rol_funcional_id === null
          ? null
          : {
              id: Number(row.rol_funcional_id),
              codigo: row.rol_funcional_codigo,
              nombre: row.rol_funcional_nombre,
              esJefatura: row.rol_funcional_es_jefatura,
            },
      servicioActual:
        row.servicio_principal_id === null
          ? null
          : {
              id: Number(row.servicio_principal_id),
              codigo: row.servicio_principal_codigo,
              nombre: row.servicio_principal_nombre,
            },
      departamentoActual:
        row.departamento_principal_id === null
          ? null
          : {
              id: Number(row.departamento_principal_id),
              codigo: row.departamento_principal_codigo,
              nombre: row.departamento_principal_nombre,
            },
      asignacionesVigentes,
      asignacionesHistoricas,
    };
  }

  async obtenerAsignacionPorId(
    idAsignacion: number,
  ): Promise<AsignacionConsulta | null> {
    const rows = await this.listarAsignacionesPorIds([idAsignacion]);
    return rows[0] ?? null;
  }

  async obtenerJefaturaActivaEnUnidad(params: {
    idServicio?: number | null;
    idDepartamento?: number | null;
  }): Promise<AsignacionConsulta | null> {
    const rows = await this.executeTypedQuery<{ id: number | string }>(
      `
        SELECT TOP 1 ap.id
        FROM dbo.asignacion_personal ap
        JOIN dbo.rol_funcional rf ON rf.id = ap.id_rol_funcional
        WHERE ap.activo = 1
          AND rf.es_jefatura = 1
          AND (
            (@0 IS NOT NULL AND ap.id_servicio = @0)
            OR (@0 IS NULL AND @1 IS NOT NULL AND ap.id_departamento = @1 AND ap.id_servicio IS NULL)
          )
      `,
      [params.idServicio ?? null, params.idDepartamento ?? null],
    );
    const id = rows[0]?.id;
    if (id === undefined || id === null) return null;
    return this.obtenerAsignacionPorId(Number(id));
  }

  async crearAsignacion(
    input: GuardarAsignacionInput,
  ): Promise<AsignacionConsulta> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const context = await this.buildAssignmentContext(runner, input);
      const nroItemResuelto = await this.resolveAssignmentNroItem(
        runner,
        input.idPersonal,
        input.nroItem ?? null,
      );

      await this.assertCanPersistAssignment(runner, null, {
        ...context,
        ...input,
        nroItem: nroItemResuelto ?? undefined,
      });

      const insertedRows = (await runner.query(
        `
          INSERT INTO dbo.asignacion_personal
          (
            id_personal,
            id_servicio,
            id_departamento,
            id_tipo_contrato,
            id_carga_horaria,
            id_rol_funcional,
            nro_item,
            codigo_fuente_item,
            tipo_asignacion,
            es_principal,
            fecha_inicio,
            fecha_fin,
            activo
          )
          OUTPUT INSERTED.id AS id
          VALUES
          (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, @11, 1)
        `,
        [
          input.idPersonal,
          context.idServicio,
          context.idDepartamento,
          input.idTipoContrato,
          input.idCargaHoraria,
          input.idRolFuncional,
          nroItemResuelto,
          input.codigoFuenteItem ?? null,
          input.tipoAsignacion,
          input.tipoAsignacion === 'PRINCIPAL' ? 1 : 0,
          input.fechaInicio,
          input.fechaFin ?? null,
        ],
      )) as Array<{ id: number | string }>;

      const insertedId = Number(insertedRows[0]?.id);

      if (!insertedId) {
        throw new ConflictException(
          'No se pudo registrar la asignacion. Intenta de nuevo.',
        );
      }

      await this.insertHistorialAsignacion(runner, {
        idAsignacionPersonal: insertedId,
        tipoEvento: 'ALTA',
        idServicioOrigen: null,
        idServicioDestino: context.idServicio,
        idDepartamentoOrigen: null,
        idDepartamentoDestino: context.idDepartamento,
        idRolFuncionalOrigen: null,
        idRolFuncionalDestino: input.idRolFuncional,
        idUsuario: input.idUsuarioOperacion,
        motivo: input.motivo ?? 'Alta de asignacion.',
      });

      await runner.commitTransaction();

      const asignacion = await this.obtenerAsignacionPorId(insertedId);

      if (!asignacion) {
        throw errorAlConfirmarGuardado(
          'asignacion',
          insertedId,
          TypeOrmPersonalRepository.name,
        );
      }

      return asignacion;
    } catch (error) {
      await runner.rollbackTransaction();
      throw mapearErrorAsignacion(error);
    } finally {
      await runner.release();
    }
  }

  async actualizarAsignacion(
    idAsignacion: number,
    input: ActualizarAsignacionInput,
  ): Promise<AsignacionConsulta> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const actual = await this.getAsignacionRowById(runner, idAsignacion);

      if (!actual) {
        throw noEncontrado(
          'asignacion',
          idAsignacion,
          TypeOrmPersonalRepository.name,
        );
      }

      if (!actual.activo) {
        throw new ConflictException(
          'Esta asignacion ya esta cerrada. Para reasignar a la persona, trabaja con su asignacion activa.',
        );
      }

      const context = await this.buildAssignmentContext(runner, input);

      // "Editar" nunca cambia id_servicio/id_departamento — para eso existe
      // "mover" (docs/database/decisiones-tecnicas.md seccion 56). Comparar
      // contra el context ya resuelto (no el input crudo) evita un falso
      // positivo cuando el caller reenvia el mismo servicio sin repetir el
      // departamento derivado — ActualizarAsignacionUseCase no puede hacer
      // esta comparacion por si solo, no tiene forma de resolver el
      // departamento de un servicio sin consultar la base.
      if (
        !nullableNumberEquals(actual.id_servicio, context.idServicio) ||
        !nullableNumberEquals(actual.id_departamento, context.idDepartamento)
      ) {
        throw new ConflictException(
          'No se puede cambiar de servicio o departamento con "editar asignacion". Usa la accion "mover" para trasladar a esta persona a otra unidad.',
        );
      }

      const nroItemResuelto = await this.resolveAssignmentNroItem(
        runner,
        input.idPersonal,
        input.nroItem ?? null,
      );
      const actualFechaInicioIso = actual.fecha_inicio
        .toISOString()
        .slice(0, 10);
      const actualFechaFinIso = actual.fecha_fin
        ? actual.fecha_fin.toISOString().slice(0, 10)
        : null;
      const inputFechaFinIso = input.fechaFin ?? null;

      // El driver mssql devuelve las columnas BIGINT (id_personal, id_servicio,
      // id_departamento, id_tipo_contrato, id_carga_horaria, id_rol_funcional)
      // como string, mientras que el DTO ya llega parseado a number — comparar
      // con nullableNumberEquals evita falsos "hay cambios" por tipo.
      const noHayCambios =
        nullableNumberEquals(actual.id_personal, input.idPersonal) &&
        nullableNumberEquals(actual.id_servicio, context.idServicio) &&
        nullableNumberEquals(actual.id_departamento, context.idDepartamento) &&
        nullableNumberEquals(actual.id_tipo_contrato, input.idTipoContrato) &&
        nullableNumberEquals(actual.id_carga_horaria, input.idCargaHoraria) &&
        nullableNumberEquals(actual.id_rol_funcional, input.idRolFuncional) &&
        (actual.nro_item ?? null) === (nroItemResuelto ?? null) &&
        (actual.codigo_fuente_item ?? null) ===
          (input.codigoFuenteItem ?? null) &&
        actual.tipo_asignacion === input.tipoAsignacion &&
        actualFechaInicioIso === input.fechaInicio.slice(0, 10) &&
        actualFechaFinIso === inputFechaFinIso;

      if (noHayCambios) {
        // No se persiste UPDATE ni historial: no tiene sentido registrar un
        // "cambio" cuando ningun campo difiere (ej. reenviar el mismo
        // servicio como destino). Evita ruido en historial_asignacion y
        // evita disparar el chequeo de planificacion abierta sin necesidad.
        await runner.commitTransaction();
        const sinCambios = await this.obtenerAsignacionPorId(idAsignacion);
        if (!sinCambios) {
          throw errorAlConfirmarGuardado(
            'asignacion',
            idAsignacion,
            TypeOrmPersonalRepository.name,
          );
        }
        return sinCambios;
      }

      if (
        (actual.id_servicio !== context.idServicio ||
          actual.id_departamento !== context.idDepartamento ||
          actual.id_rol_funcional !== input.idRolFuncional ||
          (actual.es_principal ? 1 : 0) !==
            (input.tipoAsignacion === 'PRINCIPAL' ? 1 : 0) ||
          actualFechaFinIso !== inputFechaFinIso) &&
        (await this.existePlanificacionAbiertaParaAsignacion(idAsignacion))
      ) {
        const conflicto =
          await this.obtenerBloqueoPlanificacionAbiertaParaAsignacion(
            idAsignacion,
          );
        if (input.regularizarPlanificacionesAbiertas) {
          await this.regularizarPlanificacionesAbiertasDeAsignacion(
            runner,
            idAsignacion,
          );
        } else {
          throw new ConflictException(
            conflicto
              ? `No se puede cambiar la asignacion porque el personal tiene turnos o incidencias registrados en la planificacion de ${formatPeriodoPlanificacion(conflicto.planificacion_fecha_inicio)} de ${conflicto.unidad_nombre}. Primero entra a la matriz, limpia los registros de esta persona y guarda los cambios. Luego podras moverla a otro servicio.`
              : 'Esta asignacion ya tiene registros en una planificacion abierta. Cierra o regulariza esa planificacion antes de cambiar la asignacion.',
          );
        }
      }

      await this.assertCanPersistAssignment(runner, idAsignacion, {
        ...context,
        ...input,
        nroItem: nroItemResuelto ?? undefined,
      });

      await runner.query(
        `
          UPDATE dbo.asignacion_personal
          SET
            id_personal = @1,
            id_servicio = @2,
            id_departamento = @3,
            id_tipo_contrato = @4,
            id_carga_horaria = @5,
            id_rol_funcional = @6,
            nro_item = @7,
            codigo_fuente_item = @8,
            tipo_asignacion = @9,
            es_principal = @10,
            fecha_inicio = @11,
            fecha_fin = @12,
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [
          idAsignacion,
          input.idPersonal,
          context.idServicio,
          context.idDepartamento,
          input.idTipoContrato,
          input.idCargaHoraria,
          input.idRolFuncional,
          nroItemResuelto,
          input.codigoFuenteItem ?? null,
          input.tipoAsignacion,
          input.tipoAsignacion === 'PRINCIPAL' ? 1 : 0,
          input.fechaInicio,
          input.fechaFin ?? null,
        ],
      );

      // 'ACTUALIZACION' fijo: ActualizarAsignacionUseCase ya rechaza cualquier cambio de
      // id_servicio/id_departamento antes de llegar aqui (docs/database/decisiones-tecnicas.md
      // seccion 56) — ese caso pasa por moverAsignacion, que registra un unico evento
      // 'TRASLADO'. Este es el flujo que nombra/retira jefatura en el mismo sitio (sin
      // cambio de unidad), por eso el rol funcional de origen/destino es lo que importa
      // auditar aqui, no la unidad (que no cambia).
      await this.insertHistorialAsignacion(runner, {
        idAsignacionPersonal: idAsignacion,
        tipoEvento: 'ACTUALIZACION',
        idServicioOrigen: actual.id_servicio,
        idServicioDestino: context.idServicio,
        idDepartamentoOrigen: actual.id_departamento,
        idDepartamentoDestino: context.idDepartamento,
        idRolFuncionalOrigen: actual.id_rol_funcional,
        idRolFuncionalDestino: input.idRolFuncional,
        idUsuario: input.idUsuarioOperacion,
        motivo: input.motivo ?? 'Actualizacion de asignacion.',
      });

      await runner.commitTransaction();

      const asignacion = await this.obtenerAsignacionPorId(idAsignacion);

      if (!asignacion) {
        throw errorAlConfirmarGuardado(
          'asignacion',
          idAsignacion,
          TypeOrmPersonalRepository.name,
        );
      }

      return asignacion;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  // Unico flujo que cambia id_servicio/id_departamento de una asignacion (docs/database/
  // decisiones-tecnicas.md seccion 56): cierra la fila actual y crea una fila nueva con
  // fecha_inicio propia, en una sola transaccion. Nunca reescribe la unidad de una fila
  // existente in-place — eso dejaba fecha_inicio representando la vigencia vieja.
  async moverAsignacion(
    idAsignacion: number,
    input: MoverAsignacionInput,
  ): Promise<AsignacionConsulta> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const actual = await this.getAsignacionRowById(runner, idAsignacion);

      if (!actual) {
        throw noEncontrado(
          'asignacion',
          idAsignacion,
          TypeOrmPersonalRepository.name,
        );
      }

      if (!actual.activo) {
        throw new ConflictException(
          'Esta asignacion ya esta cerrada y no puede moverse.',
        );
      }

      const context = await this.buildAssignmentContext(runner, {
        idPersonal: actual.id_personal,
        idServicio: input.idServicio,
        idDepartamento: input.idDepartamento,
        idTipoContrato: input.idTipoContrato,
        idRolFuncional: input.idRolFuncional,
        idCargaHoraria: input.idCargaHoraria,
      });

      const sinCambioDeUnidad =
        nullableNumberEquals(actual.id_servicio, context.idServicio) &&
        nullableNumberEquals(actual.id_departamento, context.idDepartamento);

      if (sinCambioDeUnidad) {
        throw new BadRequestException(
          'Para mover, elige una unidad de destino distinta a la actual. Si solo cambia el rol funcional u otro dato administrativo, usa "editar asignacion".',
        );
      }

      const fecha = input.fecha ?? new Date().toISOString().slice(0, 10);

      // Una planificacion aprobada no se regulariza destruyendo sus turnos.
      // Primero se detecta el impacto para registrar un cambio efectivo despues
      // de crear la nueva asignacion. Las planificaciones BORRADOR/REVISION
      // conservan el comportamiento previo de regularizacion explicita.
      const impactoPlanificacionAprobada =
        await this.obtenerImpactoPlanificacionAprobadaParaTraslado(
          runner,
          actual.id_servicio,
          actual.id_departamento,
          context.idServicio,
          context.idDepartamento,
          fecha,
        );

      // Primera condicion del ajuste por traslado (docs/integracion/estrategia-
      // integracion-asistencia-y-cambios-planificacion.md seccion 12): si el origen
      // ya tiene planificacion aprobada, el destino tambien debe tenerla aprobada
      // para el mismo periodo. Sin esta condicion el cambio quedaba con
      // id_planificacion_destino = NULL y nada lo reconciliaba despues si el
      // destino se aprobaba mas tarde (las celdas de esa persona en esa
      // planificacion recien aprobada quedaban sin forma de habilitarse).
      if (
        impactoPlanificacionAprobada &&
        impactoPlanificacionAprobada.idPlanificacionDestino === null
      ) {
        throw new ConflictException(
          `No se puede trasladar a esta persona: su planificacion de origen ya esta aprobada, pero el servicio/departamento de destino no tiene una planificacion aprobada vigente para el ${formatearFechaCorta(fecha)}. Aprueba primero la planificacion del destino y luego continua con el traslado.`,
        );
      }

      const nroItemResuelto = await this.resolveAssignmentNroItem(
        runner,
        actual.id_personal,
        input.nroItem ?? null,
      );

      if (
        !impactoPlanificacionAprobada &&
        (await this.existePlanificacionAbiertaParaAsignacion(idAsignacion))
      ) {
        const conflicto =
          await this.obtenerBloqueoPlanificacionAbiertaParaAsignacion(
            idAsignacion,
          );
        if (input.regularizarPlanificacionesAbiertas) {
          await this.regularizarPlanificacionesAbiertasDeAsignacion(
            runner,
            idAsignacion,
          );
        } else {
          throw new ConflictException(
            conflicto
              ? `No se puede mover la asignacion porque el personal tiene turnos o incidencias registrados en la planificacion de ${formatPeriodoPlanificacion(conflicto.planificacion_fecha_inicio)} de ${conflicto.unidad_nombre}. Primero entra a la matriz, limpia los registros de esta persona y guarda los cambios. Luego podras moverla.`
              : 'Esta asignacion ya tiene registros en una planificacion abierta. Cierra o regulariza esa planificacion antes de moverla.',
          );
        }
      }

      // Paso 1: cerrar la fila actual (fecha_inicio no se toca — sigue representando el
      // periodo que termina aqui).
      await runner.query(
        `
          UPDATE dbo.asignacion_personal
          SET
            fecha_fin = @1,
            activo = 0,
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [idAsignacion, fecha],
      );

      // El historial de este movimiento se registra en un unico evento 'TRASLADO'
      // despues de crear la fila nueva (mas abajo), no aqui: escribir un 'CIERRE' con
      // destino nulo en este punto era indistinguible en el historial de un retiro real
      // (docs/database/decisiones-tecnicas.md), y el modelo ya preveia 'TRASLADO' con
      // origen+destino en una sola fila desde la migracion 002.

      // Paso 2: validar y crear la fila nueva. idAsignacionActual=null porque es una fila
      // nueva — la vieja ya quedo inactiva en el paso 1, asi que no colisiona con los
      // chequeos de "principal duplicada"/"misma unidad activa" de assertCanPersistAssignment.
      await this.assertCanPersistAssignment(runner, null, {
        ...context,
        idPersonal: actual.id_personal,
        idTipoContrato: input.idTipoContrato,
        idCargaHoraria: input.idCargaHoraria,
        idRolFuncional: input.idRolFuncional,
        nroItem: nroItemResuelto ?? undefined,
        tipoAsignacion: actual.tipo_asignacion as 'PRINCIPAL' | 'SECUNDARIA',
        fechaInicio: fecha,
        fechaFin: null,
      });

      const insertedRows = (await runner.query(
        `
          INSERT INTO dbo.asignacion_personal
          (
            id_personal,
            id_servicio,
            id_departamento,
            id_tipo_contrato,
            id_carga_horaria,
            id_rol_funcional,
            nro_item,
            codigo_fuente_item,
            tipo_asignacion,
            es_principal,
            fecha_inicio,
            fecha_fin,
            activo
          )
          OUTPUT INSERTED.id AS id
          VALUES
          (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10, NULL, 1)
        `,
        [
          actual.id_personal,
          context.idServicio,
          context.idDepartamento,
          input.idTipoContrato,
          input.idCargaHoraria,
          input.idRolFuncional,
          nroItemResuelto,
          input.codigoFuenteItem ?? null,
          actual.tipo_asignacion,
          actual.tipo_asignacion === 'PRINCIPAL' ? 1 : 0,
          fecha,
        ],
      )) as Array<{ id: number | string }>;

      const insertedId = Number(insertedRows[0]?.id);

      if (!insertedId) {
        throw new ConflictException(
          'No se pudo registrar la nueva asignacion. Intenta de nuevo.',
        );
      }

      await this.insertHistorialAsignacion(runner, {
        idAsignacionPersonal: insertedId,
        tipoEvento: 'TRASLADO',
        idServicioOrigen: actual.id_servicio,
        idServicioDestino: context.idServicio,
        idDepartamentoOrigen: actual.id_departamento,
        idDepartamentoDestino: context.idDepartamento,
        idRolFuncionalOrigen: actual.id_rol_funcional,
        idRolFuncionalDestino: input.idRolFuncional,
        idUsuario: input.idUsuarioOperacion,
        motivo: input.motivo ?? `Movimiento de unidad a partir del ${fecha}.`,
      });

      if (impactoPlanificacionAprobada) {
        await this.registrarCambioPlanificacionPorTraslado(runner, {
          idAsignacionOrigen: Number(actual.id),
          idAsignacionDestino: insertedId,
          idPlanificacionOrigen:
            impactoPlanificacionAprobada.idPlanificacionOrigen,
          idPlanificacionDestino:
            impactoPlanificacionAprobada.idPlanificacionDestino,
          fechaEfectiva: fecha,
          idUsuario: input.idUsuarioOperacion,
          motivo: input.motivo ?? `Movimiento de unidad a partir del ${fecha}.`,
        });
      }

      await runner.commitTransaction();

      const asignacion = await this.obtenerAsignacionPorId(insertedId);

      if (!asignacion) {
        throw errorAlConfirmarGuardado(
          'asignacion',
          insertedId,
          TypeOrmPersonalRepository.name,
        );
      }

      return asignacion;
    } catch (error) {
      await runner.rollbackTransaction();
      throw mapearErrorAsignacion(error);
    } finally {
      await runner.release();
    }
  }

  private async obtenerImpactoPlanificacionAprobadaParaTraslado(
    runner: QueryRunner,
    idServicioOrigen: number | null,
    idDepartamentoOrigen: number | null,
    idServicioDestino: number | null,
    idDepartamentoDestino: number,
    fechaEfectiva: string,
  ): Promise<ImpactoPlanificacionAprobadaTraslado | null> {
    // Antes esto exigia que la asignacion de origen ya tuviera al menos un
    // rol_turno en una planificacion APROBADA, usando un INNER JOIN contra
    // rol_turno. Eso rompia exactamente el caso que esta funcion existe para
    // habilitar: una persona trasladada a una planificacion aprobada entra
    // con el horario vacio (se completa despues, por "Completar horario de
    // traslado"), asi que si se la traslada de nuevo antes de que alguien le
    // llene una sola celda, la busqueda por rol_turno no encontraba nada y el
    // traslado se registraba como si el origen nunca hubiera estado aprobado
    // — sin fila en planificacion_cambio_asignacion, sin bloqueo visual, y
    // sin ningun camino de UI para completar jamas esas celdas (ver
    // docs/database/decisiones-tecnicas.md seccion 153). La pregunta correcta
    // no es "tiene turnos ya escritos" sino "el servicio/departamento actual
    // de esta asignacion tiene una planificacion aprobada vigente para este
    // periodo" — exactamente el mismo chequeo que ya se usa para el destino.
    const origen = await this.buscarPlanificacionAprobadaPorUnidadYFecha(
      runner,
      {
        idServicio: idServicioOrigen,
        idDepartamento: idDepartamentoOrigen,
        fecha: fechaEfectiva,
      },
    );

    if (!origen) {
      return null;
    }

    const destino = await this.buscarPlanificacionAprobadaPorUnidadYFecha(
      runner,
      {
        idServicio: idServicioDestino,
        idDepartamento: idDepartamentoDestino,
        fecha: fechaEfectiva,
      },
    );

    return {
      idPlanificacionOrigen: origen.idPlanificacion,
      idPlanificacionDestino: destino ? destino.idPlanificacion : null,
    };
  }

  // Compartido entre el chequeo transaccional de moverAsignacion (le pasa el
  // QueryRunner activo) y la consulta publica de solo lectura que usa el frontend
  // para avisar antes de confirmar el traslado (le pasa this.dataSource) — misma
  // regla de negocio, una sola definicion de SQL (ARQUITECTURA.md §5).
  private async buscarPlanificacionAprobadaPorUnidadYFecha(
    executor: {
      query: (sql: string, parameters?: unknown[]) => Promise<unknown>;
    },
    params: {
      idServicio: number | null;
      idDepartamento: number | null;
      fecha: string;
    },
  ): Promise<EstadoPlanificacionAprobadaUnidad | null> {
    const [anioToken, mesToken] = params.fecha.split('-');
    const anio = Number(anioToken);
    const mes = Number(mesToken);

    const rows = (await executor.query(
      `
        SELECT TOP 1
          planificacion.id AS id_planificacion,
          COALESCE(servicio.nombre, departamento.nombre) AS unidad_nombre,
          planificacion.anio AS anio,
          planificacion.mes AS mes
        FROM dbo.planificacion planificacion
        LEFT JOIN dbo.servicio servicio ON servicio.id = planificacion.id_servicio
        LEFT JOIN dbo.departamento departamento ON departamento.id = planificacion.id_departamento
        WHERE planificacion.activo = 1
          AND planificacion.estado = 'APROBADA'
          AND planificacion.anio = @0
          AND planificacion.mes = @1
          AND (
            (@2 IS NOT NULL AND planificacion.id_servicio = @2)
            OR (@2 IS NULL AND @3 IS NOT NULL AND planificacion.id_departamento = @3)
          )
        ORDER BY planificacion.id ASC
      `,
      [anio, mes, params.idServicio, params.idDepartamento],
    )) as Array<{
      id_planificacion: number | string;
      unidad_nombre: string | null;
      anio: number | string;
      mes: number | string;
    }>;

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      idPlanificacion: Number(row.id_planificacion),
      unidadNombre: row.unidad_nombre ?? '',
      periodo: formatPeriodoPlanificacionPorAnioMes(
        Number(row.anio),
        Number(row.mes),
      ),
    };
  }

  async obtenerPlanificacionAprobadaPorUnidadYFecha(params: {
    idServicio?: number | null;
    idDepartamento?: number | null;
    fecha: string;
  }): Promise<EstadoPlanificacionAprobadaUnidad | null> {
    return this.buscarPlanificacionAprobadaPorUnidadYFecha(this.dataSource, {
      idServicio: params.idServicio ?? null,
      idDepartamento: params.idDepartamento ?? null,
      fecha: params.fecha,
    });
  }

  private async registrarCambioPlanificacionPorTraslado(
    runner: QueryRunner,
    input: {
      idAsignacionOrigen: number;
      idAsignacionDestino: number;
      idPlanificacionOrigen: number;
      idPlanificacionDestino: number | null;
      fechaEfectiva: string;
      idUsuario: number;
      motivo: string;
    },
  ): Promise<void> {
    const existente = (
      (await runner.query(
        `
          SELECT TOP 1 id
          FROM dbo.planificacion_cambio_asignacion
          WHERE id_asignacion_origen = @0
            AND id_asignacion_destino = @1
            AND fecha_efectiva = @2
            AND activo = 1
        `,
        [
          input.idAsignacionOrigen,
          input.idAsignacionDestino,
          input.fechaEfectiva,
        ],
      )) as Array<{ id: number | string }>
    )[0];

    if (existente) {
      return;
    }

    await runner.query(
      `
        INSERT INTO dbo.planificacion_cambio_asignacion
        (
          id_asignacion_origen,
          id_asignacion_destino,
          id_planificacion_origen,
          id_planificacion_destino,
          fecha_efectiva,
          motivo,
          id_usuario_creador
        )
        VALUES (@0, @1, @2, @3, @4, @5, @6)
      `,
      [
        input.idAsignacionOrigen,
        input.idAsignacionDestino,
        input.idPlanificacionOrigen,
        input.idPlanificacionDestino,
        input.fechaEfectiva,
        input.motivo,
        input.idUsuario,
      ],
    );
  }

  async cerrarAsignacion(
    idAsignacion: number,
    input: CerrarAsignacionInput,
  ): Promise<AsignacionConsulta> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const actual = await this.getAsignacionRowById(runner, idAsignacion);

      if (!actual) {
        throw noEncontrado(
          'asignacion',
          idAsignacion,
          TypeOrmPersonalRepository.name,
        );
      }

      if (!actual.activo) {
        throw new ConflictException(
          'Esta asignacion ya esta cerrada y no puede modificarse.',
        );
      }

      // Comparar solo la parte de fecha (YYYY-MM-DD) para evitar falsos negativos por timezone
      // cuando el driver MSSQL devuelve DATETIME como hora local en lugar de UTC.
      const fechaFinStr = input.fechaFin.slice(0, 10);
      const fechaInicioStr =
        actual.fecha_inicio instanceof Date
          ? actual.fecha_inicio.toISOString().slice(0, 10)
          : String(actual.fecha_inicio).slice(0, 10);
      if (fechaFinStr < fechaInicioStr) {
        throw new BadRequestException(
          'La fecha de cierre no puede ser anterior a la fecha de inicio de la asignacion. Revisa las fechas.',
        );
      }

      if (await this.existePlanificacionAbiertaParaAsignacion(idAsignacion)) {
        const conflicto =
          await this.obtenerBloqueoPlanificacionAbiertaParaAsignacion(
            idAsignacion,
          );
        if (input.regularizarPlanificacionesAbiertas) {
          await this.regularizarPlanificacionesAbiertasDeAsignacion(
            runner,
            idAsignacion,
          );
        } else {
          throw new ConflictException(
            conflicto
              ? `No se puede quitar la asignacion porque el personal tiene turnos o incidencias registrados en la planificacion de ${formatPeriodoPlanificacion(conflicto.planificacion_fecha_inicio)} de ${conflicto.unidad_nombre}. Primero entra a la matriz, limpia los registros de esta persona y guarda los cambios. Luego podras dejarla sin asignacion.`
              : 'Esta asignacion ya tiene registros en una planificacion abierta. Cierra o regulariza esa planificacion antes de cerrar la asignacion.',
          );
        }
      }

      if (
        actual.tipo_asignacion === 'PRINCIPAL' &&
        !input.cerrarSecundariasActivas
      ) {
        const secundariasActivas = (await runner.query(
          `
            SELECT COUNT(*) AS total
            FROM dbo.asignacion_personal
            WHERE id_personal = @0
              AND tipo_asignacion = 'SECUNDARIA'
              AND activo = 1
          `,
          [actual.id_personal],
        )) as Array<{ total: number | string }>;
        const totalSecundariasActivas = Number(
          secundariasActivas[0]?.total ?? 0,
        );

        // Una SECUNDARIA activa nunca puede quedar sin una PRINCIPAL activa de la
        // misma persona (docs/database/decisiones-tecnicas.md seccion 43): cerrar la
        // PRINCIPAL sin decidir que hacer con las secundarias dejaria ese estado
        // invalido, asi que la cascada deja de ser opcional en este caso.
        if (totalSecundariasActivas > 0) {
          throw new ConflictException(
            `Esta persona tiene ${totalSecundariasActivas} asignacion(es) secundaria(s) activa(s). Marca "cerrar tambien las secundarias" para continuar, o cierralas antes por separado: no puede quedar con secundarias activas sin asignacion principal.`,
          );
        }
      }

      await runner.query(
        `
          UPDATE dbo.asignacion_personal
          SET
            fecha_fin = @1,
            activo = 0,
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [idAsignacion, input.fechaFin],
      );

      await this.insertHistorialAsignacion(runner, {
        idAsignacionPersonal: idAsignacion,
        tipoEvento: 'CIERRE',
        idServicioOrigen: actual.id_servicio,
        idServicioDestino: null,
        idDepartamentoOrigen: actual.id_departamento,
        idDepartamentoDestino: null,
        idRolFuncionalOrigen: actual.id_rol_funcional,
        idRolFuncionalDestino: null,
        idUsuario: input.idUsuarioOperacion,
        motivo: input.motivo ?? 'Cierre de asignacion.',
      });

      if (
        input.cerrarSecundariasActivas &&
        actual.tipo_asignacion === 'PRINCIPAL'
      ) {
        await this.cerrarSecundariasDePersonal(
          runner,
          actual.id_personal,
          input.fechaFin,
          input.idUsuarioOperacion,
          input.motivo,
        );
      }

      await runner.commitTransaction();

      const asignacion = await this.obtenerAsignacionPorId(idAsignacion);

      if (!asignacion) {
        throw errorAlConfirmarGuardado(
          'asignacion',
          idAsignacion,
          TypeOrmPersonalRepository.name,
        );
      }

      return asignacion;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async crearPersonal(input: GuardarPersonalInput): Promise<Personal> {
    await this.assertPersonalUpsertAllowed(null, input);

    const insertedRows = await this.executeTypedQuery<{ id: number | string }>(
      `
        INSERT INTO dbo.personal
        (
          codigo_personal,
          nombres,
          apellido_paterno,
          apellido_materno,
          documento_identidad,
          id_nivel_cargo,
          activo
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (@0, @1, @2, @3, @4, @5, 1)
      `,
      [
        input.codigoPersonal ?? null,
        input.nombres,
        input.apellidoPaterno,
        input.apellidoMaterno ?? null,
        input.documentoIdentidad,
        input.idNivelCargo,
      ],
    );

    const insertedId = Number(insertedRows[0]?.id);
    const personal = await this.obtenerPorId(insertedId);

    if (!personal) {
      throw errorAlConfirmarGuardado(
        'personal',
        insertedId,
        TypeOrmPersonalRepository.name,
      );
    }

    return personal;
  }

  async actualizarPersonal(
    idPersonal: number,
    input: GuardarPersonalInput,
  ): Promise<Personal> {
    const actual = await this.obtenerPorId(idPersonal);

    if (!actual) {
      throw noEncontrado(
        'personal',
        idPersonal,
        TypeOrmPersonalRepository.name,
      );
    }

    await this.assertPersonalUpsertAllowed(idPersonal, input);

    await this.dataSource.query(
      `
        UPDATE dbo.personal
        SET
          codigo_personal = @1,
          nombres = @2,
          apellido_paterno = @3,
          apellido_materno = @4,
          documento_identidad = @5,
          id_nivel_cargo = @6,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [
        idPersonal,
        input.codigoPersonal ?? null,
        input.nombres,
        input.apellidoPaterno,
        input.apellidoMaterno ?? null,
        input.documentoIdentidad,
        input.idNivelCargo,
      ],
    );

    const personal = await this.obtenerPorId(idPersonal);

    if (!personal) {
      throw errorAlConfirmarGuardado(
        'personal',
        idPersonal,
        TypeOrmPersonalRepository.name,
      );
    }

    return personal;
  }

  async desactivarPersonal(idPersonal: number): Promise<void> {
    const actual = await this.obtenerPorId(idPersonal);

    if (!actual) {
      throw noEncontrado(
        'personal',
        idPersonal,
        TypeOrmPersonalRepository.name,
      );
    }

    await this.dataSource.query(
      `
        UPDATE dbo.personal
        SET
          activo = 0,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [idPersonal],
    );
  }

  async activarPersonal(idPersonal: number): Promise<void> {
    const actual = await this.obtenerPorId(idPersonal);

    if (!actual) {
      throw noEncontrado(
        'personal',
        idPersonal,
        TypeOrmPersonalRepository.name,
      );
    }

    await this.dataSource.query(
      `
        UPDATE dbo.personal
        SET
          activo = 1,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [idPersonal],
    );
  }

  async listarAsignaciones(
    filtro: ListarAsignacionesFiltro,
  ): Promise<AsignacionConsulta[]> {
    const queryBuilder = this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacion')
      .innerJoin('personal', 'personal', 'personal.id = asignacion.id_personal')
      .leftJoin('servicio', 'servicio', 'servicio.id = asignacion.id_servicio')
      .leftJoin(
        'departamento',
        'departamento',
        'departamento.id = COALESCE(asignacion.id_departamento, servicio.id_departamento)',
      )
      .leftJoin(
        'nivel_cargo',
        'nivelCargo',
        'nivelCargo.id = personal.id_nivel_cargo',
      )
      .leftJoin(
        'tipo_contrato',
        'tipoContrato',
        'tipoContrato.id = asignacion.id_tipo_contrato',
      )
      .leftJoin(
        'carga_horaria',
        'cargaHoraria',
        'cargaHoraria.id = asignacion.id_carga_horaria',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacion.id_rol_funcional',
      )
      .leftJoin(
        'usuario',
        'usuarioLink',
        'usuarioLink.id_personal = asignacion.id_personal AND usuarioLink.activo = 1',
      )
      .select([
        'asignacion.id AS asignacion_id',
        'asignacion.id_personal AS asignacion_id_personal',
        'asignacion.id_servicio AS asignacion_id_servicio',
        'asignacion.id_departamento AS asignacion_id_departamento',
        'asignacion.id_tipo_contrato AS asignacion_id_tipo_contrato',
        'asignacion.id_carga_horaria AS asignacion_id_carga_horaria',
        'asignacion.id_rol_funcional AS asignacion_id_rol_funcional',
        'asignacion.nro_item AS asignacion_nro_item',
        'asignacion.codigo_fuente_item AS asignacion_codigo_fuente_item',
        'asignacion.tipo_asignacion AS asignacion_tipo_asignacion',
        'asignacion.fecha_inicio AS asignacion_fecha_inicio',
        'asignacion.fecha_fin AS asignacion_fecha_fin',
        'asignacion.activo AS asignacion_activo',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.documento_identidad AS personal_documento_identidad',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'nivelCargo.codigo AS nivel_cargo_codigo',
        'nivelCargo.nombre AS nivel_cargo_nombre',
        'tipoContrato.codigo AS tipo_contrato_codigo',
        'tipoContrato.nombre AS tipo_contrato_nombre',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'departamento.codigo AS departamento_codigo',
        'departamento.nombre AS departamento_nombre',
        'cargaHoraria.codigo AS carga_horaria_codigo',
        'cargaHoraria.nombre AS carga_horaria_nombre',
        'rolFuncional.codigo AS rol_funcional_codigo',
        'rolFuncional.nombre AS rol_funcional_nombre',
        'rolFuncional.es_jefatura AS rol_funcional_es_jefatura',
        'usuarioLink.id AS usuario_id',
      ]);

    this.aplicarFiltrosAsignaciones(queryBuilder, filtro);

    const rows = await getPaginatedRawMany<AsignacionRow>(
      this.dataSource,
      queryBuilder
        .orderBy('servicio.nombre', 'ASC')
        .addOrderBy('personal.apellido_paterno', 'ASC')
        .addOrderBy('personal.apellido_materno', 'ASC')
        .addOrderBy('personal.nombres', 'ASC'),
      filtro,
      'base_query.servicio_nombre ASC, base_query.personal_apellido_paterno ASC, base_query.personal_apellido_materno ASC, base_query.personal_nombres ASC',
    );

    return rows.map(mapAsignacionRow);
  }

  async contarAsignaciones(filtro: ListarAsignacionesFiltro): Promise<number> {
    const queryBuilder = this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacion')
      .innerJoin('personal', 'personal', 'personal.id = asignacion.id_personal')
      .leftJoin('servicio', 'servicio', 'servicio.id = asignacion.id_servicio')
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacion.id_rol_funcional',
      );

    this.aplicarFiltrosAsignaciones(queryBuilder, filtro);

    return queryBuilder.getCount();
  }

  private aplicarFiltrosAsignaciones(
    queryBuilder: SelectQueryBuilder<AsignacionPersonalOrmEntity>,
    filtro: ListarAsignacionesFiltro,
  ): SelectQueryBuilder<AsignacionPersonalOrmEntity> {
    if (filtro.idServicio) {
      queryBuilder.andWhere('asignacion.id_servicio = :idServicio', {
        idServicio: filtro.idServicio,
      });
    }

    if (filtro.idDepartamento) {
      queryBuilder.andWhere(
        '(asignacion.id_departamento = :idDepartamento OR servicio.id_departamento = :idDepartamento)',
        {
          idDepartamento: filtro.idDepartamento,
        },
      );
    }

    if (filtro.idPersonal) {
      queryBuilder.andWhere('asignacion.id_personal = :idPersonal', {
        idPersonal: filtro.idPersonal,
      });
    }

    if (filtro.rolFuncionalCodigo) {
      queryBuilder.andWhere('rolFuncional.codigo = :rolFuncionalCodigo', {
        rolFuncionalCodigo: filtro.rolFuncionalCodigo,
      });
    }

    if (filtro.nombre) {
      queryBuilder.andWhere(
        '(personal.nombres LIKE :nombre OR personal.apellido_paterno LIKE :nombre OR personal.apellido_materno LIKE :nombre OR personal.documento_identidad LIKE :nombre OR personal.codigo_personal LIKE :nombre)',
        { nombre: `%${filtro.nombre}%` },
      );
    }

    if (typeof filtro.activo === 'boolean') {
      queryBuilder.andWhere('asignacion.activo = :activo', {
        activo: filtro.activo,
      });
    }

    // Una asignacion activa sin servicio ni departamento (y que no es de jefatura) es un
    // estado transitorio incompleto, no un destino operativo real. El frontend siempre la
    // ocultaba filtrando en JS; se traslada la regla a SQL para que listar/contar coincidan
    // y habilitar paginacion real sin perder este comportamiento.
    queryBuilder.andWhere(
      'NOT (asignacion.activo = 1 AND asignacion.id_servicio IS NULL AND asignacion.id_departamento IS NULL AND ISNULL(rolFuncional.es_jefatura, 0) = 0)',
    );

    return queryBuilder;
  }

  async listarNivelesCargo(): Promise<NivelCargoBase[]> {
    const rows = await this.executeTypedQuery<NivelCargoRow>(`
      SELECT
        nivel.id AS nivel_id,
        nivel.codigo AS nivel_codigo,
        nivel.nombre AS nivel_nombre,
        nivel.descripcion AS nivel_descripcion,
        nivel.activo AS nivel_activo
      FROM dbo.nivel_cargo nivel
      WHERE nivel.codigo NOT IN ('ENF-JS', 'ENF-JD', 'MED-JS', 'MED-JD', 'ADM-JD')
      ORDER BY nivel.nombre ASC
    `);

    return rows.map((row) => ({
      id: Number(row.nivel_id),
      codigo: row.nivel_codigo,
      nombre: row.nivel_nombre,
      descripcion: row.nivel_descripcion,
      activo: row.nivel_activo,
    }));
  }

  async crearNivelCargo(
    input: GuardarNivelCargoInput,
  ): Promise<NivelCargoBase> {
    const rows = await this.executeTypedQuery<{ id: number | string }>(
      `
        INSERT INTO dbo.nivel_cargo (codigo, nombre, descripcion, activo)
        OUTPUT INSERTED.id AS id
        VALUES (@0, @1, @2, @3)
      `,
      [
        input.codigo.trim(),
        input.nombre.trim(),
        input.descripcion?.trim() || null,
        input.activo ?? true,
      ],
    ).catch((error: unknown) => {
      throw mapearDuplicadoCatalogo(error, input);
    });

    const id = Number(rows[0]?.id);

    return this.obtenerNivelCargoOrFail(id);
  }

  async actualizarNivelCargo(
    idNivelCargo: number,
    input: GuardarNivelCargoInput,
  ): Promise<NivelCargoBase> {
    await this.dataSource
      .query(
        `
        UPDATE dbo.nivel_cargo
        SET codigo = @1,
            nombre = @2,
            descripcion = @3,
            activo = @4
        WHERE id = @0
      `,
        [
          idNivelCargo,
          input.codigo.trim(),
          input.nombre.trim(),
          input.descripcion?.trim() || null,
          input.activo ?? true,
        ],
      )
      .catch((error: unknown) => {
        throw mapearDuplicadoCatalogo(error, input);
      });

    return this.obtenerNivelCargoOrFail(idNivelCargo);
  }

  async activarNivelCargo(idNivelCargo: number): Promise<void> {
    await this.setActivoFlag('dbo.nivel_cargo', idNivelCargo, true);
  }

  async desactivarNivelCargo(idNivelCargo: number): Promise<void> {
    await this.setActivoFlag('dbo.nivel_cargo', idNivelCargo, false);
  }

  async listarCargasHorarias(): Promise<CargaHoraria[]> {
    const rows = await this.executeTypedQuery<CargaHorariaRow>(`
      SELECT id, codigo, nombre, horas_dia_base, descripcion, activo
      FROM dbo.carga_horaria
      ORDER BY horas_dia_base DESC, nombre ASC
    `);

    return rows.map((row) => ({
      id: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      horasDiaBase: Number(row.horas_dia_base),
      descripcion: row.descripcion,
      activo: row.activo,
    }));
  }

  async crearCargaHoraria(
    input: GuardarCargaHorariaInput,
  ): Promise<CargaHoraria> {
    const rows = await this.executeTypedQuery<{ id: number | string }>(
      `
        INSERT INTO dbo.carga_horaria (codigo, nombre, horas_dia_base, descripcion, activo)
        OUTPUT INSERTED.id AS id
        VALUES (@0, @1, @2, @3, @4)
      `,
      [
        input.codigo.trim(),
        input.nombre.trim(),
        input.horasDiaBase,
        input.descripcion?.trim() || null,
        input.activo ?? true,
      ],
    ).catch((error: unknown) => {
      throw mapearDuplicadoCatalogo(error, input);
    });

    const id = Number(rows[0]?.id);

    return this.obtenerCargaHorariaOrFail(id);
  }

  async actualizarCargaHoraria(
    idCargaHoraria: number,
    input: GuardarCargaHorariaInput,
  ): Promise<CargaHoraria> {
    await this.dataSource
      .query(
        `
        UPDATE dbo.carga_horaria
        SET codigo = @1,
            nombre = @2,
            horas_dia_base = @3,
            descripcion = @4,
            activo = @5
        WHERE id = @0
      `,
        [
          idCargaHoraria,
          input.codigo.trim(),
          input.nombre.trim(),
          input.horasDiaBase,
          input.descripcion?.trim() || null,
          input.activo ?? true,
        ],
      )
      .catch((error: unknown) => {
        throw mapearDuplicadoCatalogo(error, input);
      });

    return this.obtenerCargaHorariaOrFail(idCargaHoraria);
  }

  async activarCargaHoraria(idCargaHoraria: number): Promise<void> {
    await this.setActivoFlag('dbo.carga_horaria', idCargaHoraria, true);
  }

  async desactivarCargaHoraria(idCargaHoraria: number): Promise<void> {
    await this.setActivoFlag('dbo.carga_horaria', idCargaHoraria, false);
  }

  async listarTiposContrato(): Promise<TipoContrato[]> {
    const rows = await this.executeTypedQuery<TipoContratoRow>(`
      SELECT id, codigo, nombre, descripcion, activo
      FROM dbo.tipo_contrato
      ORDER BY nombre ASC
    `);

    return rows.map(mapTipoContratoRow);
  }

  async obtenerTipoContratoPorId(
    idTipoContrato: number,
  ): Promise<TipoContrato | null> {
    const rows = await this.executeTypedQuery<TipoContratoRow>(
      `
        SELECT id, codigo, nombre, descripcion, activo
        FROM dbo.tipo_contrato
        WHERE id = @0
      `,
      [idTipoContrato],
    );

    return rows[0] ? mapTipoContratoRow(rows[0]) : null;
  }

  async existeTipoContratoConCodigo(codigo: string): Promise<boolean> {
    const rows = await this.executeTypedQuery<{ id: number | string }>(
      `
        SELECT TOP 1 id
        FROM dbo.tipo_contrato
        WHERE UPPER(codigo) = UPPER(@0)
      `,
      [codigo],
    );

    return rows.length > 0;
  }

  async crearTipoContrato(
    input: CrearTipoContratoInput,
  ): Promise<TipoContrato> {
    const rows = await this.executeTypedQuery<TipoContratoRow>(
      `
        INSERT INTO dbo.tipo_contrato (codigo, nombre, descripcion, activo)
        OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.nombre,
               INSERTED.descripcion, INSERTED.activo
        VALUES (@0, @1, @2, 1)
      `,
      [input.codigo, input.nombre, input.descripcion],
    );

    return mapTipoContratoRow(rows[0]);
  }

  async actualizarTipoContrato(
    idTipoContrato: number,
    input: ActualizarTipoContratoInput,
  ): Promise<TipoContrato> {
    const rows = await this.executeTypedQuery<TipoContratoRow>(
      `
        UPDATE dbo.tipo_contrato
        SET nombre = @1,
            descripcion = @2,
            updated_at = GETUTCDATE()
        OUTPUT INSERTED.id, INSERTED.codigo, INSERTED.nombre,
               INSERTED.descripcion, INSERTED.activo
        WHERE id = @0
      `,
      [idTipoContrato, input.nombre, input.descripcion],
    );

    return mapTipoContratoRow(rows[0]);
  }

  async cambiarEstadoTipoContrato(
    idTipoContrato: number,
    activo: boolean,
  ): Promise<void> {
    await this.dataSource.query(
      `
        UPDATE dbo.tipo_contrato
        SET activo = @1,
            updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [idTipoContrato, activo],
    );
  }

  async listarRolesFuncionales(): Promise<RolFuncionalBase[]> {
    const rows = await this.executeTypedQuery<RolFuncionalRow>(`
      SELECT id, codigo, nombre, alcance_organizativo, es_jefatura, activo
      FROM dbo.rol_funcional
      ORDER BY es_jefatura DESC, nombre ASC
    `);

    return rows.map((row) => ({
      id: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      alcanceOrganizativo: row.alcance_organizativo,
      esJefatura: row.es_jefatura,
      activo: row.activo,
    }));
  }

  async obtenerRolFuncionalPorId(
    idRolFuncional: number,
  ): Promise<RolFuncionalBase | null> {
    const row = (
      await this.executeTypedQuery<RolFuncionalRow>(
        `
          SELECT id, codigo, nombre, alcance_organizativo, es_jefatura, activo
          FROM dbo.rol_funcional
          WHERE id = @0
        `,
        [idRolFuncional],
      )
    )[0];

    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      alcanceOrganizativo: row.alcance_organizativo,
      esJefatura: row.es_jefatura,
      activo: row.activo,
    };
  }

  async existePlanificacionAbiertaParaAsignacion(
    idAsignacion: number,
  ): Promise<boolean> {
    return (
      (await this.obtenerBloqueoPlanificacionAbiertaParaAsignacion(
        idAsignacion,
      )) !== null
    );
  }

  async obtenerConflictoPlanificacionAbiertaParaAsignacion(
    idAsignacion: number,
  ): Promise<ConflictoPlanificacionAsignacion | null> {
    const conflicto =
      await this.obtenerBloqueoPlanificacionAbiertaParaAsignacion(idAsignacion);

    if (!conflicto) return null;

    return {
      idPlanificacion: Number(conflicto.planificacion_id),
      unidadNombre: conflicto.unidad_nombre,
      periodo: formatPeriodoPlanificacion(conflicto.planificacion_fecha_inicio),
      estado: conflicto.planificacion_estado,
    };
  }

  private async obtenerBloqueoPlanificacionAbiertaParaAsignacion(
    idAsignacion: number,
  ): Promise<BloqueoPlanificacionAbiertaRow | null> {
    // La planificacion es de servicio O de departamento, nunca ambas (XOR,
    // migracion 026/035) — el INNER JOIN a servicio quedaba mal para una
    // planificacion departamental (id_servicio NULL nunca matchea servicio.id),
    // haciendo que este chequeo nunca detectara conflicto para esas unidades.
    // LEFT JOIN a ambos catalogos y COALESCE resuelve el nombre sin importar
    // el alcance (ver docs/database/decisiones-tecnicas.md seccion 48).
    const rows = await this.executeTypedQuery<BloqueoPlanificacionAbiertaRow>(
      `
        SELECT TOP 1
          planificacion.id AS planificacion_id,
          planificacion.fecha_inicio AS planificacion_fecha_inicio,
          planificacion.fecha_fin AS planificacion_fecha_fin,
          planificacion.estado AS planificacion_estado,
          COALESCE(servicio.nombre, departamento.nombre) AS unidad_nombre
        FROM dbo.rol_turno rolTurno
        INNER JOIN dbo.planificacion planificacion
          ON planificacion.id = rolTurno.id_planificacion
        LEFT JOIN dbo.servicio servicio
          ON servicio.id = planificacion.id_servicio
        LEFT JOIN dbo.departamento departamento
          ON departamento.id = planificacion.id_departamento
        WHERE rolTurno.id_asignacion_personal = @0
          AND planificacion.activo = 1
          AND planificacion.estado IN ('BORRADOR', 'REVISION', 'APROBADA')
          AND planificacion.fecha_fin >= CAST(GETDATE() AS DATE)
          AND (
            rolTurno.id_turno IS NOT NULL
            OR rolTurno.id_incidencia_personal IS NOT NULL
          )
        ORDER BY planificacion.fecha_inicio ASC, planificacion.id ASC
      `,
      [idAsignacion],
    );

    return rows[0] ?? null;
  }

  // Limpia TODA la actividad operativa de la asignacion (turnos, incidencias y
  // observaciones mensuales) en planificaciones que todavia no estan CERRADA
  // (decision 2026-07-09, corrige la interpretacion original de la seccion 38,
  // ver docs/database/decisiones-tecnicas.md seccion 46): la persona ya no
  // trabaja en esa unidad, asi que no debe quedar registrada en ninguna
  // planificacion abierta, sin distinguir si el dia ya paso o no. Una
  // planificacion CERRADA nunca se toca aqui (excluida de estado IN (...)) —
  // esa si queda congelada para la historia, en `planificacion_historial`.
  private async regularizarPlanificacionesAbiertasDeAsignacion(
    runner: QueryRunner,
    idAsignacion: number,
  ): Promise<void> {
    // dbo.observacion (observaciones diarias por celda) se elimino en la
    // migracion 041 (docs/database/decisiones-tecnicas.md seccion 44): ya no
    // hay actividad diaria por celda que limpiar aparte de rol_turno.
    await runner.query(
      `
        DELETE observacionMensual
        FROM dbo.observacion_mensual observacionMensual
        INNER JOIN dbo.planificacion planificacion
          ON planificacion.id = observacionMensual.id_planificacion
        WHERE observacionMensual.id_asignacion_personal = @0
          AND planificacion.activo = 1
          AND planificacion.estado IN ('BORRADOR', 'REVISION', 'APROBADA')
      `,
      [idAsignacion],
    );

    await runner.query(
      `
        DELETE rolTurno
        FROM dbo.rol_turno rolTurno
        INNER JOIN dbo.planificacion planificacion
          ON planificacion.id = rolTurno.id_planificacion
        WHERE rolTurno.id_asignacion_personal = @0
          AND planificacion.activo = 1
          AND planificacion.estado IN ('BORRADOR', 'REVISION', 'APROBADA')
          AND (
            rolTurno.id_turno IS NOT NULL
            OR rolTurno.id_incidencia_personal IS NOT NULL
          )
      `,
      [idAsignacion],
    );
  }

  private async listarHistorialAsignaciones(
    idPersonal: number,
  ): Promise<HistorialAsignacionConsulta[]> {
    const rows = await this.executeTypedQuery<HistorialRow>(
      `
        SELECT
          historial.id AS historial_id,
          historial.id_asignacion_personal AS historial_id_asignacion_personal,
          historial.fecha_evento AS historial_fecha_evento,
          historial.tipo_evento AS historial_tipo_evento,
          historial.motivo AS historial_motivo,
          asignacion.fecha_inicio AS asignacion_fecha_inicio,
          asignacion.fecha_fin AS asignacion_fecha_fin,
          servicioOrigen.id AS servicio_origen_id,
          servicioOrigen.codigo AS servicio_origen_codigo,
          servicioOrigen.nombre AS servicio_origen_nombre,
          servicioDestino.id AS servicio_destino_id,
          servicioDestino.codigo AS servicio_destino_codigo,
          servicioDestino.nombre AS servicio_destino_nombre,
          departamentoOrigen.id AS departamento_origen_id,
          departamentoOrigen.codigo AS departamento_origen_codigo,
          departamentoOrigen.nombre AS departamento_origen_nombre,
          departamentoDestino.id AS departamento_destino_id,
          departamentoDestino.codigo AS departamento_destino_codigo,
          departamentoDestino.nombre AS departamento_destino_nombre,
          rolFuncionalOrigen.id AS rol_funcional_origen_id,
          rolFuncionalOrigen.codigo AS rol_funcional_origen_codigo,
          rolFuncionalOrigen.nombre AS rol_funcional_origen_nombre,
          rolFuncionalDestino.id AS rol_funcional_destino_id,
          rolFuncionalDestino.codigo AS rol_funcional_destino_codigo,
          rolFuncionalDestino.nombre AS rol_funcional_destino_nombre,
          usuario.id AS usuario_id,
          usuario.username AS usuario_username
        FROM dbo.historial_asignacion historial
        INNER JOIN dbo.asignacion_personal asignacion ON asignacion.id = historial.id_asignacion_personal
        LEFT JOIN dbo.servicio servicioOrigen ON servicioOrigen.id = historial.id_servicio_origen
        LEFT JOIN dbo.servicio servicioDestino ON servicioDestino.id = historial.id_servicio_destino
        LEFT JOIN dbo.departamento departamentoOrigen ON departamentoOrigen.id = historial.id_departamento_origen
        LEFT JOIN dbo.departamento departamentoDestino ON departamentoDestino.id = historial.id_departamento_destino
        LEFT JOIN dbo.rol_funcional rolFuncionalOrigen ON rolFuncionalOrigen.id = historial.id_rol_funcional_origen
        LEFT JOIN dbo.rol_funcional rolFuncionalDestino ON rolFuncionalDestino.id = historial.id_rol_funcional_destino
        LEFT JOIN dbo.usuario usuario ON usuario.id = historial.id_usuario
        WHERE asignacion.id_personal = @0
        ORDER BY historial.fecha_evento DESC, historial.id DESC
      `,
      [idPersonal],
    );

    return rows.map((row) => ({
      id: Number(row.historial_id),
      idAsignacionPersonal: Number(row.historial_id_asignacion_personal),
      fechaEvento: new Date(row.historial_fecha_evento),
      tipoEvento: row.historial_tipo_evento,
      fechaInicioAsignacion: new Date(row.asignacion_fecha_inicio),
      fechaFinAsignacion: row.asignacion_fecha_fin
        ? new Date(row.asignacion_fecha_fin)
        : null,
      servicioOrigen: {
        id:
          row.servicio_origen_id === null
            ? null
            : Number(row.servicio_origen_id),
        codigo: row.servicio_origen_codigo,
        nombre: row.servicio_origen_nombre,
      },
      servicioDestino: {
        id:
          row.servicio_destino_id === null
            ? null
            : Number(row.servicio_destino_id),
        codigo: row.servicio_destino_codigo,
        nombre: row.servicio_destino_nombre,
      },
      departamentoOrigen: {
        id:
          row.departamento_origen_id === null
            ? null
            : Number(row.departamento_origen_id),
        codigo: row.departamento_origen_codigo,
        nombre: row.departamento_origen_nombre,
      },
      departamentoDestino: {
        id:
          row.departamento_destino_id === null
            ? null
            : Number(row.departamento_destino_id),
        codigo: row.departamento_destino_codigo,
        nombre: row.departamento_destino_nombre,
      },
      rolFuncionalOrigen: {
        id:
          row.rol_funcional_origen_id === null
            ? null
            : Number(row.rol_funcional_origen_id),
        codigo: row.rol_funcional_origen_codigo,
        nombre: row.rol_funcional_origen_nombre,
      },
      rolFuncionalDestino: {
        id:
          row.rol_funcional_destino_id === null
            ? null
            : Number(row.rol_funcional_destino_id),
        codigo: row.rol_funcional_destino_codigo,
        nombre: row.rol_funcional_destino_nombre,
      },
      motivo: row.historial_motivo,
      usuario:
        row.usuario_id === null
          ? null
          : {
              id: Number(row.usuario_id),
              username: row.usuario_username,
            },
    }));
  }

  private async listarAsignacionesPorIds(
    idsAsignacion: number[],
  ): Promise<AsignacionConsulta[]> {
    if (idsAsignacion.length === 0) {
      return [];
    }

    const queryBuilder = this.dataSource
      .getRepository(AsignacionPersonalOrmEntity)
      .createQueryBuilder('asignacion')
      .innerJoin('personal', 'personal', 'personal.id = asignacion.id_personal')
      .leftJoin('servicio', 'servicio', 'servicio.id = asignacion.id_servicio')
      .leftJoin(
        'departamento',
        'departamento',
        'departamento.id = COALESCE(asignacion.id_departamento, servicio.id_departamento)',
      )
      .leftJoin(
        'nivel_cargo',
        'nivelCargo',
        'nivelCargo.id = personal.id_nivel_cargo',
      )
      .leftJoin(
        'tipo_contrato',
        'tipoContrato',
        'tipoContrato.id = asignacion.id_tipo_contrato',
      )
      .leftJoin(
        'carga_horaria',
        'cargaHoraria',
        'cargaHoraria.id = asignacion.id_carga_horaria',
      )
      .leftJoin(
        'rol_funcional',
        'rolFuncional',
        'rolFuncional.id = asignacion.id_rol_funcional',
      )
      .leftJoin(
        'usuario',
        'usuarioLink',
        'usuarioLink.id_personal = asignacion.id_personal AND usuarioLink.activo = 1',
      )
      .select([
        'asignacion.id AS asignacion_id',
        'asignacion.id_personal AS asignacion_id_personal',
        'asignacion.id_servicio AS asignacion_id_servicio',
        'asignacion.id_departamento AS asignacion_id_departamento',
        'asignacion.id_tipo_contrato AS asignacion_id_tipo_contrato',
        'asignacion.id_carga_horaria AS asignacion_id_carga_horaria',
        'asignacion.id_rol_funcional AS asignacion_id_rol_funcional',
        'asignacion.nro_item AS asignacion_nro_item',
        'asignacion.codigo_fuente_item AS asignacion_codigo_fuente_item',
        'asignacion.tipo_asignacion AS asignacion_tipo_asignacion',
        'asignacion.fecha_inicio AS asignacion_fecha_inicio',
        'asignacion.fecha_fin AS asignacion_fecha_fin',
        'asignacion.activo AS asignacion_activo',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.documento_identidad AS personal_documento_identidad',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
        'nivelCargo.codigo AS nivel_cargo_codigo',
        'nivelCargo.nombre AS nivel_cargo_nombre',
        'tipoContrato.codigo AS tipo_contrato_codigo',
        'tipoContrato.nombre AS tipo_contrato_nombre',
        'servicio.codigo AS servicio_codigo',
        'servicio.nombre AS servicio_nombre',
        'departamento.codigo AS departamento_codigo',
        'departamento.nombre AS departamento_nombre',
        'cargaHoraria.codigo AS carga_horaria_codigo',
        'cargaHoraria.nombre AS carga_horaria_nombre',
        'rolFuncional.codigo AS rol_funcional_codigo',
        'rolFuncional.nombre AS rol_funcional_nombre',
        'rolFuncional.es_jefatura AS rol_funcional_es_jefatura',
        'usuarioLink.id AS usuario_id',
      ])
      .where('asignacion.id IN (:...idsAsignacion)', {
        idsAsignacion,
      });

    const rows = await queryBuilder
      .orderBy('asignacion.id', 'ASC')
      .getRawMany<AsignacionRow>();

    return rows.map(mapAsignacionRow);
  }

  private async buildAssignmentContext(
    runner: QueryRunner,
    input: Pick<
      GuardarAsignacionInput,
      | 'idPersonal'
      | 'idServicio'
      | 'idDepartamento'
      | 'idTipoContrato'
      | 'idRolFuncional'
      | 'idCargaHoraria'
    >,
  ): Promise<AssignmentContext> {
    const personalRow = (await runner.query(
      `
        SELECT personal.id, personal.activo
        FROM dbo.personal personal
        WHERE personal.id = @0
      `,
      [input.idPersonal],
    )) as Array<{
      id: number | string;
      activo: boolean;
    }>;

    if (personalRow.length === 0) {
      throw noEncontrado(
        'personal',
        input.idPersonal,
        TypeOrmPersonalRepository.name,
      );
    }

    const servicioRow =
      input.idServicio === undefined
        ? null
        : ((
            (await runner.query(
              `
              SELECT id, id_departamento, nombre, activo
              FROM dbo.servicio
              WHERE id = @0
            `,
              [input.idServicio],
            )) as Array<{
              id: number | string;
              id_departamento: number | string;
              nombre: string;
              activo: boolean;
            }>
          )[0] ?? null);

    if (input.idServicio !== undefined && !servicioRow) {
      throw noEncontrado(
        'servicio',
        input.idServicio,
        TypeOrmPersonalRepository.name,
      );
    }

    const idDepartamentoResuelto =
      input.idDepartamento ??
      (servicioRow ? Number(servicioRow.id_departamento) : undefined);

    if (!idDepartamentoResuelto) {
      throw new BadRequestException(
        'Elige al menos un servicio o un departamento para la asignacion.',
      );
    }

    const departamentoRow =
      (
        (await runner.query(
          `
        SELECT id, nombre, activo
        FROM dbo.departamento
        WHERE id = @0
      `,
          [idDepartamentoResuelto],
        )) as Array<{
          id: number | string;
          nombre: string;
          activo: boolean;
        }>
      )[0] ?? null;

    if (!departamentoRow) {
      throw noEncontrado(
        'departamento',
        idDepartamentoResuelto,
        TypeOrmPersonalRepository.name,
      );
    }

    if (
      servicioRow &&
      Number(servicioRow.id_departamento) !== idDepartamentoResuelto
    ) {
      throw new BadRequestException(
        `El servicio "${servicioRow.nombre}" no pertenece al departamento "${departamentoRow.nombre}".`,
      );
    }

    await this.assertCatalogExists(
      runner,
      'tipo_contrato',
      'tipoContrato',
      input.idTipoContrato,
    );
    await this.assertCatalogExists(
      runner,
      'rol_funcional',
      'rolFuncional',
      input.idRolFuncional,
    );

    await this.assertCatalogExists(
      runner,
      'carga_horaria',
      'cargaHoraria',
      input.idCargaHoraria,
    );

    return {
      idServicio: servicioRow ? Number(servicioRow.id) : null,
      idDepartamento: idDepartamentoResuelto,
    };
  }

  private async assertCanPersistAssignment(
    runner: QueryRunner,
    idAsignacionActual: number | null,
    context: AssignmentContext & {
      idPersonal: number;
      idTipoContrato: number;
      idCargaHoraria: number;
      idRolFuncional: number;
      nroItem?: string;
      tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
      fechaInicio: string;
      fechaFin?: string | null;
    },
  ): Promise<void> {
    if (
      context.fechaFin &&
      context.fechaFin.slice(0, 10) < context.fechaInicio.slice(0, 10)
    ) {
      throw new BadRequestException(
        'La fecha de cierre no puede ser anterior a la fecha de inicio. Revisa las fechas.',
      );
    }

    const duplicate =
      (
        (await runner.query(
          `
        SELECT TOP 1 id
        FROM dbo.asignacion_personal
        WHERE id_personal = @0
          AND (
            (id_servicio = @1)
            OR (id_servicio IS NULL AND @1 IS NULL)
          )
          AND (
            (id_departamento = @2)
            OR (id_departamento IS NULL AND @2 IS NULL)
          )
          AND activo = 1
          AND (@3 IS NULL OR id <> @3)
      `,
          [
            context.idPersonal,
            context.idServicio,
            context.idDepartamento,
            idAsignacionActual,
          ],
        )) as Array<{ id: number | string }>
      )[0] ?? null;

    if (duplicate) {
      throw new ConflictException(
        'Esta persona ya tiene una asignacion activa en el mismo servicio o departamento.',
      );
    }

    if (context.tipoAsignacion === 'PRINCIPAL') {
      const principalDuplicada =
        (
          (await runner.query(
            `
          SELECT TOP 1 id
          FROM dbo.asignacion_personal
          WHERE id_personal = @0
            AND es_principal = 1
            AND activo = 1
            AND (@1 IS NULL OR id <> @1)
        `,
            [context.idPersonal, idAsignacionActual],
          )) as Array<{ id: number | string }>
        )[0] ?? null;

      if (principalDuplicada) {
        throw new ConflictException(
          'Esta persona ya tiene una asignacion principal activa. Solo puede tener una asignacion principal a la vez.',
        );
      }
    }

    if (context.tipoAsignacion === 'SECUNDARIA') {
      const principalActiva =
        (
          (await runner.query(
            `
          SELECT TOP 1 id
          FROM dbo.asignacion_personal
          WHERE id_personal = @0
            AND tipo_asignacion = 'PRINCIPAL'
            AND activo = 1
            AND (@1 IS NULL OR id <> @1)
        `,
            [context.idPersonal, idAsignacionActual],
          )) as Array<{ id: number | string }>
        )[0] ?? null;

      if (!principalActiva) {
        throw new ConflictException(
          'Esta persona no tiene una asignacion principal activa. Una asignacion secundaria necesita una principal vigente.',
        );
      }
    }

    const rolRow =
      (
        (await runner.query(
          `
        SELECT codigo, es_jefatura
        FROM dbo.rol_funcional
        WHERE id = @0
      `,
          [context.idRolFuncional],
        )) as Array<{ codigo: string; es_jefatura: boolean }>
      )[0] ?? null;

    if (!rolRow) {
      throw new NotFoundException(
        'El rol funcional seleccionado ya no existe o no esta disponible. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    // Una SECUNDARIA nunca puede tener un rol de jefatura (docs/database/
    // decisiones-tecnicas.md seccion 52): jefatura es un concepto ligado a la
    // asignacion PRINCIPAL de la persona — la activacion/desactivacion de su
    // usuario del sistema se sincroniza mirando una sola asignacion a la vez
    // (crear/actualizar/cerrar-asignacion.use-case.ts), asi que una persona
    // con dos asignaciones de jefatura simultaneas (una PRINCIPAL real, una
    // SECUNDARIA por error) puede terminar con su usuario desactivado por
    // error al cerrar la secundaria, aunque su jefatura real siga activa.
    if (
      context.tipoAsignacion === 'SECUNDARIA' &&
      Boolean(rolRow.es_jefatura)
    ) {
      throw new ConflictException(
        'Una asignacion secundaria no puede tener un rol de jefatura. La jefatura solo se gestiona desde la asignacion principal.',
      );
    }

    if (rolRow.codigo === 'JEFE_SERVICIO') {
      if (!context.idServicio) {
        throw new BadRequestException(
          'Una asignacion de Jefe de Servicio requiere un servicio asociado.',
        );
      }

      const jefaturaServicio =
        (
          (await runner.query(
            `
          SELECT TOP 1
            ap.id,
            p.nombres AS personal_nombres,
            p.apellido_paterno AS personal_apellido_paterno,
            s.nombre AS servicio_nombre
          FROM dbo.asignacion_personal ap
          JOIN dbo.personal p ON p.id = ap.id_personal
          JOIN dbo.servicio s ON s.id = ap.id_servicio
          WHERE ap.id_servicio = @0
            AND ap.id_rol_funcional = @1
            AND ap.activo = 1
            AND (@2 IS NULL OR ap.id <> @2)
        `,
            [context.idServicio, context.idRolFuncional, idAsignacionActual],
          )) as Array<{
            id: number | string;
            personal_nombres: string;
            personal_apellido_paterno: string;
            servicio_nombre: string;
          }>
        )[0] ?? null;

      if (jefaturaServicio) {
        const nombreJefe = `${jefaturaServicio.personal_apellido_paterno}, ${jefaturaServicio.personal_nombres}`;
        throw new ConflictException(
          `El servicio "${jefaturaServicio.servicio_nombre}" ya tiene un Jefe de Servicio activo: ${nombreJefe}. Para asignar un nuevo jefe, primero retira la jefatura actual (edita su asignacion con un rol operativo).`,
        );
      }
    }

    if (rolRow.codigo === 'JEFE_DEPARTAMENTO') {
      const jefaturaDepartamento =
        (
          (await runner.query(
            `
          SELECT TOP 1
            ap.id,
            p.nombres AS personal_nombres,
            p.apellido_paterno AS personal_apellido_paterno,
            d.nombre AS departamento_nombre
          FROM dbo.asignacion_personal ap
          JOIN dbo.personal p ON p.id = ap.id_personal
          JOIN dbo.departamento d ON d.id = ap.id_departamento
          WHERE ap.id_departamento = @0
            AND ap.id_rol_funcional = @1
            AND ap.activo = 1
            AND (@2 IS NULL OR ap.id <> @2)
        `,
            [
              context.idDepartamento,
              context.idRolFuncional,
              idAsignacionActual,
            ],
          )) as Array<{
            id: number | string;
            personal_nombres: string;
            personal_apellido_paterno: string;
            departamento_nombre: string;
          }>
        )[0] ?? null;

      if (jefaturaDepartamento) {
        const nombreJefe = `${jefaturaDepartamento.personal_apellido_paterno}, ${jefaturaDepartamento.personal_nombres}`;
        throw new ConflictException(
          `El departamento "${jefaturaDepartamento.departamento_nombre}" ya tiene un Jefe de Departamento activo: ${nombreJefe}. Para asignar un nuevo jefe, primero retira la jefatura actual (edita su asignacion con un rol operativo).`,
        );
      }
    }
  }

  private async resolveAssignmentNroItem(
    runner: QueryRunner,
    idPersonal: number,
    requestedNroItem: string | null,
  ): Promise<string | null> {
    const rows = (await runner.query(
      `
        SELECT DISTINCT nro_item
        FROM dbo.asignacion_personal
        WHERE id_personal = @0
          AND nro_item IS NOT NULL
          AND LTRIM(RTRIM(nro_item)) <> ''
      `,
      [idPersonal],
    )) as Array<{ nro_item: string }>;

    const nroItems = rows
      .map((row) => row.nro_item?.trim())
      .filter((value): value is string => Boolean(value));

    const normalizedRequested = requestedNroItem?.trim() || null;

    if (nroItems.length > 1) {
      throw new ConflictException(
        `${capitalizarInicio(await this.obtenerNombrePersonal(runner, idPersonal))} tiene mas de un Nro. ITEM en su historial. Corrige ese dato administrativo antes de continuar.`,
      );
    }

    if (nroItems.length === 1) {
      if (normalizedRequested && normalizedRequested !== nroItems[0]) {
        throw new ConflictException(
          `El Nro. ITEM de ${await this.obtenerNombrePersonal(runner, idPersonal)} ya esta definido (${nroItems[0]}) y no puede modificarse desde asignaciones.`,
        );
      }

      return nroItems[0];
    }

    return normalizedRequested;
  }

  private async obtenerNombrePersonal(
    runner: QueryRunner,
    idPersonal: number,
  ): Promise<string> {
    const row = (
      (await runner.query(
        'SELECT TOP 1 nombres, apellido_paterno, apellido_materno FROM dbo.personal WHERE id = @0',
        [idPersonal],
      )) as PersonalNombreRow[]
    )[0];

    return nombreCompletoPersona(row) ?? 'la persona seleccionada';
  }

  private async assertCatalogExists(
    runner: QueryRunner,
    tableName: string,
    entidad: EntidadMensaje,
    id: number,
  ): Promise<void> {
    const row =
      (
        (await runner.query(
          `SELECT TOP 1 id FROM dbo.${tableName} WHERE id = @0`,
          [id],
        )) as Array<{ id: number | string }>
      )[0] ?? null;

    if (!row) {
      throw noEncontrado(entidad, id, TypeOrmPersonalRepository.name);
    }
  }

  private async insertHistorialAsignacion(
    runner: QueryRunner,
    input: HistorialPersistInput,
  ): Promise<void> {
    await runner.query(
      `
        INSERT INTO dbo.historial_asignacion
        (
          id_asignacion_personal,
          tipo_evento,
          id_servicio_origen,
          id_servicio_destino,
          id_departamento_origen,
          id_departamento_destino,
          id_rol_funcional_origen,
          id_rol_funcional_destino,
          id_usuario,
          motivo
        )
        VALUES
        (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9)
      `,
      [
        input.idAsignacionPersonal,
        input.tipoEvento,
        input.idServicioOrigen,
        input.idServicioDestino,
        input.idDepartamentoOrigen,
        input.idDepartamentoDestino,
        input.idRolFuncionalOrigen,
        input.idRolFuncionalDestino,
        input.idUsuario,
        input.motivo ?? null,
      ],
    );
  }

  private async getAsignacionRowById(
    runner: QueryRunner,
    idAsignacion: number,
  ): Promise<AsignacionPersistRow | null> {
    const rows = (await runner.query(
      `
        SELECT
          id,
          id_personal,
          id_servicio,
          id_departamento,
          id_tipo_contrato,
          id_carga_horaria,
          id_rol_funcional,
          nro_item,
          codigo_fuente_item,
          tipo_asignacion,
          es_principal,
          fecha_inicio,
          fecha_fin,
          activo
        FROM dbo.asignacion_personal
        WHERE id = @0
      `,
      [idAsignacion],
    )) as AsignacionPersistRow[];

    return rows[0] ?? null;
  }

  // Reemplazado por cerrarSecundariasDePersonal. Eliminado: ya no se crea asignacion
  // departamental automatica al cerrar — la persona queda sin asignacion activa en ese caso.
  private async cerrarSecundariasDePersonal(
    runner: QueryRunner,
    idPersonal: number,
    fechaFin: string,
    idUsuarioOperacion: number,
    motivo?: string | null,
  ): Promise<void> {
    const secundarias = (await runner.query(
      `
        SELECT id, id_servicio, id_departamento, id_tipo_contrato, id_rol_funcional
        FROM dbo.asignacion_personal
        WHERE id_personal = @0
          AND tipo_asignacion = 'SECUNDARIA'
          AND activo = 1
      `,
      [idPersonal],
    )) as Array<{
      id: number;
      id_servicio: number | null;
      id_departamento: number | null;
      id_tipo_contrato: number;
      id_rol_funcional: number | null;
    }>;

    for (const sec of secundarias) {
      await runner.query(
        `
          UPDATE dbo.asignacion_personal
          SET fecha_fin = @1, activo = 0, updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [sec.id, fechaFin],
      );

      await this.insertHistorialAsignacion(runner, {
        idAsignacionPersonal: sec.id,
        tipoEvento: 'CIERRE',
        idServicioOrigen: sec.id_servicio,
        idServicioDestino: null,
        idDepartamentoOrigen: sec.id_departamento,
        idDepartamentoDestino: null,
        idRolFuncionalOrigen: sec.id_rol_funcional,
        idRolFuncionalDestino: null,
        idUsuario: idUsuarioOperacion,
        motivo:
          motivo ??
          'Cierre automatico de asignacion secundaria al cerrar la principal.',
      });

      // La persona ya no cubre esta unidad tampoco (docs/database/decisiones-tecnicas.md
      // seccion 44/46): limpiar la actividad de la secundaria igual que se
      // limpia la de la principal, sin pedir una confirmacion aparte — cerrar la
      // principal con "cerrarSecundariasActivas" ya es la decision explicita del
      // actor de retirar a la persona de todas sus unidades.
      await this.regularizarPlanificacionesAbiertasDeAsignacion(runner, sec.id);
    }
  }

  private async executeTypedQuery<TRow>(
    sql: string,
    parameters?: unknown[],
  ): Promise<TRow[]> {
    const rowsUnknown: unknown = await this.dataSource.query(sql, parameters);

    return rowsUnknown as TRow[];
  }

  private async executeTypedRunnerQuery<TRow>(
    runner: QueryRunner,
    sql: string,
    parameters?: unknown[],
  ): Promise<TRow[]> {
    const rowsUnknown: unknown = await runner.query(sql, parameters);

    return rowsUnknown as TRow[];
  }

  private async assertPersonalUpsertAllowed(
    idPersonalActual: number | null,
    input: GuardarPersonalInput,
  ): Promise<void> {
    await this.assertNivelCargoExists(input.idNivelCargo);

    const duplicatedDocument = (
      await this.executeTypedQuery<PersonalNombreRow>(
        `
          SELECT TOP 1 id, nombres, apellido_paterno, apellido_materno
          FROM dbo.personal
          WHERE documento_identidad = @0
            AND (@1 IS NULL OR id <> @1)
        `,
        [input.documentoIdentidad, idPersonalActual],
      )
    )[0];

    if (duplicatedDocument) {
      throw new ConflictException(
        `El documento ${input.documentoIdentidad} ya esta registrado para ${nombreCompletoPersona(duplicatedDocument) ?? 'otra persona'}.`,
      );
    }

    if (input.codigoPersonal) {
      const duplicatedCode = (
        await this.executeTypedQuery<PersonalNombreRow>(
          `
            SELECT TOP 1 id, nombres, apellido_paterno, apellido_materno
            FROM dbo.personal
            WHERE codigo_personal = @0
              AND (@1 IS NULL OR id <> @1)
          `,
          [input.codigoPersonal, idPersonalActual],
        )
      )[0];

      if (duplicatedCode) {
        throw new ConflictException(
          `El codigo ${input.codigoPersonal} ya esta registrado para ${nombreCompletoPersona(duplicatedCode) ?? 'otra persona'}.`,
        );
      }
    }
  }

  private async assertNivelCargoExists(idNivelCargo: number): Promise<void> {
    const row = (
      await this.executeTypedQuery<{ id: number | string }>(
        `SELECT TOP 1 id FROM dbo.nivel_cargo WHERE id = @0`,
        [idNivelCargo],
      )
    )[0];

    if (!row) {
      throw noEncontrado(
        'nivelCargo',
        idNivelCargo,
        TypeOrmPersonalRepository.name,
      );
    }
  }

  private async getNextId(tableName: string): Promise<number> {
    const row = (
      await this.executeTypedQuery<{ nextId: number | string }>(
        `SELECT ISNULL(MAX(id), 0) + 1 AS nextId FROM ${tableName}`,
      )
    )[0];

    return Number(row?.nextId || 1);
  }

  private async setActivoFlag(
    tableName: string,
    id: number,
    activo: boolean,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE ${tableName} SET activo = @1 WHERE id = @0`,
      [id, activo],
    );
  }

  private async obtenerNivelCargoOrFail(
    idNivelCargo: number,
  ): Promise<NivelCargoBase> {
    const row = (
      await this.executeTypedQuery<NivelCargoRow>(
        `
          SELECT TOP 1
            nivel.id AS nivel_id,
            nivel.codigo AS nivel_codigo,
            nivel.nombre AS nivel_nombre,
            nivel.descripcion AS nivel_descripcion,
            nivel.activo AS nivel_activo
          FROM dbo.nivel_cargo nivel
          WHERE nivel.id = @0
        `,
        [idNivelCargo],
      )
    )[0];

    if (!row) {
      throw noEncontrado(
        'nivelCargo',
        idNivelCargo,
        TypeOrmPersonalRepository.name,
      );
    }

    return {
      id: Number(row.nivel_id),
      codigo: row.nivel_codigo,
      nombre: row.nivel_nombre,
      descripcion: row.nivel_descripcion,
      activo: row.nivel_activo,
    };
  }

  private async obtenerCargaHorariaOrFail(
    idCargaHoraria: number,
  ): Promise<CargaHoraria> {
    const row = (
      await this.executeTypedQuery<CargaHorariaRow>(
        `
          SELECT TOP 1 id, codigo, nombre, horas_dia_base, descripcion, activo
          FROM dbo.carga_horaria
          WHERE id = @0
        `,
        [idCargaHoraria],
      )
    )[0];

    if (!row) {
      throw noEncontrado(
        'cargaHoraria',
        idCargaHoraria,
        TypeOrmPersonalRepository.name,
      );
    }

    return {
      id: Number(row.id),
      codigo: row.codigo,
      nombre: row.nombre,
      horasDiaBase: Number(row.horas_dia_base),
      descripcion: row.descripcion,
      activo: row.activo,
    };
  }
}

type PersonalListRow = {
  personal_id: number | string;
  personal_codigo_personal: string | null;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  personal_documento_identidad: string;
  personal_id_nivel_cargo: number | string;
  personal_activo: boolean;
  nivel_cargo_codigo: string | null;
  nivel_cargo_nombre: string | null;
  asignacion_principal_id: number | string | null;
};

type PersonalVinculableRow = {
  personal_id: number | string;
  personal_codigo_personal: string | null;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  servicio_principal_id: number | string | null;
  servicio_principal_nombre: string | null;
  departamento_principal_id: number | string | null;
  departamento_principal_nombre: string | null;
  rol_funcional_es_jefatura: boolean | null;
};

type PersonalDetailRow = {
  personal_id: number | string;
  personal_codigo_personal: string | null;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  personal_documento_identidad: string;
  personal_activo: boolean;
  nivel_cargo_id: number | string | null;
  nivel_cargo_codigo: string | null;
  nivel_cargo_nombre: string | null;
  rol_funcional_id: number | string | null;
  rol_funcional_codigo: string | null;
  rol_funcional_nombre: string | null;
  rol_funcional_es_jefatura: boolean;
  servicio_principal_id: number | string | null;
  servicio_principal_codigo: string | null;
  servicio_principal_nombre: string | null;
  departamento_principal_id: number | string | null;
  departamento_principal_codigo: string | null;
  departamento_principal_nombre: string | null;
  usuario_id: number | string | null;
  usuario_username: string;
  usuario_tipo_usuario: string;
  usuario_activo: boolean;
  usuario_rol_id: number | string | null;
  usuario_rol_codigo: string | null;
  usuario_rol_nombre: string | null;
};

type AsignacionRow = {
  asignacion_id: number | string;
  asignacion_id_personal: number | string;
  asignacion_id_servicio: number | string | null;
  asignacion_id_departamento: number | string | null;
  asignacion_id_tipo_contrato: number | string;
  asignacion_id_carga_horaria: number | string | null;
  asignacion_id_rol_funcional: number | string | null;
  asignacion_nro_item: string | null;
  asignacion_codigo_fuente_item: string | null;
  asignacion_tipo_asignacion: string;
  asignacion_fecha_inicio: Date;
  asignacion_fecha_fin: Date | null;
  asignacion_activo: boolean;
  personal_codigo_personal: string | null;
  personal_documento_identidad: string;
  personal_nombres: string;
  personal_apellido_paterno: string;
  personal_apellido_materno: string | null;
  nivel_cargo_codigo: string | null;
  nivel_cargo_nombre: string | null;
  tipo_contrato_codigo: string | null;
  tipo_contrato_nombre: string | null;
  servicio_codigo: string | null;
  servicio_nombre: string | null;
  departamento_codigo: string | null;
  departamento_nombre: string | null;
  carga_horaria_codigo: string | null;
  carga_horaria_nombre: string | null;
  rol_funcional_codigo: string | null;
  rol_funcional_nombre: string | null;
  rol_funcional_es_jefatura: boolean | null;
  usuario_id: number | string | null;
};

type HistorialRow = {
  historial_id: number | string;
  historial_id_asignacion_personal: number | string;
  historial_fecha_evento: Date;
  historial_tipo_evento: string;
  historial_motivo: string | null;
  asignacion_fecha_inicio: Date;
  asignacion_fecha_fin: Date | null;
  servicio_origen_id: number | string | null;
  servicio_origen_codigo: string | null;
  servicio_origen_nombre: string | null;
  servicio_destino_id: number | string | null;
  servicio_destino_codigo: string | null;
  servicio_destino_nombre: string | null;
  departamento_origen_id: number | string | null;
  departamento_origen_codigo: string | null;
  departamento_origen_nombre: string | null;
  departamento_destino_id: number | string | null;
  departamento_destino_codigo: string | null;
  departamento_destino_nombre: string | null;
  rol_funcional_origen_id: number | string | null;
  rol_funcional_origen_codigo: string | null;
  rol_funcional_origen_nombre: string | null;
  rol_funcional_destino_id: number | string | null;
  rol_funcional_destino_codigo: string | null;
  rol_funcional_destino_nombre: string | null;
  usuario_id: number | string | null;
  usuario_username: string | null;
};

type NivelCargoRow = {
  nivel_id: number | string;
  nivel_codigo: string;
  nivel_nombre: string;
  nivel_descripcion: string | null;
  nivel_activo: boolean;
};

type CargaHorariaRow = {
  id: number | string;
  codigo: string;
  nombre: string;
  horas_dia_base: number | string;
  descripcion: string | null;
  activo: boolean;
};

type TipoContratoRow = {
  id: number | string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

type RolFuncionalRow = {
  id: number | string;
  codigo: string;
  nombre: string;
  alcance_organizativo: string;
  es_jefatura: boolean;
  activo: boolean;
};

type BloqueoPlanificacionAbiertaRow = {
  planificacion_id: number | string;
  planificacion_fecha_inicio: Date;
  planificacion_fecha_fin: Date;
  planificacion_estado: 'BORRADOR' | 'REVISION' | 'APROBADA';
  unidad_nombre: string;
};

type ImpactoPlanificacionAprobadaTraslado = {
  idPlanificacionOrigen: number;
  idPlanificacionDestino: number | null;
};

type AssignmentContext = {
  idServicio: number | null;
  idDepartamento: number;
};

type AsignacionPersistRow = {
  id: number | string;
  id_personal: number;
  id_servicio: number | null;
  id_departamento: number | null;
  id_tipo_contrato: number;
  id_carga_horaria: number | null;
  id_rol_funcional: number | null;
  nro_item: string | null;
  codigo_fuente_item: string | null;
  tipo_asignacion: string;
  es_principal: boolean | number;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  activo: boolean;
};

type HistorialPersistInput = {
  idAsignacionPersonal: number;
  tipoEvento: string;
  idServicioOrigen: number | null;
  idServicioDestino: number | null;
  idDepartamentoOrigen: number | null;
  idDepartamentoDestino: number | null;
  idRolFuncionalOrigen: number | null;
  idRolFuncionalDestino: number | null;
  idUsuario: number;
  motivo?: string | null;
};

function mapPersonalRow(row: PersonalListRow): Personal {
  return {
    id: Number(row.personal_id),
    codigoPersonal: row.personal_codigo_personal,
    nombres: row.personal_nombres,
    apellidoPaterno: row.personal_apellido_paterno,
    apellidoMaterno: row.personal_apellido_materno,
    documentoIdentidad: row.personal_documento_identidad,
    idNivelCargo: Number(row.personal_id_nivel_cargo),
    codigoNivelCargo: row.nivel_cargo_codigo,
    nombreNivelCargo: normalizeCargoNombre(
      row.nivel_cargo_codigo,
      row.nivel_cargo_nombre,
    ),
    tieneAsignacionActiva: row.asignacion_principal_id !== null,
    activo: row.personal_activo,
  };
}

function mapAsignacionRow(row: AsignacionRow): AsignacionConsulta {
  return {
    id: Number(row.asignacion_id),
    idPersonal: Number(row.asignacion_id_personal),
    codigoPersonal: row.personal_codigo_personal,
    ci: row.personal_documento_identidad,
    apellidoPaterno: row.personal_apellido_paterno,
    apellidoMaterno: row.personal_apellido_materno,
    nombres: row.personal_nombres,
    nombreCompleto: buildNombreCompleto(
      row.personal_nombres,
      row.personal_apellido_paterno,
      row.personal_apellido_materno,
    ),
    idServicio:
      row.asignacion_id_servicio === null
        ? null
        : Number(row.asignacion_id_servicio),
    codigoServicio: row.servicio_codigo,
    nombreServicio: row.servicio_nombre,
    idDepartamento:
      row.asignacion_id_departamento === null
        ? null
        : Number(row.asignacion_id_departamento),
    codigoDepartamento: row.departamento_codigo,
    nombreDepartamento: row.departamento_nombre,
    nombreNivelCargo: normalizeCargoNombre(
      row.nivel_cargo_codigo,
      row.nivel_cargo_nombre,
    ),
    idTipoContrato: Number(row.asignacion_id_tipo_contrato),
    codigoTipoContrato: row.tipo_contrato_codigo,
    nombreTipoContrato: row.tipo_contrato_nombre,
    idRolFuncional:
      row.asignacion_id_rol_funcional === null
        ? null
        : Number(row.asignacion_id_rol_funcional),
    codigoRolFuncional: row.rol_funcional_codigo,
    nombreRolFuncional: row.rol_funcional_nombre,
    esJefaturaRolFuncional: Boolean(row.rol_funcional_es_jefatura),
    codigoFuenteItem: row.asignacion_codigo_fuente_item,
    idCargaHoraria:
      row.asignacion_id_carga_horaria === null
        ? null
        : Number(row.asignacion_id_carga_horaria),
    codigoCargaHoraria: row.carga_horaria_codigo,
    nombreCargaHoraria: row.carga_horaria_nombre,
    nroItem: row.asignacion_nro_item,
    tipoAsignacion: row.asignacion_tipo_asignacion,
    fechaInicio: new Date(row.asignacion_fecha_inicio),
    fechaFin: row.asignacion_fecha_fin
      ? new Date(row.asignacion_fecha_fin)
      : null,
    activo: row.asignacion_activo,
    tieneUsuario: row.usuario_id !== null && row.usuario_id !== undefined,
  };
}

function nullableNumberEquals(
  a: number | string | null | undefined,
  b: number | string | null | undefined,
): boolean {
  const normalizedA = a === null || a === undefined ? null : Number(a);
  const normalizedB = b === null || b === undefined ? null : Number(b);
  return normalizedA === normalizedB;
}

const NOMBRES_MESES_PERIODO_PLANIFICACION = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

function formatPeriodoPlanificacion(value: Date): string {
  const date = new Date(value);
  return `${NOMBRES_MESES_PERIODO_PLANIFICACION[date.getUTCMonth()]}/${date.getUTCFullYear()}`;
}

function formatPeriodoPlanificacionPorAnioMes(
  anio: number,
  mes: number,
): string {
  return `${NOMBRES_MESES_PERIODO_PLANIFICACION[mes - 1]}/${anio}`;
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

function normalizeCargoNombre(
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

function mapTipoContratoRow(row: TipoContratoRow): TipoContrato {
  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    descripcion: row.descripcion,
    activo: row.activo,
  };
}

// Traducir errores de BD a excepciones de negocio con mensajes entendibles.
function mapearErrorAsignacion(error: unknown): unknown {
  const restriccion = obtenerRestriccionUnicaViolada(error);

  if (restriccion === null) {
    return error;
  }

  if (restriccion === 'uq_asignacion_personal_persona_ambito_inicio') {
    return new ConflictException(
      'Esta persona ya tiene una asignacion en el mismo servicio o departamento con esa fecha de inicio. Cierra la asignacion existente o usa otra fecha de inicio.',
    );
  }

  return new ConflictException(
    'Ya existe un registro con esos datos. Revisalos antes de continuar.',
  );
}

// Cargos y cargas horarias no validaban duplicados: el UNIQUE de base llegaba
// como error inesperado. Se traduce por nombre de restriccion.
function mapearDuplicadoCatalogo(
  error: unknown,
  input: { codigo: string; nombre: string },
): unknown {
  const restriccion = obtenerRestriccionUnicaViolada(error);
  const codigo = input.codigo.trim();

  switch (restriccion) {
    case null:
      return error;
    case 'uq_nivel_cargo_codigo':
      return new ConflictException(
        `Ya existe un cargo con el codigo ${codigo}. Usa otro codigo.`,
      );
    case 'uq_nivel_cargo_nombre':
      return new ConflictException(
        `Ya existe un cargo llamado "${input.nombre.trim()}". Usa otro nombre.`,
      );
    case 'uq_carga_horaria_codigo':
      return new ConflictException(
        `Ya existe una carga horaria con el codigo ${codigo}. Usa otro codigo.`,
      );
    default:
      return new ConflictException(
        'Ya existe un registro con esos datos. Revisa el codigo y el nombre.',
      );
  }
}

interface PersonalNombreRow {
  id?: number | string;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
}

// Para mensajes al usuario: el nombre de la persona, no su id.
function nombreCompletoPersona(
  row: PersonalNombreRow | undefined,
): string | null {
  if (!row) {
    return null;
  }

  const nombre = [row.nombres, row.apellido_paterno, row.apellido_materno]
    .filter((value) => Boolean(value))
    .join(' ');

  return nombre || null;
}

function capitalizarInicio(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// 'YYYY-MM-DD' (o ISO) a DD/MM/YYYY para mensajes al usuario.
function formatearFechaCorta(valor: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  return coincidencia
    ? `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`
    : valor;
}
