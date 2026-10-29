import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { DataSource } from 'typeorm';
import {
  errorAlConfirmarGuardado,
  noEncontrado,
} from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { DepartamentoOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/departamento.orm-entity';
import { ServicioOrmEntity } from '../../../organizacion/infrastructure/persistence/entities/servicio.orm-entity';
import { AsignacionPersonalOrmEntity } from '../../../personal/infrastructure/persistence/entities/asignacion-personal.orm-entity';
import { PersonalOrmEntity } from '../../../personal/infrastructure/persistence/entities/personal.orm-entity';
import { RolSeguridadOrmEntity } from './entities/rol-seguridad.orm-entity';
import { UsuarioOrmEntity } from './entities/usuario.orm-entity';
import { Usuario } from '../../domain/entities/usuario';
import {
  type AlcancePlanificacionUsuario,
  type DepartamentoGestionableUsuario,
  type ServicioGestionableUsuario,
  type UsuarioSesion,
} from '../../domain/entities/usuario-sesion';
import {
  type CrearSesionActivaInput,
  type GuardarUsuarioInput,
  type SesionActivaUsuario,
  type UsuarioSesionAutenticable,
  UsuarioRepository,
} from '../../domain/repositories/usuario.repository';
import { normalizeCapacidadesOperativas } from '../../domain/entities/usuario-capacidades';
import { normalizePermisosOperativos } from '../../domain/entities/usuario-permisos';
import { SESSION_DURATION_HOURS } from '../../domain/sesion.constants';

@Injectable()
export class TypeOrmUsuarioRepository implements UsuarioRepository {
  constructor(
    @Inject(TYPEORM_DATA_SOURCE)
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
  ) {}

  async listar(): Promise<Usuario[]> {
    const rows = await this.dataSource
      .getRepository(UsuarioOrmEntity)
      .createQueryBuilder('usuario')
      .leftJoin(
        RolSeguridadOrmEntity,
        'rolSeguridad',
        'rolSeguridad.id = usuario.id_rol_seguridad',
      )
      .leftJoin(
        PersonalOrmEntity,
        'personal',
        'personal.id = usuario.id_personal',
      )
      .select([
        'usuario.id AS usuario_id',
        'usuario.id_personal AS usuario_id_personal',
        'usuario.id_rol_seguridad AS usuario_id_rol',
        'usuario.tipo_usuario AS usuario_tipo_usuario',
        'usuario.proveedor_autenticacion AS usuario_proveedor_autenticacion',
        'usuario.sujeto_autenticacion AS usuario_sujeto_autenticacion',
        'usuario.username AS usuario_username',
        'usuario.activo AS usuario_activo',
        'rolSeguridad.codigo AS rol_codigo',
        'rolSeguridad.nombre AS rol_nombre',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
      ])
      .orderBy('usuario.username', 'ASC')
      .getRawMany<{
        usuario_id: number | string;
        usuario_id_personal: number | string | null;
        usuario_id_rol: number | string | null;
        usuario_tipo_usuario: string;
        usuario_proveedor_autenticacion: string;
        usuario_sujeto_autenticacion: string | null;
        usuario_username: string;
        usuario_activo: boolean;
        rol_codigo: string | null;
        rol_nombre: string | null;
        personal_codigo_personal: string | null;
        personal_nombres: string | null;
        personal_apellido_paterno: string | null;
        personal_apellido_materno: string | null;
      }>();

    return rows.map((row) => ({
      id: Number(row.usuario_id),
      idPersonal:
        row.usuario_id_personal === null
          ? null
          : Number(row.usuario_id_personal),
      codigoPersonal: row.personal_codigo_personal,
      nombreCompleto: buildFullName(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      idRolSeguridad:
        row.usuario_id_rol === null ? null : Number(row.usuario_id_rol),
      rolCodigo: row.rol_codigo,
      rolNombre: row.rol_nombre,
      tipoUsuario: row.usuario_tipo_usuario,
      proveedorAutenticacion: row.usuario_proveedor_autenticacion,
      sujetoAutenticacion: row.usuario_sujeto_autenticacion,
      username: row.usuario_username,
      identidadLocalHabilitada: row.usuario_proveedor_autenticacion === 'LOCAL',
      activo: row.usuario_activo,
    }));
  }

  async obtenerPorId(idUsuario: number): Promise<Usuario | null> {
    const rows = await this.dataSource
      .getRepository(UsuarioOrmEntity)
      .createQueryBuilder('usuario')
      .leftJoin(
        RolSeguridadOrmEntity,
        'rolSeguridad',
        'rolSeguridad.id = usuario.id_rol_seguridad',
      )
      .leftJoin(
        PersonalOrmEntity,
        'personal',
        'personal.id = usuario.id_personal',
      )
      .select([
        'usuario.id AS usuario_id',
        'usuario.id_personal AS usuario_id_personal',
        'usuario.id_rol_seguridad AS usuario_id_rol',
        'usuario.tipo_usuario AS usuario_tipo_usuario',
        'usuario.proveedor_autenticacion AS usuario_proveedor_autenticacion',
        'usuario.sujeto_autenticacion AS usuario_sujeto_autenticacion',
        'usuario.username AS usuario_username',
        'usuario.activo AS usuario_activo',
        'rolSeguridad.codigo AS rol_codigo',
        'rolSeguridad.nombre AS rol_nombre',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
      ])
      .where('usuario.id = :idUsuario', { idUsuario })
      .getRawMany<{
        usuario_id: number | string;
        usuario_id_personal: number | string | null;
        usuario_id_rol: number | string | null;
        usuario_tipo_usuario: string;
        usuario_proveedor_autenticacion: string;
        usuario_sujeto_autenticacion: string | null;
        usuario_username: string;
        usuario_activo: boolean;
        rol_codigo: string | null;
        rol_nombre: string | null;
        personal_codigo_personal: string | null;
        personal_nombres: string | null;
        personal_apellido_paterno: string | null;
        personal_apellido_materno: string | null;
      }>();

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      id: Number(row.usuario_id),
      idPersonal:
        row.usuario_id_personal === null
          ? null
          : Number(row.usuario_id_personal),
      codigoPersonal: row.personal_codigo_personal,
      nombreCompleto: buildFullName(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      idRolSeguridad:
        row.usuario_id_rol === null ? null : Number(row.usuario_id_rol),
      rolCodigo: row.rol_codigo,
      rolNombre: row.rol_nombre,
      tipoUsuario: row.usuario_tipo_usuario,
      proveedorAutenticacion: row.usuario_proveedor_autenticacion,
      sujetoAutenticacion: row.usuario_sujeto_autenticacion,
      username: row.usuario_username,
      identidadLocalHabilitada: row.usuario_proveedor_autenticacion === 'LOCAL',
      activo: row.usuario_activo,
    };
  }

  async obtenerPorPersonal(idPersonal: number): Promise<Usuario | null> {
    const rows = await this.dataSource
      .getRepository(UsuarioOrmEntity)
      .createQueryBuilder('usuario')
      .leftJoin(
        RolSeguridadOrmEntity,
        'rolSeguridad',
        'rolSeguridad.id = usuario.id_rol_seguridad',
      )
      .leftJoin(
        PersonalOrmEntity,
        'personal',
        'personal.id = usuario.id_personal',
      )
      .select([
        'usuario.id AS usuario_id',
        'usuario.id_personal AS usuario_id_personal',
        'usuario.id_rol_seguridad AS usuario_id_rol',
        'usuario.tipo_usuario AS usuario_tipo_usuario',
        'usuario.proveedor_autenticacion AS usuario_proveedor_autenticacion',
        'usuario.sujeto_autenticacion AS usuario_sujeto_autenticacion',
        'usuario.username AS usuario_username',
        'usuario.activo AS usuario_activo',
        'rolSeguridad.codigo AS rol_codigo',
        'rolSeguridad.nombre AS rol_nombre',
        'personal.codigo_personal AS personal_codigo_personal',
        'personal.nombres AS personal_nombres',
        'personal.apellido_paterno AS personal_apellido_paterno',
        'personal.apellido_materno AS personal_apellido_materno',
      ])
      .where('usuario.id_personal = :idPersonal', { idPersonal })
      .andWhere("usuario.tipo_usuario = 'PERSONAL'")
      .orderBy('usuario.id', 'DESC')
      .getRawMany<{
        usuario_id: number | string;
        usuario_id_personal: number | string | null;
        usuario_id_rol: number | string | null;
        usuario_tipo_usuario: string;
        usuario_proveedor_autenticacion: string;
        usuario_sujeto_autenticacion: string | null;
        usuario_username: string;
        usuario_activo: boolean;
        rol_codigo: string | null;
        rol_nombre: string | null;
        personal_codigo_personal: string | null;
        personal_nombres: string | null;
        personal_apellido_paterno: string | null;
        personal_apellido_materno: string | null;
      }>();

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      id: Number(row.usuario_id),
      idPersonal:
        row.usuario_id_personal === null
          ? null
          : Number(row.usuario_id_personal),
      codigoPersonal: row.personal_codigo_personal,
      nombreCompleto: buildFullName(
        row.personal_nombres,
        row.personal_apellido_paterno,
        row.personal_apellido_materno,
      ),
      idRolSeguridad:
        row.usuario_id_rol === null ? null : Number(row.usuario_id_rol),
      rolCodigo: row.rol_codigo,
      rolNombre: row.rol_nombre,
      tipoUsuario: row.usuario_tipo_usuario,
      proveedorAutenticacion: row.usuario_proveedor_autenticacion,
      sujetoAutenticacion: row.usuario_sujeto_autenticacion,
      username: row.usuario_username,
      identidadLocalHabilitada: row.usuario_proveedor_autenticacion === 'LOCAL',
      activo: Boolean(row.usuario_activo),
    };
  }

  async obtenerSesionPorId(idUsuario: number): Promise<UsuarioSesion | null> {
    return this.obtenerSesion({
      usuarioId: idUsuario,
    });
  }

  async obtenerSesionPorUsername(
    username: string,
  ): Promise<UsuarioSesion | null> {
    return this.obtenerSesion({
      username,
    });
  }

  async obtenerSesionAutenticablePorUsername(
    username: string,
  ): Promise<UsuarioSesionAutenticable | null> {
    const usuarioBase = await this.obtenerUsuarioBase({
      username,
    });

    if (!usuarioBase || !usuarioBase.usuario_activo) {
      return null;
    }

    const session = await this.buildSessionFromUsuarioBase(usuarioBase);

    if (!session) {
      return null;
    }

    return {
      session,
      passwordHash: usuarioBase.usuario_password_hash,
    };
  }

  async crearSesionActiva(
    input: CrearSesionActivaInput,
  ): Promise<SesionActivaUsuario> {
    const session = await this.obtenerSesionPorId(input.idUsuario);

    if (!session) {
      throw noEncontrado(
        'usuario',
        input.idUsuario,
        TypeOrmUsuarioRepository.name,
      );
    }

    // El JWT es el formato del token (firmado, con expiracion propia
    // verificable sin tocar la base); quien decide si la sesion sigue viva
    // sigue siendo sesion_usuario (revocada/expires_at), igual que antes —
    // por eso se sigue guardando el hash del token, no el JWT en si.
    const tokenSesion = this.jwtService.sign({ sub: input.idUsuario });
    const tokenHash = buildTokenHash(tokenSesion);

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
          UPDATE dbo.sesion_usuario
          SET
            revocada = 1,
            revocada_at = GETUTCDATE(),
            motivo_revocacion = @1,
            updated_at = GETUTCDATE()
          WHERE id_usuario = @0
            AND revocada = 0
        `,
        [input.idUsuario, 'REEMPLAZADA_POR_NUEVO_LOGIN'],
      );

      await manager.query(
        `
          INSERT INTO dbo.sesion_usuario
          (
            id_usuario,
            token_hash,
            ip_origen,
            user_agent,
            last_seen_at,
            expires_at,
            revocada
          )
          VALUES
          (@0, @1, @2, @3, GETUTCDATE(), DATEADD(HOUR, ${SESSION_DURATION_HOURS}, GETUTCDATE()), 0)
        `,
        [
          input.idUsuario,
          tokenHash,
          input.ipOrigen ?? null,
          input.userAgent ?? null,
        ],
      );

      await manager.query(
        `
          UPDATE dbo.usuario
          SET
            ultimo_acceso_at = GETUTCDATE(),
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [input.idUsuario],
      );
    });

    return {
      tokenSesion,
      session,
    };
  }

  async obtenerSesionPorToken(
    tokenSesion: string,
  ): Promise<UsuarioSesion | null> {
    // Primer filtro barato: firma y `exp` del JWT, sin tocar la base. Un
    // token forjado o vencido segun su propio claim se descarta aca. La
    // revocacion real (logout, reemplazo por nuevo login, reset de password)
    // sigue viviendo unicamente en sesion_usuario, verificada mas abajo.
    try {
      this.jwtService.verify(tokenSesion);
    } catch {
      return null;
    }

    const tokenHash = buildTokenHash(tokenSesion);
    const rowsUnknown: unknown = await this.dataSource.query(
      `
        SELECT TOP 1 id_usuario
        FROM dbo.sesion_usuario
        WHERE token_hash = @0
          AND revocada = 0
          AND (expires_at IS NULL OR expires_at > GETUTCDATE())
      `,
      [tokenHash],
    );

    const rows = rowsUnknown as Array<{ id_usuario: number | string }>;
    const row = rows[0];

    if (!row) {
      return null;
    }

    const idUsuario = Number(row.id_usuario);
    const session = await this.obtenerSesionPorId(idUsuario);

    if (!session) {
      return null;
    }

    await this.dataSource.query(
      `
        UPDATE dbo.sesion_usuario
        SET
          last_seen_at = GETUTCDATE(),
          updated_at = GETUTCDATE()
        WHERE token_hash = @0
          AND revocada = 0
      `,
      [tokenHash],
    );

    return session;
  }

  async revocarSesionPorToken(
    tokenSesion: string,
    motivo = 'REVOCADA',
  ): Promise<void> {
    const tokenHash = buildTokenHash(tokenSesion);

    await this.dataSource.query(
      `
        UPDATE dbo.sesion_usuario
        SET
          revocada = 1,
          revocada_at = GETUTCDATE(),
          motivo_revocacion = @1,
          updated_at = GETUTCDATE()
        WHERE token_hash = @0
          AND revocada = 0
      `,
      [tokenHash, motivo],
    );
  }

  async crear(input: GuardarUsuarioInput): Promise<Usuario> {
    await this.assertCanPersistUser(null, input, true);

    const passwordHash = await hash(input.password ?? '', 10);
    const rowsUnknown: unknown = await this.dataSource.query(
      `
        INSERT INTO dbo.usuario
        (
          id_personal,
          id_rol_seguridad,
          tipo_usuario,
          proveedor_autenticacion,
          sujeto_autenticacion,
          username,
          password_hash,
          activo
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (@0, @1, @2, 'LOCAL', @3, @4, @5, 1)
      `,
      [
        input.idPersonal ?? null,
        input.idRolSeguridad ?? null,
        input.tipoUsuario,
        input.username,
        input.username,
        passwordHash,
      ],
    );

    const rows = rowsUnknown as Array<{ id: number | string }>;
    const insertedId = Number(rows[0]?.id);
    const usuario = await this.obtenerPorId(insertedId);

    if (!usuario) {
      throw errorAlConfirmarGuardado(
        'usuario',
        insertedId,
        TypeOrmUsuarioRepository.name,
      );
    }

    return usuario;
  }

  async actualizar(
    idUsuario: number,
    input: GuardarUsuarioInput,
  ): Promise<Usuario> {
    const actual = await this.obtenerUsuarioBase({ usuarioId: idUsuario });

    if (!actual) {
      throw noEncontrado('usuario', idUsuario, TypeOrmUsuarioRepository.name);
    }

    await this.assertCanPersistUser(idUsuario, input, actual.usuario_activo);

    const passwordHash = input.password
      ? await hash(input.password, 10)
      : actual.usuario_password_hash;

    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
          UPDATE dbo.usuario
          SET
            id_personal = @1,
            id_rol_seguridad = @2,
            tipo_usuario = @3,
            proveedor_autenticacion = 'LOCAL',
            sujeto_autenticacion = @4,
            username = @5,
            password_hash = @6,
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [
          idUsuario,
          input.idPersonal ?? null,
          input.idRolSeguridad ?? null,
          input.tipoUsuario,
          input.username,
          input.username,
          passwordHash,
        ],
      );

      if (input.password) {
        await manager.query(
          `
            UPDATE dbo.sesion_usuario
            SET
              revocada = 1,
              revocada_at = GETUTCDATE(),
              motivo_revocacion = @1,
              updated_at = GETUTCDATE()
            WHERE id_usuario = @0
              AND revocada = 0
          `,
          [idUsuario, 'PASSWORD_RESET'],
        );
      }
    });

    const usuario = await this.obtenerPorId(idUsuario);

    if (!usuario) {
      throw errorAlConfirmarGuardado(
        'usuario',
        idUsuario,
        TypeOrmUsuarioRepository.name,
      );
    }

    return usuario;
  }

  async actualizarPassword(
    idUsuario: number,
    passwordHash: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query(
        `
          UPDATE dbo.usuario
          SET
            password_hash = @1,
            updated_at = GETUTCDATE()
          WHERE id = @0
        `,
        [idUsuario, passwordHash],
      );

      await manager.query(
        `
          UPDATE dbo.sesion_usuario
          SET
            revocada = 1,
            revocada_at = GETUTCDATE(),
            motivo_revocacion = @1,
            updated_at = GETUTCDATE()
          WHERE id_usuario = @0
            AND revocada = 0
        `,
        [idUsuario, 'CAMBIO_PASSWORD_PROPIO'],
      );
    });
  }

  async desactivar(idUsuario: number): Promise<void> {
    const actual = await this.obtenerPorId(idUsuario);

    if (!actual) {
      throw noEncontrado('usuario', idUsuario, TypeOrmUsuarioRepository.name);
    }

    await this.dataSource.query(
      `
        UPDATE dbo.usuario
        SET
          activo = 0,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [idUsuario],
    );
  }

  async activar(idUsuario: number): Promise<void> {
    const actual = await this.obtenerPorId(idUsuario);

    if (!actual) {
      throw noEncontrado('usuario', idUsuario, TypeOrmUsuarioRepository.name);
    }

    await this.assertCanActivateUser(idUsuario);

    await this.dataSource.query(
      `
        UPDATE dbo.usuario
        SET
          activo = 1,
          updated_at = GETUTCDATE()
        WHERE id = @0
      `,
      [idUsuario],
    );
  }

  async contarAdministradoresSistemaActivos(): Promise<number> {
    const rows = await this.dataSource.query<Array<{ total: number | string }>>(
      `
        SELECT COUNT(*) AS total
        FROM dbo.usuario u
        INNER JOIN dbo.rol_seguridad r ON r.id = u.id_rol_seguridad
        WHERE u.activo = 1
          AND r.activo = 1
          AND r.alcance_planificacion = 'SISTEMA'
          AND r.puede_gestionar_usuarios = 1
      `,
    );

    return Number(rows[0]?.total ?? 0);
  }

  private async obtenerSesion(input: {
    usuarioId?: number;
    username?: string;
  }): Promise<UsuarioSesion | null> {
    const usuarioBase = await this.obtenerUsuarioBase(input);

    if (!usuarioBase || !usuarioBase.usuario_activo) {
      return null;
    }

    return this.buildSessionFromUsuarioBase(usuarioBase);
  }

  private async buildSessionFromUsuarioBase(
    usuarioBase: UsuarioBaseRow,
  ): Promise<UsuarioSesion | null> {
    const asignaciones =
      usuarioBase.usuario_id_personal === null
        ? []
        : await this.dataSource
            .getRepository(AsignacionPersonalOrmEntity)
            .createQueryBuilder('asignacion')
            .leftJoin(
              ServicioOrmEntity,
              'servicio',
              'servicio.id = asignacion.id_servicio',
            )
            .leftJoin(
              DepartamentoOrmEntity,
              'departamento',
              'departamento.id = COALESCE(asignacion.id_departamento, servicio.id_departamento)',
            )
            .select([
              'asignacion.id AS asignacion_id',
              'asignacion.id_servicio AS asignacion_id_servicio',
              'asignacion.id_departamento AS asignacion_id_departamento',
              'asignacion.es_principal AS asignacion_es_principal',
              'servicio.id AS servicio_id',
              'servicio.id_departamento AS servicio_id_departamento',
              'servicio.codigo AS servicio_codigo',
              'servicio.nombre AS servicio_nombre',
              'departamento.id AS departamento_id',
              'departamento.codigo AS departamento_codigo',
              'departamento.nombre AS departamento_nombre',
            ])
            .where('asignacion.id_personal = :idPersonal', {
              idPersonal: usuarioBase.usuario_id_personal,
            })
            .andWhere('asignacion.activo = 1')
            .orderBy('asignacion.es_principal', 'DESC')
            .addOrderBy('asignacion.id', 'ASC')
            .getRawMany<{
              asignacion_id: number | string;
              asignacion_id_servicio: number | string | null;
              asignacion_id_departamento: number | string | null;
              asignacion_es_principal: boolean;
              servicio_id: number | string | null;
              servicio_id_departamento: number | string | null;
              servicio_codigo: string | null;
              servicio_nombre: string | null;
              departamento_id: number | string | null;
              departamento_codigo: string | null;
              departamento_nombre: string | null;
            }>();

    const rolPermisos = normalizePermisosOperativos({
      puedeVerOrganizacion: Boolean(usuarioBase.rol_puede_ver_organizacion),
      puedeVerPersonal: Boolean(usuarioBase.rol_puede_ver_personal),
      puedeGestionarPersonal: Boolean(usuarioBase.rol_puede_gestionar_personal),
      puedeVerAsignaciones: Boolean(usuarioBase.rol_puede_ver_asignaciones),
      puedeGestionarAsignaciones: Boolean(
        usuarioBase.rol_puede_gestionar_asignaciones,
      ),
      puedeVerSeguridad: Boolean(usuarioBase.rol_puede_ver_seguridad),
      puedeGestionarUsuarios: Boolean(usuarioBase.rol_puede_gestionar_usuarios),
      puedeVerOperacion: Boolean(usuarioBase.rol_puede_ver_operacion),
      puedeVerPlanificacion: Boolean(usuarioBase.rol_puede_ver_planificacion),
      puedeEditarPlanificacion: Boolean(
        usuarioBase.rol_puede_editar_planificacion,
      ),
      puedeAprobarPlanificacion: Boolean(
        usuarioBase.rol_puede_aprobar_planificacion,
      ),
      puedeVerReportes: Boolean(usuarioBase.rol_puede_ver_reportes),
    });
    const rolCapacidades = normalizeCapacidadesOperativas({
      verCalendarios: Boolean(usuarioBase.rol_ver_calendarios),
      gestionarCalendarios: Boolean(usuarioBase.rol_gestionar_calendarios),
      verIncidenciasPersonales: Boolean(
        usuarioBase.rol_ver_incidencias_personales,
      ),
      gestionarIncidenciasPersonales: Boolean(
        usuarioBase.rol_gestionar_incidencias_personales,
      ),
      gestionarTiposFeriado: Boolean(usuarioBase.rol_gestionar_tipos_feriado),
      verCargasHorarias: Boolean(usuarioBase.rol_ver_cargas_horarias),
      gestionarCargasHorarias: Boolean(
        usuarioBase.rol_gestionar_cargas_horarias,
      ),
      verTurnos: Boolean(usuarioBase.rol_ver_turnos),
      crearPlanificacion: Boolean(usuarioBase.rol_crear_planificacion),
      editarPlanificacion: Boolean(usuarioBase.rol_editar_planificacion),
      enviarRevisionPlanificacion: Boolean(
        usuarioBase.rol_enviar_revision_planificacion,
      ),
      volverBorradorPlanificacion: Boolean(
        usuarioBase.rol_volver_borrador_planificacion,
      ),
      aprobarPlanificacion: Boolean(usuarioBase.rol_aprobar_planificacion),
      cerrarPlanificacion: Boolean(usuarioBase.rol_cerrar_planificacion),
      exportarPlanificacion: Boolean(usuarioBase.rol_exportar_planificacion),
      exportarPlanificacionLote: Boolean(
        usuarioBase.rol_exportar_planificacion_lote,
      ),
      gestionarCodigosOperativos: Boolean(
        usuarioBase.rol_gestionar_codigos_operativos,
      ),
      gestionarTurnos: Boolean(usuarioBase.rol_gestionar_turnos),
      gestionarServicios: Boolean(usuarioBase.rol_gestionar_servicios),
    });
    const departamentosGestionablesMap = new Map<
      number,
      DepartamentoGestionableUsuario
    >();
    const serviciosGestionablesMap = new Map<
      number,
      ServicioGestionableUsuario
    >();

    asignaciones.forEach((row) => {
      const idDepartamento =
        row.departamento_id === null ? null : Number(row.departamento_id);
      const idServicio =
        row.servicio_id === null ? null : Number(row.servicio_id);

      if (
        idDepartamento !== null &&
        row.departamento_codigo &&
        row.departamento_nombre
      ) {
        departamentosGestionablesMap.set(idDepartamento, {
          id: idDepartamento,
          codigo: row.departamento_codigo,
          nombre: row.departamento_nombre,
        });
      }

      if (
        idServicio !== null &&
        row.servicio_id_departamento !== null &&
        row.servicio_codigo &&
        row.servicio_nombre
      ) {
        serviciosGestionablesMap.set(idServicio, {
          id: idServicio,
          idDepartamento: Number(row.servicio_id_departamento),
          codigo: row.servicio_codigo,
          nombre: row.servicio_nombre,
          codigoDepartamento: row.departamento_codigo,
          nombreDepartamento: row.departamento_nombre,
        });
      }
    });

    const alcancePlanificacion =
      (usuarioBase.rol_alcance_planificacion as AlcancePlanificacionUsuario | null) ??
      'LECTURA';

    if (
      alcancePlanificacion === 'DEPARTAMENTO' &&
      departamentosGestionablesMap.size > 0
    ) {
      const departmentIds = Array.from(departamentosGestionablesMap.keys());
      const servicesByDepartment = await this.dataSource
        .getRepository(ServicioOrmEntity)
        .createQueryBuilder('servicio')
        .innerJoin(
          DepartamentoOrmEntity,
          'departamento',
          'departamento.id = servicio.id_departamento',
        )
        .select([
          'servicio.id AS servicio_id',
          'servicio.id_departamento AS servicio_id_departamento',
          'servicio.codigo AS servicio_codigo',
          'servicio.nombre AS servicio_nombre',
          'departamento.codigo AS departamento_codigo',
          'departamento.nombre AS departamento_nombre',
        ])
        .where('servicio.id_departamento IN (:...departmentIds)', {
          departmentIds,
        })
        .andWhere('servicio.activo = 1')
        .orderBy('servicio.nombre', 'ASC')
        .getRawMany<{
          servicio_id: number | string;
          servicio_id_departamento: number | string;
          servicio_codigo: string;
          servicio_nombre: string;
          departamento_codigo: string | null;
          departamento_nombre: string | null;
        }>();

      servicesByDepartment.forEach((row) => {
        serviciosGestionablesMap.set(Number(row.servicio_id), {
          id: Number(row.servicio_id),
          idDepartamento: Number(row.servicio_id_departamento),
          codigo: row.servicio_codigo,
          nombre: row.servicio_nombre,
          codigoDepartamento: row.departamento_codigo,
          nombreDepartamento: row.departamento_nombre,
        });
      });
    }

    const puedeGestionarTodo = alcancePlanificacion === 'SISTEMA';
    const puedeGestionarPlanificacion =
      puedeGestionarTodo || serviciosGestionablesMap.size > 0;
    const permisos = rolPermisos;
    const capacidades = rolCapacidades;

    return {
      id: Number(usuarioBase.usuario_id),
      username: usuarioBase.usuario_username,
      tipoUsuario: usuarioBase.usuario_tipo_usuario,
      proveedorAutenticacion: usuarioBase.usuario_proveedor_autenticacion,
      sujetoAutenticacion: usuarioBase.usuario_sujeto_autenticacion,
      identidadLocalHabilitada:
        usuarioBase.usuario_proveedor_autenticacion === 'LOCAL',
      activo: usuarioBase.usuario_activo,
      rolSeguridad: {
        id:
          usuarioBase.usuario_id_rol === null
            ? null
            : Number(usuarioBase.usuario_id_rol),
        codigo: usuarioBase.rol_codigo,
        nombre: usuarioBase.rol_nombre,
      },
      personal: {
        id:
          usuarioBase.usuario_id_personal === null
            ? null
            : Number(usuarioBase.usuario_id_personal),
        codigoPersonal: usuarioBase.personal_codigo_personal,
        nombreCompleto: buildFullName(
          usuarioBase.personal_nombres,
          usuarioBase.personal_apellido_paterno,
          usuarioBase.personal_apellido_materno,
        ),
      },
      alcancePlanificacion,
      puedeGestionarPlanificacion,
      puedeGestionarTodo,
      permisos,
      capacidades,
      departamentosGestionables: Array.from(
        departamentosGestionablesMap.values(),
      ),
      serviciosGestionables: Array.from(serviciosGestionablesMap.values()),
    };
  }

  private async obtenerUsuarioBase(input: {
    usuarioId?: number;
    username?: string;
  }): Promise<UsuarioBaseRow | null> {
    return (
      (await this.dataSource
        .getRepository(UsuarioOrmEntity)
        .createQueryBuilder('usuario')
        .leftJoin(
          RolSeguridadOrmEntity,
          'rolSeguridad',
          'rolSeguridad.id = usuario.id_rol_seguridad',
        )
        .leftJoin(
          PersonalOrmEntity,
          'personal',
          'personal.id = usuario.id_personal',
        )
        .select([
          'usuario.id AS usuario_id',
          'usuario.id_personal AS usuario_id_personal',
          'usuario.id_rol_seguridad AS usuario_id_rol',
          'usuario.tipo_usuario AS usuario_tipo_usuario',
          'usuario.proveedor_autenticacion AS usuario_proveedor_autenticacion',
          'usuario.sujeto_autenticacion AS usuario_sujeto_autenticacion',
          'usuario.username AS usuario_username',
          'usuario.password_hash AS usuario_password_hash',
          'usuario.activo AS usuario_activo',
          'rolSeguridad.codigo AS rol_codigo',
          'rolSeguridad.nombre AS rol_nombre',
          'rolSeguridad.alcance_planificacion AS rol_alcance_planificacion',
          'rolSeguridad.puede_ver_organizacion AS rol_puede_ver_organizacion',
          'rolSeguridad.puede_ver_personal AS rol_puede_ver_personal',
          'rolSeguridad.puede_gestionar_personal AS rol_puede_gestionar_personal',
          'rolSeguridad.puede_ver_asignaciones AS rol_puede_ver_asignaciones',
          'rolSeguridad.puede_gestionar_asignaciones AS rol_puede_gestionar_asignaciones',
          'rolSeguridad.puede_ver_seguridad AS rol_puede_ver_seguridad',
          'rolSeguridad.puede_gestionar_usuarios AS rol_puede_gestionar_usuarios',
          'rolSeguridad.puede_ver_operacion AS rol_puede_ver_operacion',
          'rolSeguridad.puede_ver_planificacion AS rol_puede_ver_planificacion',
          'rolSeguridad.puede_editar_planificacion AS rol_puede_editar_planificacion',
          'rolSeguridad.puede_aprobar_planificacion AS rol_puede_aprobar_planificacion',
          'rolSeguridad.puede_ver_reportes AS rol_puede_ver_reportes',
          'rolSeguridad.ver_calendarios AS rol_ver_calendarios',
          'rolSeguridad.gestionar_calendarios AS rol_gestionar_calendarios',
          'rolSeguridad.ver_incidencias_personales AS rol_ver_incidencias_personales',
          'rolSeguridad.gestionar_incidencias_personales AS rol_gestionar_incidencias_personales',
          'rolSeguridad.gestionar_tipos_feriado AS rol_gestionar_tipos_feriado',
          'rolSeguridad.ver_cargas_horarias AS rol_ver_cargas_horarias',
          'rolSeguridad.gestionar_cargas_horarias AS rol_gestionar_cargas_horarias',
          'rolSeguridad.ver_turnos AS rol_ver_turnos',
          'rolSeguridad.crear_planificacion AS rol_crear_planificacion',
          'rolSeguridad.editar_planificacion AS rol_editar_planificacion',
          'rolSeguridad.enviar_revision_planificacion AS rol_enviar_revision_planificacion',
          'rolSeguridad.volver_borrador_planificacion AS rol_volver_borrador_planificacion',
          'rolSeguridad.aprobar_planificacion AS rol_aprobar_planificacion',
          'rolSeguridad.cerrar_planificacion AS rol_cerrar_planificacion',
          'rolSeguridad.exportar_planificacion AS rol_exportar_planificacion',
          'rolSeguridad.exportar_planificacion_lote AS rol_exportar_planificacion_lote',
          'rolSeguridad.gestionar_codigos_operativos AS rol_gestionar_codigos_operativos',
          'rolSeguridad.gestionar_turnos AS rol_gestionar_turnos',
          'rolSeguridad.gestionar_servicios AS rol_gestionar_servicios',
          'personal.codigo_personal AS personal_codigo_personal',
          'personal.nombres AS personal_nombres',
          'personal.apellido_paterno AS personal_apellido_paterno',
          'personal.apellido_materno AS personal_apellido_materno',
        ])
        .where(
          input.usuarioId !== undefined
            ? 'usuario.id = :usuarioId'
            : 'usuario.username = :username',
          input.usuarioId !== undefined
            ? { usuarioId: input.usuarioId }
            : { username: input.username },
        )
        .getRawOne<UsuarioBaseRow | undefined>()) ?? null
    );
  }

  private async assertCanPersistUser(
    idUsuarioActual: number | null,
    input: GuardarUsuarioInput,
    usuarioQuedaActivo: boolean,
  ): Promise<void> {
    const duplicatedUsernameRowsUnknown: unknown = await this.dataSource.query(
      `
          SELECT TOP 1 id
          FROM dbo.usuario
          WHERE username = @0
            AND (@1 IS NULL OR id <> @1)
      `,
      [input.username, idUsuarioActual],
    );
    const duplicatedUsernameRows = duplicatedUsernameRowsUnknown as Array<{
      id: number | string;
    }>;
    const duplicatedUsername = duplicatedUsernameRows[0];

    if (duplicatedUsername) {
      throw new ConflictException(
        `Ya existe un usuario con el nombre de usuario ${input.username}. Elige otro.`,
      );
    }

    const personal =
      input.idPersonal === undefined || input.idPersonal === null
        ? null
        : await this.obtenerPersonalValidationRow(input.idPersonal);

    if (input.idPersonal) {
      if (!personal) {
        throw noEncontrado(
          'personal',
          input.idPersonal,
          TypeOrmUsuarioRepository.name,
        );
      }

      if (usuarioQuedaActivo && !personal.personal_activo) {
        throw new ConflictException(
          `No se puede dejar activo un usuario vinculado a ${nombrePersonal(personal)}, que esta inactivo en Personal. ` +
            'Reactiva primero a esa persona o desvincula la cuenta.',
        );
      }

      const duplicatedPersonalRowsUnknown: unknown =
        await this.dataSource.query(
          `
            SELECT TOP 1 id, username
            FROM dbo.usuario
            WHERE id_personal = @0
              AND activo = 1
              AND (@1 IS NULL OR id <> @1)
        `,
          [input.idPersonal, idUsuarioActual],
        );
      const duplicatedPersonalRows = duplicatedPersonalRowsUnknown as Array<{
        id: number | string;
        username: string;
      }>;
      const duplicatedPersonal = duplicatedPersonalRows[0];

      if (duplicatedPersonal) {
        throw new ConflictException(
          `${capitalizarInicio(nombrePersonal(personal))} ya tiene un usuario activo (${duplicatedPersonal.username}). ` +
            'Desactiva esa cuenta o vincula a otra persona.',
        );
      }
    }

    const rolSeguridad =
      input.idRolSeguridad === undefined || input.idRolSeguridad === null
        ? null
        : await this.obtenerRolValidationRow(input.idRolSeguridad);

    if (input.idRolSeguridad && !rolSeguridad) {
      throw noEncontrado(
        'rolSeguridad',
        input.idRolSeguridad,
        TypeOrmUsuarioRepository.name,
      );
    }

    if (usuarioQuedaActivo && !rolSeguridad) {
      throw new ConflictException(
        'No se puede dejar un usuario activo sin rol de seguridad. Asigna un rol antes de guardar o reactivar la cuenta.',
      );
    }

    if (
      usuarioQuedaActivo &&
      rolSeguridad &&
      (rolSeguridad.alcance_planificacion === 'DEPARTAMENTO' ||
        rolSeguridad.alcance_planificacion === 'SERVICIO')
    ) {
      if (!input.idPersonal) {
        throw new ConflictException(
          `El rol de seguridad "${rolSeguridad.nombre}" requiere vincular una persona, porque su alcance es por ${rolSeguridad.alcance_planificacion.toLowerCase()}.`,
        );
      }

      if (!personal) {
        throw noEncontrado(
          'personal',
          input.idPersonal,
          TypeOrmUsuarioRepository.name,
        );
      }

      if (
        rolSeguridad.alcance_planificacion === 'DEPARTAMENTO' &&
        Number(personal.total_jefaturas_departamento_activas) <= 0
      ) {
        throw new ConflictException(
          `${capitalizarInicio(nombrePersonal(personal))} no tiene una asignacion activa como jefatura de departamento. Regulariza primero su asignacion en Personal.`,
        );
      }

      if (
        rolSeguridad.alcance_planificacion === 'SERVICIO' &&
        Number(personal.total_jefaturas_servicio_activas) <= 0
      ) {
        throw new ConflictException(
          `${capitalizarInicio(nombrePersonal(personal))} no tiene una asignacion activa como jefatura de servicio. Regulariza primero su asignacion en Personal.`,
        );
      }
    }

    if (!idUsuarioActual && !input.password) {
      throw new ConflictException(
        'La contrasena es obligatoria para crear usuarios locales.',
      );
    }
  }

  private async assertCanActivateUser(idUsuario: number): Promise<void> {
    const row = await this.obtenerUsuarioActivationRow(idUsuario);

    if (!row) {
      throw noEncontrado('usuario', idUsuario, TypeOrmUsuarioRepository.name);
    }

    const input: GuardarUsuarioInput = {
      idPersonal:
        row.usuario_id_personal === null
          ? null
          : Number(row.usuario_id_personal),
      idRolSeguridad:
        row.usuario_id_rol === null ? null : Number(row.usuario_id_rol),
      tipoUsuario: row.usuario_tipo_usuario,
      username: row.usuario_username,
    };

    await this.assertCanPersistUser(idUsuario, input, true);
  }

  private async obtenerRolValidationRow(
    idRolSeguridad: number,
  ): Promise<RolValidationRow | null> {
    const rowsUnknown: unknown = await this.dataSource.query(
      `
        SELECT TOP 1 id, nombre, alcance_planificacion
        FROM dbo.rol_seguridad
        WHERE id = @0
      `,
      [idRolSeguridad],
    );

    const rows = rowsUnknown as RolValidationRow[];
    return rows[0] ?? null;
  }

  private async obtenerPersonalValidationRow(
    idPersonal: number,
  ): Promise<PersonalValidationRow | null> {
    const rowsUnknown: unknown = await this.dataSource.query(
      `
        SELECT
          personal.id AS personal_id,
          personal.activo AS personal_activo,
          personal.nombres AS personal_nombres,
          personal.apellido_paterno AS personal_apellido_paterno,
          personal.apellido_materno AS personal_apellido_materno,
          SUM(
            CASE
              WHEN asignacion.activo = 1
               AND rolFuncional.es_jefatura = 1
               AND rolFuncional.alcance_organizativo = 'DEPARTAMENTO'
              THEN 1
              ELSE 0
            END
          ) AS total_jefaturas_departamento_activas,
          SUM(
            CASE
              WHEN asignacion.activo = 1
               AND rolFuncional.es_jefatura = 1
               AND rolFuncional.alcance_organizativo = 'SERVICIO'
              THEN 1
              ELSE 0
            END
          ) AS total_jefaturas_servicio_activas
        FROM dbo.personal personal
        LEFT JOIN dbo.asignacion_personal asignacion
          ON asignacion.id_personal = personal.id
        LEFT JOIN dbo.rol_funcional rolFuncional
          ON rolFuncional.id = asignacion.id_rol_funcional
        WHERE personal.id = @0
        GROUP BY
          personal.id,
          personal.activo,
          personal.nombres,
          personal.apellido_paterno,
          personal.apellido_materno
      `,
      [idPersonal],
    );

    const rows = rowsUnknown as PersonalValidationRow[];
    return rows[0] ?? null;
  }

  private async obtenerUsuarioActivationRow(
    idUsuario: number,
  ): Promise<UsuarioActivationRow | null> {
    const rowsUnknown: unknown = await this.dataSource.query(
      `
        SELECT TOP 1
          id AS usuario_id,
          id_personal AS usuario_id_personal,
          id_rol_seguridad AS usuario_id_rol,
          tipo_usuario AS usuario_tipo_usuario,
          username AS usuario_username
        FROM dbo.usuario
        WHERE id = @0
      `,
      [idUsuario],
    );

    const rows = rowsUnknown as UsuarioActivationRow[];
    return rows[0] ?? null;
  }
}

interface UsuarioBaseRow {
  usuario_id: number | string;
  usuario_id_personal: number | string | null;
  usuario_id_rol: number | string | null;
  usuario_tipo_usuario: string;
  usuario_proveedor_autenticacion: string;
  usuario_sujeto_autenticacion: string | null;
  usuario_username: string;
  usuario_password_hash: string | null;
  usuario_activo: boolean;
  rol_codigo: string | null;
  rol_nombre: string | null;
  rol_alcance_planificacion: string | null;
  rol_puede_ver_organizacion: boolean | null;
  rol_puede_ver_personal: boolean | null;
  rol_puede_gestionar_personal: boolean | null;
  rol_puede_ver_asignaciones: boolean | null;
  rol_puede_gestionar_asignaciones: boolean | null;
  rol_puede_ver_seguridad: boolean | null;
  rol_puede_gestionar_usuarios: boolean | null;
  rol_puede_ver_operacion: boolean | null;
  rol_puede_ver_planificacion: boolean | null;
  rol_puede_editar_planificacion: boolean | null;
  rol_puede_aprobar_planificacion: boolean | null;
  rol_puede_ver_reportes: boolean | null;
  rol_ver_calendarios: boolean | null;
  rol_gestionar_calendarios: boolean | null;
  rol_ver_incidencias_personales: boolean | null;
  rol_gestionar_incidencias_personales: boolean | null;
  rol_gestionar_tipos_feriado: boolean | null;
  rol_ver_cargas_horarias: boolean | null;
  rol_gestionar_cargas_horarias: boolean | null;
  rol_ver_turnos: boolean | null;
  rol_crear_planificacion: boolean | null;
  rol_editar_planificacion: boolean | null;
  rol_enviar_revision_planificacion: boolean | null;
  rol_volver_borrador_planificacion: boolean | null;
  rol_aprobar_planificacion: boolean | null;
  rol_cerrar_planificacion: boolean | null;
  rol_exportar_planificacion: boolean | null;
  rol_exportar_planificacion_lote: boolean | null;
  rol_gestionar_codigos_operativos: boolean | null;
  rol_gestionar_turnos: boolean | null;
  rol_gestionar_servicios: boolean | null;
  personal_codigo_personal: string | null;
  personal_nombres: string | null;
  personal_apellido_paterno: string | null;
  personal_apellido_materno: string | null;
}

interface RolValidationRow {
  id: number | string;
  nombre: string;
  alcance_planificacion: string | null;
}

interface PersonalValidationRow {
  personal_id: number | string;
  personal_activo: boolean;
  personal_nombres: string | null;
  personal_apellido_paterno: string | null;
  personal_apellido_materno: string | null;
  total_jefaturas_departamento_activas: number | string;
  total_jefaturas_servicio_activas: number | string;
}

interface UsuarioActivationRow {
  usuario_id: number | string;
  usuario_id_personal: number | string | null;
  usuario_id_rol: number | string | null;
  usuario_tipo_usuario: string;
  usuario_username: string;
}

function buildFullName(
  nombres: string | null,
  apellidoPaterno: string | null,
  apellidoMaterno: string | null,
): string | null {
  const fullName = [nombres, apellidoPaterno, apellidoMaterno]
    .filter((value) => Boolean(value))
    .join(' ');

  return fullName ? fullName : null;
}

// Para mensajes al usuario: el nombre de la persona, no su id.
function nombrePersonal(row: PersonalValidationRow): string {
  return (
    buildFullName(
      row.personal_nombres,
      row.personal_apellido_paterno,
      row.personal_apellido_materno,
    ) ?? 'la persona seleccionada'
  );
}

function capitalizarInicio(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function buildTokenHash(tokenSesion: string): string {
  return createHash('sha256').update(tokenSesion).digest('hex');
}
