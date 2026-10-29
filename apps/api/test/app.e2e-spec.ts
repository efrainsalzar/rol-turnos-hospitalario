import { readFileSync } from 'node:fs';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { resolveFromProjectRoot } from '../src/infrastructure/config/project-root';
import { TYPEORM_DATA_SOURCE } from '../src/infrastructure/persistence/typeorm/typeorm.constants';
import { IniciarSesionPasswordUseCase } from '../src/modules/seguridad/application/use-cases/iniciar-sesion-password.use-case';

interface PersonalOperacionResponseBody {
  id: number;
  codigoPersonal: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  activo: boolean;
}

interface PersonalDetalleResponseBody {
  id: number;
  codigoPersonal: string;
  activo: boolean;
  servicioActual: {
    codigo: string;
  } | null;
  departamentoActual: {
    codigo: string;
  } | null;
  asignacionesVigentes: Array<unknown>;
  asignacionesHistoricas: Array<unknown>;
}

interface AsignacionOperacionResponseBody {
  id: number;
  idPersonal: number;
  codigoRolFuncional: string | null;
  codigoServicio: string | null;
  codigoTipoContrato: string | null;
  codigoCargaHoraria: string | null;
  nroItem: string | null;
  tipoAsignacion: string;
  esPrincipal: boolean;
  activo: boolean;
  fechaFin?: string | null;
}

interface FeriadoOperacionResponseBody {
  id: number;
  idTipoFeriado: number;
  codigoTipoFeriado: string;
  nombreTipoFeriado: string;
  nombre: string;
  anio: number;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

interface PlanificacionOperacionResponseBody {
  id: number;
  idServicio: number;
  anio: number;
  mes: number;
  estado: 'BORRADOR' | 'REVISION' | 'APROBADA' | 'CERRADA';
  activo: boolean;
}

interface MatrizMensualPlanificacionResponseBody {
  planificacion: {
    id: number;
    idServicio: number;
    codigoServicio: string | null;
    nombreServicio: string | null;
    anio: number;
    mes: number;
    version: number;
    estado: 'BORRADOR' | 'REVISION' | 'APROBADA' | 'CERRADA';
  };
  dias: Array<{
    idCalendario: number;
    fecha: string;
    diaMes: number;
    abreviaturaDiaSemana: string;
    esFeriado?: boolean;
  }>;
  filas: Array<{
    numeroFila: number;
    idAsignacionPersonal: number;
    codigoPersonal: string | null;
    rolFuncionalCodigo: string | null;
    esJefatura: boolean;
    nroItem: string | null;
    cargaHorariaCodigo: string | null;
    tipoContratoCodigo: string | null;
    totalHorasMes: number;
    horarioResumen: string;
    observacionMensual: string | null;
    dias: Array<{
      idCalendario: number;
      valorVisual: string;
      observacionDiaria: string | null;
      registros: Array<{
        idRolTurno: number;
      }>;
    }>;
  }>;
  resumen: {
    totalPersonas: number;
    totalDias: number;
    totalRegistros: number;
    totalHorasMes: number;
  };
}

describe('Backend e2e — flujos operativos', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  let idServicioEnfS1: number;
  let idServicioEnfS2: number;
  let idServicioE2eS3: number;
  let idTipoContratoTgn: number;
  let idCargaHorariaTc: number;
  let idNivelCargoLic: number;
  let idRolFuncionalAsistencial: number;
  let idRolFuncionalJefeServicio: number;
  let idRolFuncionalJefeDepartamento: number;
  let idDepartamentoE2e: number;
  let idRolSeguridadJefeDepartamento: number;
  let idRolSeguridadJefeServicio: number;
  let idUsuarioAdmin: number;
  let tokenSesionAdmin: string;

  jest.setTimeout(30_000);

  beforeAll(async () => {
    loadEnvFile();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidUnknownValues: false,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    dataSource = app.get<DataSource>(TYPEORM_DATA_SOURCE);

    // Fuente de verdad vigente para dejar la base en estado utilizable: los
    // seeds dev-00N (database/seeds/README.md), no el dataset ficticio
    // "enfermeria-fase1" que se elimino el 2026-07-06 por estar desactualizado
    // frente al esquema actual. Idempotentes (MERGE), seguros de re-ejecutar.
    await executeSqlFile(
      dataSource,
      'database/seeds/dev-001_departamentos.sql',
    );
    await executeSqlFile(dataSource, 'database/seeds/dev-002_servicios.sql');
    await executeSqlFile(dataSource, 'database/seeds/dev-003_nivel_cargo.sql');
    await executeSqlFile(dataSource, 'database/seeds/dev-004_personal.sql');
    await executeSqlFile(
      dataSource,
      'database/seeds/dev-005_tipo_contrato.sql',
    );
    await executeSqlFile(
      dataSource,
      'database/seeds/dev-006_carga_horaria.sql',
    );
    await executeSqlFile(dataSource, 'database/seeds/dev-007_usuario.sql');

    // Departamento y servicios propios y dedicados para estos tests, NUNCA
    // las entidades reales del seed (ENF ya tiene un jefe de departamento
    // real, y ENF-S1/ENF-S2 ya tenian datos reales de uso manual del dev
    // antes de esta sesion). Usar entidades ajenas hubiera hecho que los
    // escenarios de jefatura dependieran de un estado que no controlamos ni
    // debemos tocar. WHEN MATCHED re-parenta E2E-S1/E2E-S2 si un run previo
    // (antes de que existiera este departamento dedicado) los dejo bajo ENF.
    await dataSource.query(`
      MERGE dbo.departamento AS t
      USING (SELECT 'E2E-DEP' AS codigo, N'Departamento E2E (flujos operativos)' AS nombre) AS s
      ON t.codigo = s.codigo
      WHEN NOT MATCHED THEN
        INSERT (codigo, nombre, descripcion, activo, created_at, updated_at)
        VALUES (s.codigo, s.nombre, s.nombre, 1, GETDATE(), GETDATE());
    `);

    await dataSource.query(`
      MERGE dbo.servicio AS t
      USING (
        SELECT d.id AS id_departamento, s.codigo, s.nombre
        FROM (VALUES
          ('E2E-S1', N'Servicio E2E 1 (flujos operativos)'),
          ('E2E-S2', N'Servicio E2E 2 (flujos operativos)'),
          ('E2E-S3', N'Servicio E2E 3 (sesion de edicion)')
        ) AS s(codigo, nombre)
        CROSS JOIN (SELECT id FROM dbo.departamento WHERE codigo = 'E2E-DEP') AS d
      ) AS s
      ON t.codigo = s.codigo
      WHEN MATCHED AND t.id_departamento <> s.id_departamento THEN
        UPDATE SET id_departamento = s.id_departamento, updated_at = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (id_departamento, codigo, nombre, activo, created_at, updated_at)
        VALUES (s.id_departamento, s.codigo, s.nombre, 1, GETDATE(), GETDATE());
    `);

    const rows = (await dataSource.query(`
      SELECT
        (SELECT id FROM dbo.servicio WHERE codigo = 'E2E-S1') AS id_servicio_enf_s1,
        (SELECT id FROM dbo.servicio WHERE codigo = 'E2E-S2') AS id_servicio_enf_s2,
        (SELECT id FROM dbo.servicio WHERE codigo = 'E2E-S3') AS id_servicio_e2e_s3,
        (SELECT id FROM dbo.tipo_contrato WHERE codigo = 'TGN') AS id_tipo_contrato_tgn,
        (SELECT id FROM dbo.carga_horaria WHERE codigo = 'TC') AS id_carga_horaria_tc,
        (SELECT id FROM dbo.nivel_cargo WHERE codigo = 'LIC') AS id_nivel_cargo_lic,
        (SELECT id FROM dbo.rol_funcional WHERE codigo = 'ASISTENCIAL') AS id_rol_funcional_asistencial,
        (SELECT id FROM dbo.rol_funcional WHERE codigo = 'JEFE_SERVICIO') AS id_rol_funcional_jefe_servicio,
        (SELECT id FROM dbo.rol_funcional WHERE codigo = 'JEFE_DEPARTAMENTO') AS id_rol_funcional_jefe_departamento,
        (SELECT id FROM dbo.departamento WHERE codigo = 'E2E-DEP') AS id_departamento_e2e,
        (SELECT id FROM dbo.rol_seguridad WHERE codigo = 'JEFE_DEPARTAMENTO') AS id_rol_seguridad_jefe_departamento,
        (SELECT id FROM dbo.rol_seguridad WHERE codigo = 'JEFE_SERVICIO') AS id_rol_seguridad_jefe_servicio,
        (SELECT id FROM dbo.usuario WHERE username = 'admin.sistema') AS id_usuario_admin
    `)) as unknown;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(
        'No se pudieron resolver los ids base (dev-00N) para las pruebas e2e de flujos operativos.',
      );
    }

    const row = rows[0] as Record<string, number | string>;
    idServicioEnfS1 = Number(row.id_servicio_enf_s1);
    idServicioEnfS2 = Number(row.id_servicio_enf_s2);
    idServicioE2eS3 = Number(row.id_servicio_e2e_s3);
    idTipoContratoTgn = Number(row.id_tipo_contrato_tgn);
    idCargaHorariaTc = Number(row.id_carga_horaria_tc);
    idNivelCargoLic = Number(row.id_nivel_cargo_lic);
    idRolFuncionalAsistencial = Number(row.id_rol_funcional_asistencial);
    idRolFuncionalJefeServicio = Number(row.id_rol_funcional_jefe_servicio);
    idRolFuncionalJefeDepartamento = Number(
      row.id_rol_funcional_jefe_departamento,
    );
    idDepartamentoE2e = Number(row.id_departamento_e2e);
    idRolSeguridadJefeDepartamento = Number(
      row.id_rol_seguridad_jefe_departamento,
    );
    idRolSeguridadJefeServicio = Number(row.id_rol_seguridad_jefe_servicio);
    idUsuarioAdmin = Number(row.id_usuario_admin);

    // ActorContextGuard exige Authorization: Bearer <token> de un login real
    // (el header x-user-id que usaban los tests viejos ya no se lee en ningun
    // lado del backend actual). dev-007_usuario.sql documenta la password.
    const loginResponse = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ username: 'admin.sistema', password: 'Admin1234!' })
      .expect(200);
    tokenSesionAdmin = (loginResponse.body as { tokenSesion: string })
      .tokenSesion;

    // Deja E2E-S1/E2E-S2/E2E-DEP sin jefatura activa antes de arrancar, para
    // que la suite sea re-ejecutable incluso si un run previo fallo a mitad
    // de camino y dejo colgada la jefatura de un actor auxiliar (ej. el jefe
    // de departamento de crearActorJefeDepartamento): solo toca asignaciones
    // de personal E2E-*, nunca datos reales (un personal real jamas tiene ese
    // prefijo de codigo). fecha_fin usa una fecha lejana fija (no GETDATE())
    // para no chocar con ck_asignacion_personal_fechas (fecha_fin >=
    // fecha_inicio): la fecha servidor vs la fecha cliente (hoyIso(), usada
    // al crear en los tests) pueden diferir por huso horario y dejar
    // fecha_inicio > GETDATE().
    await dataSource.query(
      `
        UPDATE ap
        SET ap.activo = 0, ap.fecha_fin = '2099-01-01', ap.updated_at = GETUTCDATE()
        FROM dbo.asignacion_personal ap
        INNER JOIN dbo.personal p ON p.id = ap.id_personal
        WHERE (ap.id_servicio IN (@0, @1, @3) OR ap.id_departamento = @2)
          AND ap.activo = 1
          AND p.codigo_personal LIKE 'E2E-%'
      `,
      [idServicioEnfS1, idServicioEnfS2, idDepartamentoE2e, idServicioE2eS3],
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  function hoyIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // POST /v1/auth/login comparte un limite de 5 intentos/60s por IP con toda
  // la suite (proteccion real de fuerza bruta, seguridad.module.ts) y la
  // suite ya usa ese cupo casi completo. Para actores auxiliares que solo
  // necesitan un token valido (no estan probando el login en si), resolver
  // la sesion invocando el mismo caso de uso en proceso evita consumir cupo
  // HTTP sin debilitar el throttle real de ningun endpoint de produccion.
  async function loginDirecto(
    username: string,
    password: string,
  ): Promise<string> {
    const sesion = await app
      .get(IniciarSesionPasswordUseCase)
      .execute(username, password);
    return sesion.tokenSesion;
  }

  // GET /v1/calendarios ya no genera dias faltantes por si solo (la
  // generacion automatica se removio de ese endpoint por seguridad) — hay que
  // asegurar el mes explicitamente antes de leerlo. asegurarMes es idempotente
  // (MERGE), seguro de llamar aunque el mes ya este generado.
  async function asegurarCalendarioMes(
    anio: number,
    mes: number,
  ): Promise<void> {
    await asActor(
      request(app.getHttpServer()).post('/v1/calendarios/generar'),
      tokenSesionAdmin,
    )
      .send({ anio, mes })
      .expect(201);
  }

  async function obtenerIdTipoFeriado(codigo: string): Promise<number> {
    const rows = await dataSource.query<Array<{ id: number | string }>>(
      `SELECT TOP 1 id FROM dbo.tipo_feriado WHERE codigo = @0`,
      [codigo],
    );

    if (!rows[0]) {
      throw new Error(
        `No se encontro tipo_feriado con codigo ${codigo} en el fixture.`,
      );
    }

    return Number(rows[0].id);
  }

  async function crearPersonalUnico(
    prefijo: string,
  ): Promise<{ id: number; codigoPersonal: string }> {
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const codigoPersonal = `E2E-${prefijo}-${marca}`;

    const response = await asActor(
      request(app.getHttpServer()).post('/v1/personal'),
      tokenSesionAdmin,
    )
      .send({
        codigoPersonal,
        nombres: prefijo,
        apellidoPaterno: 'Prueba',
        documentoIdentidad: `9${marca}`.slice(0, 15),
        idNivelCargo: idNivelCargoLic,
      })
      .expect(201);

    return {
      id: (response.body as PersonalOperacionResponseBody).id,
      codigoPersonal,
    };
  }

  function crearAsignacion(input: {
    idPersonal: number;
    idServicio: number;
    idRolFuncional: number;
    tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
  }) {
    return asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    ).send({
      idPersonal: input.idPersonal,
      idServicio: input.idServicio,
      idTipoContrato: idTipoContratoTgn,
      idCargaHoraria: idCargaHorariaTc,
      idRolFuncional: input.idRolFuncional,
      // Sin nroItem: el backend lo resuelve/reutiliza segun el personal (el
      // Nro. ITEM es del PERSONAL, no de la asignacion puntual — pasar un
      // valor nuevo en cada llamada para el mismo personal rompe con 409
      // "ya esta definido y no puede modificarse desde asignaciones").
      codigoFuenteItem: 'MIN',
      tipoAsignacion: input.tipoAsignacion,
      esPrincipal: input.tipoAsignacion === 'PRINCIPAL',
      fechaInicio: hoyIso(),
    });
  }

  function crearAsignacionDepartamento(input: {
    idPersonal: number;
    idDepartamento: number;
    idRolFuncional: number;
    tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
  }) {
    return asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    ).send({
      idPersonal: input.idPersonal,
      idDepartamento: input.idDepartamento,
      idTipoContrato: idTipoContratoTgn,
      idCargaHoraria: idCargaHorariaTc,
      idRolFuncional: input.idRolFuncional,
      codigoFuenteItem: 'MIN',
      tipoAsignacion: input.tipoAsignacion,
      esPrincipal: input.tipoAsignacion === 'PRINCIPAL',
      fechaInicio: hoyIso(),
    });
  }

  // Crea turno + planificacion (de servicio o de departamento, segun lo que se
  // pase) + una fila real de rol_turno para una fecha futura, usada para
  // reproducir el bug de la seccion 48 (la deteccion de conflicto fallaba para
  // unidades de alcance departamento).
  async function cargarTurnoFuturoParaAsignacion(input: {
    idAsignacion: number;
    idServicio?: number;
    idDepartamento?: number;
    periodo: { anio: number; mes: number };
  }): Promise<void> {
    const turnoResponse = await asActor(
      request(app.getHttpServer()).post('/v1/turnos'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: input.idServicio,
        idDepartamento: input.idDepartamento,
        codigo: `E2ET${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`,
        nombre: 'Turno E2E seccion 48',
        horaInicio: '07:00',
        horaFin: '19:00',
        vigenciaDesde: '2026-01-01',
      })
      .expect(201);
    const idTurno = (turnoResponse.body as { id: number }).id;

    await asegurarCalendarioMes(input.periodo.anio, input.periodo.mes);
    const calendariosResponse = await asActor(
      request(app.getHttpServer()).get(
        `/v1/calendarios?anio=${input.periodo.anio}&mes=${input.periodo.mes}`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const idCalendario = (
      calendariosResponse.body as { data: Array<{ id: number }> }
    ).data[0].id;

    const planificacionResponse = await asActor(
      request(app.getHttpServer()).post('/v1/planificaciones'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: input.idServicio,
        idDepartamento: input.idDepartamento,
        anio: input.periodo.anio,
        mes: input.periodo.mes,
        idUsuarioCreador: idUsuarioAdmin,
      })
      .expect(201);
    const idPlanificacion = (
      planificacionResponse.body as PlanificacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/planificaciones/${idPlanificacion}/rol-turnos`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idAsignacionPersonal: input.idAsignacion,
        idCalendario,
        secuenciaDia: 1,
        idTurno,
        horasProgramadas: 12,
        idUsuarioOperacion: idUsuarioAdmin,
      })
      .expect(201);
  }

  async function crearActorJefeDepartamento(usarLoginDirecto = false): Promise<{
    tokenSesion: string;
    idPersonal: number;
    idAsignacion: number;
  }> {
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const personal = await crearPersonalUnico('JDEPTO');

    const asignacionJefeDepto = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personal.id,
        idDepartamento: idDepartamentoE2e,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeDepartamento,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: hoyIso(),
      })
      .expect(201);

    const username = `e2e.jefedepto.${marca}`;
    await asActor(
      request(app.getHttpServer()).post('/v1/usuarios'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personal.id,
        idRolSeguridad: idRolSeguridadJefeDepartamento,
        tipoUsuario: 'PERSONAL',
        username,
        password: 'JefeDepto1234!',
      })
      .expect(201);

    const tokenSesion = usarLoginDirecto
      ? await loginDirecto(username, 'JefeDepto1234!')
      : (
          (
            await request(app.getHttpServer())
              .post('/v1/auth/login')
              .send({ username, password: 'JefeDepto1234!' })
              .expect(200)
          ).body as { tokenSesion: string }
        ).tokenSesion;

    return {
      tokenSesion,
      idPersonal: personal.id,
      idAsignacion: (
        asignacionJefeDepto.body as AsignacionOperacionResponseBody
      ).id,
    };
  }

  async function crearActorJefeServicio(idServicio: number): Promise<{
    tokenSesion: string;
    idPersonal: number;
    idAsignacion: number;
  }> {
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const personal = await crearPersonalUnico('JSERV');

    const asignacionJefeServicio = await crearAsignacion({
      idPersonal: personal.id,
      idServicio,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);

    const username = `e2e.jefeservicio.${marca}`;
    await asActor(
      request(app.getHttpServer()).post('/v1/usuarios'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personal.id,
        idRolSeguridad: idRolSeguridadJefeServicio,
        tipoUsuario: 'PERSONAL',
        username,
        password: 'JefeServicio1234!',
      })
      .expect(201);

    const tokenSesion = await loginDirecto(username, 'JefeServicio1234!');

    return {
      tokenSesion,
      idPersonal: personal.id,
      idAsignacion: (
        asignacionJefeServicio.body as AsignacionOperacionResponseBody
      ).id,
    };
  }

  it('REGRESION: nombrar jefe de servicio en una unidad con jefe activo siempre responde 409, sin atajo de reemplazo automatico para ningun actor, ni siquiera Administracion del sistema (docs/database/decisiones-tecnicas.md seccion 55)', async () => {
    const jefeDepto = await crearActorJefeDepartamento();

    const personalJefeActual = await crearPersonalUnico('JEFEVIG');
    const asignacionJefeActual = await crearAsignacion({
      idPersonal: personalJefeActual.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionJefeActual = (
      asignacionJefeActual.body as AsignacionOperacionResponseBody
    ).id;

    const personalNuevo = await crearPersonalUnico('JEFENVO');

    // El jefe de departamento intenta nombrar un nuevo jefe de servicio en una
    // unidad de su propio departamento que ya tiene jefe activo. No existe
    // ningun campo que fuerce un reemplazo automatico: el flujo correcto es
    // siempre en dos pasos manuales (retirar la jefatura actual, nombrar la
    // nueva por separado).
    await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      jefeDepto.tokenSesion,
    )
      .send({
        idPersonal: personalNuevo.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: hoyIso(),
      })
      .expect(409);

    // Lo mismo para Administracion del sistema: tampoco tiene atajo.
    const personalNuevoAdmin = await crearPersonalUnico('JEFENV2');
    await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalNuevoAdmin.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: hoyIso(),
      })
      .expect(409);

    // La jefatura vigente sigue activa: no se cerro por ninguna via lateral.
    const detalleJefeActual = await asActor(
      request(app.getHttpServer()).get(
        `/v1/personal/${personalJefeActual.id}/detalle`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const vigentesJefeActual = (
      detalleJefeActual.body as PersonalDetalleResponseBody
    ).asignacionesVigentes as Array<{ id: number }>;
    expect(
      vigentesJefeActual.some((item) => item.id === idAsignacionJefeActual),
    ).toBe(true);

    // Limpieza: libera E2E-S1 y E2E-DEP para no interferir con otros runs.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionJefeActual}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${jefeDepto.idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('Actualizar una asignacion sin cambios reales no genera un nuevo evento de historial (evita ruido en historial_asignacion)', async () => {
    const personalF = await crearPersonalUnico('NOCAMB');
    const asignacion = await crearAsignacion({
      idPersonal: personalF.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionF = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    const historialAntes = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.historial_asignacion WHERE id_asignacion_personal = @0`,
      [idAsignacionF],
    );

    // Reenvia exactamente los mismos datos con los que se creo la asignacion.
    await asActor(
      request(app.getHttpServer()).put(`/v1/asignaciones/${idAsignacionF}`),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalF.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        fechaInicio: hoyIso(),
        motivo: 'Reenvio sin cambios, prueba e2e.',
      })
      .expect(200);

    const historialDespues = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.historial_asignacion WHERE id_asignacion_personal = @0`,
      [idAsignacionF],
    );

    expect(Number(historialDespues[0].total)).toBe(
      Number(historialAntes[0].total),
    );

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionF}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('82.1 (decisiones-tecnicas seccion 82): cerrar una asignacion registra el evento CIERRE sin destino (antes duplicaba el origen) y el historial expone la vigencia real de la asignacion', async () => {
    const personalCierre = await crearPersonalUnico('CIERREV');
    const asignacion = await crearAsignacion({
      idPersonal: personalCierre.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e, seccion 82.' })
      .expect(201);

    const historial = await dataSource.query<
      Array<{
        tipo_evento: string;
        id_servicio_destino: number | null;
        id_departamento_destino: number | null;
      }>
    >(
      `SELECT tipo_evento, id_servicio_destino, id_departamento_destino
       FROM dbo.historial_asignacion
       WHERE id_asignacion_personal = @0 AND tipo_evento = 'CIERRE'`,
      [idAsignacion],
    );

    expect(historial).toHaveLength(1);
    expect(historial[0].id_servicio_destino).toBeNull();
    expect(historial[0].id_departamento_destino).toBeNull();

    const detalle = await asActor(
      request(app.getHttpServer()).get(
        `/v1/personal/${personalCierre.id}/detalle`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const historicas = (detalle.body as PersonalDetalleResponseBody)
      .asignacionesHistoricas as Array<{
      tipoEvento: string;
      fechaInicioAsignacion: string;
      fechaFinAsignacion: string | null;
      servicioDestino: { nombre: string | null };
      departamentoDestino: { nombre: string | null };
    }>;
    const cierre = historicas.find((item) => item.tipoEvento === 'CIERRE');

    expect(cierre?.fechaInicioAsignacion).toBeTruthy();
    expect(cierre?.fechaFinAsignacion).toBeTruthy();
    expect(cierre?.servicioDestino.nombre).toBeNull();
    expect(cierre?.departamentoDestino.nombre).toBeNull();
  });

  it('85 (decisiones-tecnicas seccion 85): quitar una asignacion de jefatura esta permitido, desactiva el usuario vinculado y el historial CIERRE registra el rol funcional de origen', async () => {
    const marca = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const personalJefe = await crearPersonalUnico('CIERREJF');

    // Jefatura de DEPARTAMENTO (no de servicio): es el unico alcance para el que
    // este archivo ya tiene un rol_seguridad de fixture (idRolSeguridadJefeDepartamento).
    // El repositorio de usuarios exige coherencia entre el alcance del rol_seguridad y
    // una jefatura funcional activa del mismo alcance (typeorm-usuario.repository.ts),
    // asi que no se puede mezclar una jefatura de SERVICIO con un rol_seguridad de
    // DEPARTAMENTO.
    const asignacionJefe = await crearAsignacionDepartamento({
      idPersonal: personalJefe.id,
      idDepartamento: idDepartamentoE2e,
      idRolFuncional: idRolFuncionalJefeDepartamento,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionJefe = (
      asignacionJefe.body as AsignacionOperacionResponseBody
    ).id;

    const username = `e2e.cierrejefe.${marca}`;
    await asActor(
      request(app.getHttpServer()).post('/v1/usuarios'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalJefe.id,
        idRolSeguridad: idRolSeguridadJefeDepartamento,
        tipoUsuario: 'PERSONAL',
        username,
        password: 'CierreJefe1234!',
      })
      .expect(201);

    const usuarioAntes = await dataSource.query<
      Array<{ id: number; activo: boolean }>
    >(`SELECT id, activo FROM dbo.usuario WHERE username = @0`, [username]);
    expect(usuarioAntes).toHaveLength(1);
    expect(usuarioAntes[0].activo).toBe(true);
    const idUsuario = usuarioAntes[0].id;

    // Quitar una jefatura ya no esta bloqueado (antes el frontend lo impedia; el
    // backend siempre lo permitio para Administracion/RRHH via assertPuedeCerrar).
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionJefe}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo: 'Retiro de jefatura, prueba e2e seccion 85.',
      })
      .expect(201);

    const usuarioDespues = await dataSource.query<Array<{ activo: boolean }>>(
      `SELECT activo FROM dbo.usuario WHERE id = @0`,
      [idUsuario],
    );
    expect(usuarioDespues[0].activo).toBe(false);

    const historial = await dataSource.query<
      Array<{ tipo_evento: string; id_rol_funcional_origen: number | null }>
    >(
      `SELECT tipo_evento, id_rol_funcional_origen
       FROM dbo.historial_asignacion
       WHERE id_asignacion_personal = @0 AND tipo_evento = 'CIERRE'`,
      [idAsignacionJefe],
    );
    expect(historial).toHaveLength(1);
    expect(Number(historial[0].id_rol_funcional_origen)).toBe(
      idRolFuncionalJefeDepartamento,
    );
  });

  it('83.1 (decisiones-tecnicas seccion 83): crear, editar y mover una asignacion con idTipoContrato o idCargaHoraria inexistente devuelve 404 — cobertura de regresion para la validacion existente de buildAssignmentContext()/assertCatalogExists(), sin cobertura previa', async () => {
    const idInexistente = 999999;
    const personalCatalogo = await crearPersonalUnico('CATLOGO');

    // Crear con idTipoContrato inexistente.
    await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalCatalogo.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idInexistente,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        tipoAsignacion: 'PRINCIPAL',
        fechaInicio: hoyIso(),
      })
      .expect(404);

    // Crear con idCargaHoraria inexistente.
    await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalCatalogo.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idInexistente,
        idRolFuncional: idRolFuncionalAsistencial,
        tipoAsignacion: 'PRINCIPAL',
        fechaInicio: hoyIso(),
      })
      .expect(404);

    const asignacion = await crearAsignacion({
      idPersonal: personalCatalogo.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    // Editar (PUT) con idCargaHoraria inexistente.
    await asActor(
      request(app.getHttpServer()).put(`/v1/asignaciones/${idAsignacion}`),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalCatalogo.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idInexistente,
        idRolFuncional: idRolFuncionalAsistencial,
        tipoAsignacion: 'PRINCIPAL',
        fechaInicio: hoyIso(),
        motivo: 'Prueba e2e, carga horaria inexistente.',
      })
      .expect(404);

    // Mover con idTipoContrato inexistente.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/mover`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        idTipoContrato: idInexistente,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        motivo: 'Prueba e2e, tipo contrato inexistente.',
      })
      .expect(404);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e, seccion 83.' })
      .expect(201);
  });

  it('Jefatura completa: no permite dos jefes activos a la vez en el mismo servicio, y libera la unidad al retirar la jefatura', async () => {
    const personalA = await crearPersonalUnico('JEFEA');
    const personalB = await crearPersonalUnico('JEFEB');

    const asignacionA = await crearAsignacion({
      idPersonal: personalA.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionA = (asignacionA.body as AsignacionOperacionResponseBody)
      .id;

    // Invariante: nunca dos jefes activos en la misma unidad.
    await crearAsignacion({
      idPersonal: personalB.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(409);

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionA}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Retiro de jefatura, prueba e2e.' })
      .expect(201);

    // La unidad quedo vacante: ahora si se puede asignar un jefe nuevo.
    const asignacionB = await crearAsignacion({
      idPersonal: personalB.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);

    expect(
      (asignacionB.body as AsignacionOperacionResponseBody).codigoRolFuncional,
    ).toBe('JEFE_SERVICIO');

    const detalleA = await asActor(
      request(app.getHttpServer()).get(`/v1/personal/${personalA.id}/detalle`),
      tokenSesionAdmin,
    ).expect(200);
    const vigentesA = (detalleA.body as PersonalDetalleResponseBody)
      .asignacionesVigentes as Array<{ id: number }>;

    expect(vigentesA.some((item) => item.id === idAsignacionA)).toBe(false);

    // Deja E2E-S1 vacante otra vez, para no interferir con los escenarios
    // siguientes ni con una proxima corrida de esta misma suite.
    const idAsignacionB = (asignacionB.body as AsignacionOperacionResponseBody)
      .id;
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionB}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('51.1 (decisiones-tecnicas seccion 51): mover (PUT) a un jefe activo directamente a otro servicio queda bloqueado (409), aunque el destino este vacante', async () => {
    // Antes de la seccion 51 esto respondia 200 y "transferia" la jefatura sin
    // pasar por un cierre explicito, dejando fecha_inicio representando la
    // jefatura vieja. Ahora se exige el flujo manual de dos pasos para
    // cualquier actor, incluida Administracion del sistema.
    const personalC = await crearPersonalUnico('JEFEC');

    const asignacionC = await crearAsignacion({
      idPersonal: personalC.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionC = (asignacionC.body as AsignacionOperacionResponseBody)
      .id;

    const movimiento = await asActor(
      request(app.getHttpServer()).put(`/v1/asignaciones/${idAsignacionC}`),
      tokenSesionAdmin,
    ).send({
      idPersonal: personalC.id,
      idServicio: idServicioEnfS2,
      idTipoContrato: idTipoContratoTgn,
      idCargaHoraria: idCargaHorariaTc,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
      fechaInicio: hoyIso(),
      motivo: 'Promocion via PUT, prueba e2e.',
    });

    expect(movimiento.status).toBe(409);

    // El flujo correcto en dos pasos si debe funcionar: (1) cerrar la
    // asignacion actual (via /cerrar, no via PUT — seccion 55 tambien bloquea
    // el PUT que combina cambio de unidad + promocion a jefatura aunque el
    // origen no fuera jefatura todavia), (2) nombrar la jefatura nueva en el
    // servicio destino con una asignacion separada.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionC}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre previo a movimiento, e2e.' })
      .expect(201);

    const nuevaJefatura = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalC.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: hoyIso(),
      })
      .expect(201);
    const idNuevaJefatura = (
      nuevaJefatura.body as AsignacionOperacionResponseBody
    ).id;

    // Limpieza: deja la unidad EnfS2 vacante para no interferir con otros runs.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idNuevaJefatura}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('56.1 (decisiones-tecnicas seccion 56): mover una PRINCIPAL operativa a otro servicio en un solo paso funciona, cierra la fila vieja y crea una nueva con fecha propia', async () => {
    const personalY = await crearPersonalUnico('MOVOP');

    const original = await crearAsignacion({
      idPersonal: personalY.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idOriginal = (original.body as AsignacionOperacionResponseBody).id;

    const movida = await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idOriginal}/mover`),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        idRolFuncional: idRolFuncionalAsistencial,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        motivo: 'Movimiento e2e a otro servicio.',
      })
      .expect(201);
    const idMovida = (movida.body as AsignacionOperacionResponseBody).id;

    expect(idMovida).not.toBe(idOriginal);

    const detalle = await asActor(
      request(app.getHttpServer()).get(`/v1/personal/${personalY.id}/detalle`),
      tokenSesionAdmin,
    ).expect(200);
    const vigentes = (detalle.body as PersonalDetalleResponseBody)
      .asignacionesVigentes as Array<{ id: number; idServicio?: number }>;
    expect(vigentes.some((item) => item.id === idMovida)).toBe(true);
    expect(vigentes.some((item) => item.id === idOriginal)).toBe(false);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idMovida}/cerrar`),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('mover una asignacion registra un unico evento TRASLADO (no CIERRE+ALTA por separado) con origen/destino de servicio y de rol funcional', async () => {
    const personalTraslado = await crearPersonalUnico('TRASLADO');

    const original = await crearAsignacion({
      idPersonal: personalTraslado.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idOriginal = (original.body as AsignacionOperacionResponseBody).id;

    const movida = await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idOriginal}/mover`),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        idRolFuncional: idRolFuncionalJefeServicio,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        motivo: 'Movimiento e2e con cambio de rol funcional.',
      })
      .expect(201);
    const idMovida = (movida.body as AsignacionOperacionResponseBody).id;

    const historialViejo = await dataSource.query<
      Array<{ tipo_evento: string }>
    >(
      `SELECT tipo_evento FROM dbo.historial_asignacion WHERE id_asignacion_personal = @0`,
      [idOriginal],
    );
    expect(historialViejo.every((item) => item.tipo_evento !== 'CIERRE')).toBe(
      true,
    );

    const historialNuevo = await dataSource.query<
      Array<{
        tipo_evento: string;
        id_servicio_origen: number | null;
        id_servicio_destino: number | null;
        id_rol_funcional_origen: number | null;
        id_rol_funcional_destino: number | null;
      }>
    >(
      `SELECT tipo_evento, id_servicio_origen, id_servicio_destino, id_rol_funcional_origen, id_rol_funcional_destino
       FROM dbo.historial_asignacion
       WHERE id_asignacion_personal = @0`,
      [idMovida],
    );

    expect(historialNuevo).toHaveLength(1);
    expect(historialNuevo[0].tipo_evento).toBe('TRASLADO');
    expect(Number(historialNuevo[0].id_servicio_origen)).toBe(idServicioEnfS1);
    expect(Number(historialNuevo[0].id_servicio_destino)).toBe(idServicioEnfS2);
    expect(Number(historialNuevo[0].id_rol_funcional_origen)).toBe(
      idRolFuncionalAsistencial,
    );
    expect(Number(historialNuevo[0].id_rol_funcional_destino)).toBe(
      idRolFuncionalJefeServicio,
    );

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idMovida}/cerrar`),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('56.2 (decisiones-tecnicas seccion 56): nombrar como jefe de servicio a un candidato que esta operativo en otro servicio funciona en un solo paso via mover', async () => {
    const personalZ = await crearPersonalUnico('MOVJEFE');

    const original = await crearAsignacion({
      idPersonal: personalZ.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idOriginal = (original.body as AsignacionOperacionResponseBody).id;

    const movida = await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idOriginal}/mover`),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        idRolFuncional: idRolFuncionalJefeServicio,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        motivo: 'Movimiento y promocion via mover, prueba e2e.',
      })
      .expect(201);
    const movidaBody = movida.body as AsignacionOperacionResponseBody;
    const idMovida = movidaBody.id;
    expect(movidaBody.codigoRolFuncional).toBe('JEFE_SERVICIO');
    expect(movidaBody.codigoServicio).toBe('E2E-S2');

    const detalleMovida = await asActor(
      request(app.getHttpServer()).get(`/v1/personal/${personalZ.id}/detalle`),
      tokenSesionAdmin,
    ).expect(200);
    const vigentes = (detalleMovida.body as PersonalDetalleResponseBody)
      .asignacionesVigentes as Array<{ id: number }>;
    expect(vigentes.some((item) => item.id === idMovida)).toBe(true);

    // Limpieza: deja EnfS2 vacante para no interferir con otros runs.
    await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idMovida}/cerrar`),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('56.3 (decisiones-tecnicas seccion 56): mover a una unidad que ya tiene jefe activo queda bloqueado (409), igual que crear', async () => {
    const personalJefeVigente = await crearPersonalUnico('MOVOCUP1');
    const jefeVigente = await crearAsignacion({
      idPersonal: personalJefeVigente.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idJefeVigente = (jefeVigente.body as AsignacionOperacionResponseBody)
      .id;

    const personalCandidato = await crearPersonalUnico('MOVOCUP2');
    const candidato = await crearAsignacion({
      idPersonal: personalCandidato.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idCandidato = (candidato.body as AsignacionOperacionResponseBody).id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idCandidato}/mover`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        idRolFuncional: idRolFuncionalJefeServicio,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        motivo: 'Intento de mover a unidad ocupada, prueba e2e.',
      })
      .expect(409);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idJefeVigente}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idCandidato}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('56.4 (decisiones-tecnicas seccion 56): mover a la misma unidad que ya tiene la asignacion queda bloqueado (400), no es un movimiento real', async () => {
    const personalMismaUnidad = await crearPersonalUnico('MOVSAME');
    const asignacionMismaUnidad = await crearAsignacion({
      idPersonal: personalMismaUnidad.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionMismaUnidad = (
      asignacionMismaUnidad.body as AsignacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionMismaUnidad}/mover`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        idRolFuncional: idRolFuncionalAsistencial,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
      })
      .expect(400);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionMismaUnidad}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('56.5 (decisiones-tecnicas seccion 56): mover una SECUNDARIA a otro servicio funciona y no toca la PRINCIPAL de la misma persona', async () => {
    const personalSec = await crearPersonalUnico('MOVSEC');

    const principal = await crearAsignacion({
      idPersonal: personalSec.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idPrincipal = (principal.body as AsignacionOperacionResponseBody).id;

    const secundaria = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalSec.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'SECUNDARIA',
        fechaInicio: hoyIso(),
      })
      .expect(201);
    const idSecundaria = (secundaria.body as AsignacionOperacionResponseBody)
      .id;

    const secundariaMovida = await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idSecundaria}/mover`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idDepartamento: idDepartamentoE2e,
        idRolFuncional: idRolFuncionalAsistencial,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        motivo: 'Movimiento de secundaria a departamento, prueba e2e.',
      })
      .expect(201);
    const idSecundariaMovida = (
      secundariaMovida.body as AsignacionOperacionResponseBody
    ).id;

    const detalle = await asActor(
      request(app.getHttpServer()).get(
        `/v1/personal/${personalSec.id}/detalle`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const vigentes = (detalle.body as PersonalDetalleResponseBody)
      .asignacionesVigentes as Array<{ id: number }>;
    // La principal original sigue vigente: mover la secundaria no la toco.
    expect(vigentes.some((item) => item.id === idPrincipal)).toBe(true);
    expect(vigentes.some((item) => item.id === idSecundariaMovida)).toBe(true);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idSecundariaMovida}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('56.6 (decisiones-tecnicas seccion 56): un jefe de departamento puede mover, dentro de su alcance, a un candidato operativo de un servicio a otro y nombrarlo jefe, sin pasar por Administracion', async () => {
    const jefeDepto = await crearActorJefeDepartamento();

    const personalCandidato = await crearPersonalUnico('MOVDEPTO');
    const original = await crearAsignacion({
      idPersonal: personalCandidato.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idOriginal = (original.body as AsignacionOperacionResponseBody).id;

    const movida = await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idOriginal}/mover`),
      jefeDepto.tokenSesion,
    )
      .send({
        idServicio: idServicioEnfS2,
        idRolFuncional: idRolFuncionalJefeServicio,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        motivo: 'Movimiento y promocion por jefe de departamento, prueba e2e.',
      })
      .expect(201);
    const idMovida = (movida.body as AsignacionOperacionResponseBody).id;

    // Limpieza: deja EnfS2 vacante y libera la jefatura departamental del actor,
    // para no interferir con otros runs que tambien usan crearActorJefeDepartamento.
    await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idMovida}/cerrar`),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${jefeDepto.idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('52.1 (decisiones-tecnicas seccion 52): crear una SECUNDARIA con un rol de jefatura queda bloqueado (409), sin importar si la principal es jefatura', async () => {
    const personalT = await crearPersonalUnico('SECJEFE');

    const principal = await crearAsignacion({
      idPersonal: personalT.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalJefeServicio,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalT.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'SECUNDARIA',
        esPrincipal: false,
        fechaInicio: hoyIso(),
      })
      .expect(409);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('52.2 (decisiones-tecnicas seccion 52): mover (PUT) una SECUNDARIA existente hacia un rol de jefatura tambien queda bloqueado (409)', async () => {
    const personalU = await crearPersonalUnico('SECJEFE2');

    const principal = await crearAsignacion({
      idPersonal: personalU.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    const secundaria = await crearAsignacion({
      idPersonal: personalU.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(201);
    const idAsignacionSecundaria = (
      secundaria.body as AsignacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).put(
        `/v1/asignaciones/${idAsignacionSecundaria}`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalU.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        tipoAsignacion: 'SECUNDARIA',
        fechaInicio: hoyIso(),
        motivo: 'Intento de promover secundaria a jefatura, prueba e2e.',
      })
      .expect(409);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionSecundaria}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('53.1 (decisiones-tecnicas seccion 53): crear una asignacion sin idCargaHoraria queda bloqueado (400), el campo es obligatorio', async () => {
    const personalV = await crearPersonalUnico('SINCH');

    await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalV.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        // Sin idCargaHoraria.
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: hoyIso(),
      })
      .expect(400);
  });

  it('53.2 (decisiones-tecnicas seccion 53): mover (PUT) una asignacion sin idCargaHoraria queda bloqueado (400)', async () => {
    const personalW = await crearPersonalUnico('MOVSINCH');

    const creada = await crearAsignacion({
      idPersonal: personalW.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (creada.body as AsignacionOperacionResponseBody).id;

    await asActor(
      request(app.getHttpServer()).put(`/v1/asignaciones/${idAsignacion}`),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalW.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        // Sin idCargaHoraria.
        idRolFuncional: idRolFuncionalAsistencial,
        tipoAsignacion: 'PRINCIPAL',
        fechaInicio: hoyIso(),
      })
      .expect(400);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('55.1 (decisiones-tecnicas seccion 55): promover (PUT) a alguien operativo directamente a jefatura de otro servicio en el mismo paso queda bloqueado (409), no solo cuando ya era jefatura', async () => {
    // Antes de la seccion 55, ActualizarAsignacionUseCase solo bloqueaba este
    // movimiento si `anterior.esJefaturaRolFuncional` ya era true (seccion 51).
    // Una persona operativa podia saltarse el guard combinando cambio de
    // unidad + promocion a jefatura en un unico PUT.
    const personalX = await crearPersonalUnico('PROMOP');

    const asignacionX = await crearAsignacion({
      idPersonal: personalX.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionX = (asignacionX.body as AsignacionOperacionResponseBody)
      .id;

    await asActor(
      request(app.getHttpServer()).put(`/v1/asignaciones/${idAsignacionX}`),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalX.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        tipoAsignacion: 'PRINCIPAL',
        fechaInicio: hoyIso(),
        motivo: 'Promocion directa a otro servicio, prueba e2e.',
      })
      .expect(409);

    // El flujo correcto en dos pasos si funciona: (1) cerrar la asignacion
    // operativa actual, (2) nombrar la jefatura nueva por separado.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionX}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre previo a promocion, e2e.' })
      .expect(201);

    const nuevaJefatura = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalX.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalJefeServicio,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: hoyIso(),
      })
      .expect(201);
    const idNuevaJefatura = (
      nuevaJefatura.body as AsignacionOperacionResponseBody
    ).id;

    // Limpieza: deja la unidad EnfS2 vacante para no interferir con otros runs.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idNuevaJefatura}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('43.2 (decisiones-tecnicas seccion 43): cerrar una PRINCIPAL con una secundaria activa sin marcar cerrarSecundariasActivas queda bloqueado (409), no deja a la persona con secundarias huerfanas', async () => {
    const personalD = await crearPersonalUnico('SEGUNDA');

    const principal = await crearAsignacion({
      idPersonal: personalD.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    const secundaria = await crearAsignacion({
      idPersonal: personalD.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(201);
    const idAsignacionSecundaria = (
      secundaria.body as AsignacionOperacionResponseBody
    ).id;

    // Antes de la seccion 43 esto respondia 201 y dejaba la secundaria activa sin
    // ninguna principal. Ahora la cascada deja de ser opcional: se rechaza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de principal, prueba e2e.' })
      .expect(409);

    const detalle = await asActor(
      request(app.getHttpServer()).get(`/v1/personal/${personalD.id}/detalle`),
      tokenSesionAdmin,
    ).expect(200);
    const vigentes = (detalle.body as PersonalDetalleResponseBody)
      .asignacionesVigentes as Array<{ id: number }>;

    // El rechazo no debe haber tocado nada: ambas siguen activas.
    expect(vigentes.some((item) => item.id === idAsignacionPrincipal)).toBe(
      true,
    );
    expect(vigentes.some((item) => item.id === idAsignacionSecundaria)).toBe(
      true,
    );

    // Limpieza: cierra con la cascada obligatoria.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo: 'Cierre de prueba e2e.',
        cerrarSecundariasActivas: true,
      })
      .expect(201);
  });

  it('43.1 (decisiones-tecnicas seccion 43): crear una asignacion SECUNDARIA para una persona sin PRINCIPAL activa queda bloqueado (409)', async () => {
    const personalG = await crearPersonalUnico('SINPPAL');

    await crearAsignacion({
      idPersonal: personalG.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(409);
  });

  it('43.1 (decisiones-tecnicas seccion 43): degradar via PUT la unica PRINCIPAL activa de una persona a SECUNDARIA queda bloqueado (409)', async () => {
    const personalH = await crearPersonalUnico('DEGRADA');

    const principal = await crearAsignacion({
      idPersonal: personalH.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).put(
        `/v1/asignaciones/${idAsignacionPrincipal}`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalH.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'SECUNDARIA',
        fechaInicio: hoyIso(),
        motivo: 'Intento de degradar la unica principal, prueba e2e.',
      })
      .expect(409);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('B7 (matriz 5.6, decisiones-tecnicas seccion 42): un jefe de departamento puede crear una asignacion SECUNDARIA dentro de su alcance', async () => {
    const jefeDepto = await crearActorJefeDepartamento();
    const personalE = await crearPersonalUnico('SECDEPTO');

    const principal = await crearAsignacion({
      idPersonal: personalE.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    const secundaria = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      jefeDepto.tokenSesion,
    )
      .send({
        idPersonal: personalE.id,
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'SECUNDARIA',
        esPrincipal: false,
        fechaInicio: hoyIso(),
      })
      .expect(201);

    expect(
      (secundaria.body as AsignacionOperacionResponseBody).tipoAsignacion,
    ).toBe('SECUNDARIA');

    // Limpieza.
    const idAsignacionSecundaria = (
      secundaria.body as AsignacionOperacionResponseBody
    ).id;
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionSecundaria}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${jefeDepto.idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('44 (decisiones-tecnicas seccion 44): crear una segunda asignacion en el MISMO servicio responde el 409 correcto de "duplicada", no el mensaje de planificacion abierta que la enmascaraba antes', async () => {
    const personalI = await crearPersonalUnico('DUPSERV');

    await crearAsignacion({
      idPersonal: personalI.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);

    // Antes de la seccion 44, `crearAsignacion` corria un chequeo de
    // "planificacion abierta para la persona" ANTES de `assertCanPersistAssignment`,
    // asi que este intento de duplicar la unidad respondia con el mensaje confuso de
    // turnos/incidencias en vez del 409 real de duplicado. Ahora responde el mensaje
    // correcto directamente.
    const duplicado = await crearAsignacion({
      idPersonal: personalI.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(409);

    expect((duplicado.body as { message: string }).message).toContain(
      'ya tiene una asignacion activa en el mismo servicio o departamento',
    );
  });

  it('44 (decisiones-tecnicas seccion 44): cerrar una asignacion con turnos futuros reales en planificacion abierta y regularizarPlanificacionesAbiertas=true ya no crashea (dbo.observacion no existe desde la migracion 041), y borra el turno futuro', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    // Idempotencia: si un run anterior dejo una planificacion de EnfS1 para
    // este periodo, se elimina para poder recrearla limpia.
    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2`,
      [idServicioEnfS1, periodo.anio, periodo.mes],
    );

    const personalJ = await crearPersonalUnico('CIERREREG');
    const asignacion = await crearAsignacion({
      idPersonal: personalJ.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    const turnoResponse = await asActor(
      request(app.getHttpServer()).post('/v1/turnos'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        codigo: `E2ET${Date.now() % 100000}`,
        nombre: 'Turno E2E regularizacion',
        horaInicio: '07:00',
        horaFin: '19:00',
        vigenciaDesde: '2026-01-01',
      })
      .expect(201);
    const idTurno = (turnoResponse.body as { id: number }).id;

    await asegurarCalendarioMes(periodo.anio, periodo.mes);
    const calendariosResponse = await asActor(
      request(app.getHttpServer()).get(
        `/v1/calendarios?anio=${periodo.anio}&mes=${periodo.mes}`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const calendarios = (
      calendariosResponse.body as { data: Array<{ id: number; fecha: string }> }
    ).data;
    const calendarioFuturo = calendarios[0];

    const planificacionResponse = await asActor(
      request(app.getHttpServer()).post('/v1/planificaciones'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        anio: periodo.anio,
        mes: periodo.mes,
        idUsuarioCreador: idUsuarioAdmin,
      })
      .expect(201);
    const idPlanificacion = (
      planificacionResponse.body as PlanificacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/planificaciones/${idPlanificacion}/rol-turnos`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idAsignacionPersonal: idAsignacion,
        idCalendario: calendarioFuturo.id,
        secuenciaDia: 1,
        idTurno,
        horasProgramadas: 12,
        idUsuarioOperacion: idUsuarioAdmin,
      })
      .expect(201);

    // Antes de la seccion 44, este cierre respondia 500 ("Invalid object name
    // 'dbo.observacion'") porque regularizarPlanificacionesAbiertasDeAsignacion
    // intentaba borrar de una tabla eliminada en la migracion 041.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo: 'Cierre de prueba e2e con actividad en planificacion abierta.',
        regularizarPlanificacionesAbiertas: true,
      })
      .expect(201);

    const rolTurnoRestante = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacion],
    );
    expect(Number(rolTurnoRestante[0].total)).toBe(0);
  });

  it('46 (decisiones-tecnicas seccion 46): cerrar una asignacion con un turno de una fecha YA PASADA en una planificacion todavia no cerrada tambien lo borra (la distincion por fecha se descarto)', async () => {
    const periodo = getCurrentPlanningPeriod();

    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2`,
      [idServicioEnfS2, periodo.anio, periodo.mes],
    );

    const personalL = await crearPersonalUnico('DIAPASADO');
    const asignacion = await crearAsignacion({
      idPersonal: personalL.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    const turnoResponse = await asActor(
      request(app.getHttpServer()).post('/v1/turnos'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        codigo: `E2ET${Date.now() % 100000}`,
        nombre: 'Turno E2E dia pasado',
        horaInicio: '07:00',
        horaFin: '19:00',
        vigenciaDesde: '2026-01-01',
      })
      .expect(201);
    const idTurno = (turnoResponse.body as { id: number }).id;

    await asegurarCalendarioMes(periodo.anio, periodo.mes);
    const calendariosResponse = await asActor(
      request(app.getHttpServer()).get(
        `/v1/calendarios?anio=${periodo.anio}&mes=${periodo.mes}`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const calendarios = (
      calendariosResponse.body as { data: Array<{ id: number; fecha: string }> }
    ).data;
    const hoy = hoyIso();
    const calendarioPasado = calendarios.find(
      (item) => item.fecha.slice(0, 10) <= hoy,
    );

    if (!calendarioPasado) {
      throw new Error(
        'No se encontro un dia <= hoy en el periodo actual para la prueba 46.',
      );
    }

    const planificacionResponse = await asActor(
      request(app.getHttpServer()).post('/v1/planificaciones'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        anio: periodo.anio,
        mes: periodo.mes,
        idUsuarioCreador: idUsuarioAdmin,
      })
      .expect(201);
    const idPlanificacion = (
      planificacionResponse.body as PlanificacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/planificaciones/${idPlanificacion}/rol-turnos`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idAsignacionPersonal: idAsignacion,
        idCalendario: calendarioPasado.id,
        secuenciaDia: 1,
        idTurno,
        horasProgramadas: 12,
        idUsuarioOperacion: idUsuarioAdmin,
      })
      .expect(201);

    // Antes de la seccion 46, un turno con fecha <= fechaFin (ya "trabajado")
    // se preservaba a proposito (decision original de la seccion 38). Esa
    // distincion se descarto: ahora se borra igual que uno futuro, siempre que
    // la planificacion no este CERRADA.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoy,
        motivo: 'Cierre de prueba e2e, turno de dia ya pasado.',
        regularizarPlanificacionesAbiertas: true,
      })
      .expect(201);

    const rolTurnoRestanteDiaPasado = await dataSource.query<
      Array<{ total: number }>
    >(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacion],
    );
    expect(Number(rolTurnoRestanteDiaPasado[0].total)).toBe(0);
  });

  it('48.1 (decisiones-tecnicas seccion 48): cerrar un PRINCIPAL de alcance DEPARTAMENTO con turnos futuros reales bloquea sin regularizar y limpia con regularizar (antes el INNER JOIN a servicio nunca detectaba el conflicto para unidades de departamento)', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_departamento = @0 AND anio = @1 AND mes = @2`,
      [idDepartamentoE2e, periodo.anio, periodo.mes],
    );

    const personalM = await crearPersonalUnico('DEPTOPPAL');
    const asignacion = await crearAsignacionDepartamento({
      idPersonal: personalM.id,
      idDepartamento: idDepartamentoE2e,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    await cargarTurnoFuturoParaAsignacion({
      idAsignacion,
      idDepartamento: idDepartamentoE2e,
      periodo,
    });

    const bloqueado = await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    ).send({
      fechaFin: hoyIso(),
      motivo: 'Cierre de prueba e2e, alcance departamento.',
    });
    expect(bloqueado.status).toBe(409);
    expect((bloqueado.body as { message: string }).message).toContain(
      'Departamento E2E',
    );

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo: 'Cierre de prueba e2e, alcance departamento, con regularizar.',
        regularizarPlanificacionesAbiertas: true,
      })
      .expect(201);

    const rolTurnoRestante = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacion],
    );
    expect(Number(rolTurnoRestante[0].total)).toBe(0);
  });

  it('48.2 (decisiones-tecnicas secciones 48 y 56): mover una asignacion de alcance DEPARTAMENTO con turnos futuros reales bloquea sin regularizar y limpia con regularizar', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_departamento = @0 AND anio = @1 AND mes = @2`,
      [idDepartamentoE2e, periodo.anio, periodo.mes],
    );

    const personalN = await crearPersonalUnico('DEPTOMOVE');
    const asignacion = await crearAsignacionDepartamento({
      idPersonal: personalN.id,
      idDepartamento: idDepartamentoE2e,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    await cargarTurnoFuturoParaAsignacion({
      idAsignacion,
      idDepartamento: idDepartamentoE2e,
      periodo,
    });

    // Mover (no PUT: cambiar de unidad ya no pasa por "editar", seccion 56).
    const bloqueado = await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/mover`,
      ),
      tokenSesionAdmin,
    ).send({
      idServicio: idServicioEnfS1,
      idTipoContrato: idTipoContratoTgn,
      idCargaHoraria: idCargaHorariaTc,
      idRolFuncional: idRolFuncionalAsistencial,
      motivo: 'Intento de mover con actividad futura pendiente, prueba e2e.',
    });
    expect(bloqueado.status).toBe(409);

    const movida = await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/mover`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        motivo: 'Movimiento con regularizacion, prueba e2e.',
        regularizarPlanificacionesAbiertas: true,
      })
      .expect(201);
    const idMovida = (movida.body as AsignacionOperacionResponseBody).id;

    const rolTurnoRestante = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacion],
    );
    expect(Number(rolTurnoRestante[0].total)).toBe(0);

    // Limpieza: deja E2E-S1 sin esta asignacion para no interferir con otros runs.
    await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idMovida}/cerrar`),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('48.3 (decisiones-tecnicas seccion 48): cerrar una SECUNDARIA de alcance DEPARTAMENTO (suelta, sin cascada) con turnos futuros reales bloquea sin regularizar y limpia con regularizar', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_departamento = @0 AND anio = @1 AND mes = @2`,
      [idDepartamentoE2e, periodo.anio, periodo.mes],
    );

    const personalO = await crearPersonalUnico('DEPTOSEC');

    const principal = await crearAsignacion({
      idPersonal: personalO.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    const secundaria = await crearAsignacionDepartamento({
      idPersonal: personalO.id,
      idDepartamento: idDepartamentoE2e,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(201);
    const idAsignacionSecundaria = (
      secundaria.body as AsignacionOperacionResponseBody
    ).id;

    await cargarTurnoFuturoParaAsignacion({
      idAsignacion: idAsignacionSecundaria,
      idDepartamento: idDepartamentoE2e,
      periodo,
    });

    const bloqueado = await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionSecundaria}/cerrar`,
      ),
      tokenSesionAdmin,
    ).send({
      fechaFin: hoyIso(),
      motivo: 'Cierre de prueba e2e, secundaria departamento.',
    });
    expect(bloqueado.status).toBe(409);

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionSecundaria}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo:
          'Cierre de prueba e2e, secundaria departamento, con regularizar.',
        regularizarPlanificacionesAbiertas: true,
      })
      .expect(201);

    const rolTurnoRestante = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacionSecundaria],
    );
    expect(Number(rolTurnoRestante[0].total)).toBe(0);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ fechaFin: hoyIso(), motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('44 (decisiones-tecnicas seccion 44): cerrar una PRINCIPAL con secundarias activas, ambas con turnos futuros reales en planificacion abierta, regulariza las dos sin crashear (escenario original reportado por el usuario)', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2`,
      [idServicioEnfS1, periodo.anio, periodo.mes],
    );
    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2`,
      [idServicioEnfS2, periodo.anio, periodo.mes],
    );

    const personalK = await crearPersonalUnico('CASCREG');

    const principal = await crearAsignacion({
      idPersonal: personalK.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    const secundaria = await crearAsignacion({
      idPersonal: personalK.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(201);
    const idAsignacionSecundaria = (
      secundaria.body as AsignacionOperacionResponseBody
    ).id;

    async function cargarTurnoFuturo(idServicio: number, idAsignacion: number) {
      const turnoResponse = await asActor(
        request(app.getHttpServer()).post('/v1/turnos'),
        tokenSesionAdmin,
      )
        .send({
          idServicio,
          codigo: `E2ET${Date.now() % 100000}${Math.floor(Math.random() * 100)}`,
          nombre: 'Turno E2E cascada',
          horaInicio: '07:00',
          horaFin: '19:00',
          vigenciaDesde: '2026-01-01',
        })
        .expect(201);
      const idTurno = (turnoResponse.body as { id: number }).id;

      await asegurarCalendarioMes(periodo.anio, periodo.mes);
      const calendariosResponse = await asActor(
        request(app.getHttpServer()).get(
          `/v1/calendarios?anio=${periodo.anio}&mes=${periodo.mes}`,
        ),
        tokenSesionAdmin,
      ).expect(200);
      const idCalendario = (
        calendariosResponse.body as { data: Array<{ id: number }> }
      ).data[0].id;

      const planificacionResponse = await asActor(
        request(app.getHttpServer()).post('/v1/planificaciones'),
        tokenSesionAdmin,
      )
        .send({
          idServicio,
          anio: periodo.anio,
          mes: periodo.mes,
          idUsuarioCreador: idUsuarioAdmin,
        })
        .expect(201);
      const idPlanificacion = (
        planificacionResponse.body as PlanificacionOperacionResponseBody
      ).id;

      await asActor(
        request(app.getHttpServer()).post(
          `/v1/planificaciones/${idPlanificacion}/rol-turnos`,
        ),
        tokenSesionAdmin,
      )
        .send({
          idAsignacionPersonal: idAsignacion,
          idCalendario,
          secuenciaDia: 1,
          idTurno,
          horasProgramadas: 12,
          idUsuarioOperacion: idUsuarioAdmin,
        })
        .expect(201);
    }

    await cargarTurnoFuturo(idServicioEnfS1, idAsignacionPrincipal);
    await cargarTurnoFuturo(idServicioEnfS2, idAsignacionSecundaria);

    // Antes de la seccion 44, este cierre respondia 500 en el primer paso
    // (regularizar la principal) y ademas nunca hubiera limpiado los turnos
    // futuros de la secundaria, aun si el bug de dbo.observacion no existiera.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo: 'Cierre combinado con secundarias y turnos, prueba e2e.',
        regularizarPlanificacionesAbiertas: true,
        cerrarSecundariasActivas: true,
      })
      .expect(201);

    const rolTurnoPrincipal = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacionPrincipal],
    );
    const rolTurnoSecundaria = await dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*) AS total FROM dbo.rol_turno WHERE id_asignacion_personal = @0`,
      [idAsignacionSecundaria],
    );

    expect(Number(rolTurnoPrincipal[0].total)).toBe(0);
    expect(Number(rolTurnoSecundaria[0].total)).toBe(0);
  });

  it('D3 (matriz 5.6, decisiones-tecnicas seccion 42): cerrar una PRINCIPAL con cerrarSecundariasActivas=true cierra tambien las secundarias activas de la persona', async () => {
    const personalF = await crearPersonalUnico('CASCADA');

    const principal = await crearAsignacion({
      idPersonal: personalF.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacionPrincipal = (
      principal.body as AsignacionOperacionResponseBody
    ).id;

    const secundaria = await crearAsignacion({
      idPersonal: personalF.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'SECUNDARIA',
    }).expect(201);
    const idAsignacionSecundaria = (
      secundaria.body as AsignacionOperacionResponseBody
    ).id;

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacionPrincipal}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        fechaFin: hoyIso(),
        motivo: 'Cierre en cascada, prueba e2e.',
        cerrarSecundariasActivas: true,
      })
      .expect(201);

    const detalle = await asActor(
      request(app.getHttpServer()).get(`/v1/personal/${personalF.id}/detalle`),
      tokenSesionAdmin,
    ).expect(200);
    const vigentes = (detalle.body as PersonalDetalleResponseBody)
      .asignacionesVigentes as Array<{ id: number }>;

    expect(vigentes.some((item) => item.id === idAsignacionPrincipal)).toBe(
      false,
    );
    expect(vigentes.some((item) => item.id === idAsignacionSecundaria)).toBe(
      false,
    );
  });

  it('Planificacion con personal recien asignado: aparece en la matriz mensual apenas se le asigna, aunque no tenga turnos cargados', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    // Idempotencia: si un run anterior dejo una planificacion de EnfS2 para
    // este periodo, se elimina para poder recrearla limpia.
    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2`,
      [idServicioEnfS2, periodo.anio, periodo.mes],
    );

    const personalE = await crearPersonalUnico('MATRIZ');

    await crearAsignacion({
      idPersonal: personalE.id,
      idServicio: idServicioEnfS2,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);

    await asegurarCalendarioMes(periodo.anio, periodo.mes);

    const planificacionResponse = await asActor(
      request(app.getHttpServer()).post('/v1/planificaciones'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        anio: periodo.anio,
        mes: periodo.mes,
        idUsuarioCreador: idUsuarioAdmin,
      })
      .expect(201);
    const idPlanificacion = (
      planificacionResponse.body as PlanificacionOperacionResponseBody
    ).id;

    const matrizResponse = await asActor(
      request(app.getHttpServer()).get(
        `/v1/planificaciones/${idPlanificacion}/matriz-mensual`,
      ),
      tokenSesionAdmin,
    ).expect(200);
    const matrizBody =
      matrizResponse.body as MatrizMensualPlanificacionResponseBody;

    const filaPersonalE = matrizBody.filas.find(
      (fila) => fila.codigoPersonal === personalE.codigoPersonal,
    );

    expect(filaPersonalE).toBeDefined();
    expect(filaPersonalE?.totalHorasMes).toBe(0);
  });

  it('49.1 (decisiones-tecnicas seccion 49): crear una asignacion sin fechaInicio y cerrarla sin fechaFin usan la fecha de hoy (el frontend ya no las manda)', async () => {
    const personalP = await crearPersonalUnico('SINFECHA');

    const respuesta = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalP.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        // Sin fechaInicio.
      })
      .expect(201);

    const idAsignacion = (respuesta.body as AsignacionOperacionResponseBody).id;
    const filaCreada = await dataSource.query<Array<{ fecha_inicio: Date }>>(
      `SELECT fecha_inicio FROM dbo.asignacion_personal WHERE id = @0`,
      [idAsignacion],
    );
    expect(filaCreada[0].fecha_inicio.toISOString().slice(0, 10)).toBe(
      hoyIso(),
    );

    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ motivo: 'Cierre de prueba e2e, sin fechaFin.' })
      .expect(201);

    const filaCerrada = await dataSource.query<Array<{ fecha_fin: Date }>>(
      `SELECT fecha_fin FROM dbo.asignacion_personal WHERE id = @0`,
      [idAsignacion],
    );
    expect(filaCerrada[0].fecha_fin.toISOString().slice(0, 10)).toBe(hoyIso());
  });

  it('49.2 (decisiones-tecnicas secciones 49 y 56): editar sin cambiar de unidad conserva fecha_inicio; mover a otra unidad le da fecha_inicio propia a la fila nueva, sin tocar la de la fila vieja', async () => {
    const personalQ = await crearPersonalUnico('MOVFECHA');
    const fechaInicioOriginal = '2026-02-15';

    const creada = await asActor(
      request(app.getHttpServer()).post('/v1/asignaciones'),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalQ.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        esPrincipal: true,
        fechaInicio: fechaInicioOriginal,
      })
      .expect(201);
    const idAsignacion = (creada.body as AsignacionOperacionResponseBody).id;

    // Editar sin cambiar de unidad (mismo servicio): sigue conservando fecha_inicio
    // si no llega explicita (seccion 49, comportamiento sin cambios).
    await asActor(
      request(app.getHttpServer()).put(`/v1/asignaciones/${idAsignacion}`),
      tokenSesionAdmin,
    )
      .send({
        idPersonal: personalQ.id,
        idServicio: idServicioEnfS1,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        codigoFuenteItem: 'MIN',
        tipoAsignacion: 'PRINCIPAL',
        motivo: 'Actualizacion sin cambio de unidad, prueba e2e.',
        // Sin fechaInicio.
      })
      .expect(200);

    const filaTrasEditar = await dataSource.query<
      Array<{ fecha_inicio: Date }>
    >(`SELECT fecha_inicio FROM dbo.asignacion_personal WHERE id = @0`, [
      idAsignacion,
    ]);
    expect(filaTrasEditar[0].fecha_inicio.toISOString().slice(0, 10)).toBe(
      fechaInicioOriginal,
    );

    // Mover a otra unidad (seccion 56): la fila vieja cierra conservando su propia
    // fecha_inicio, la fila nueva arranca con fecha_inicio propia (hoy, sin llegar
    // explicita) — ya no se reusa la misma fila para representar ambos periodos.
    const movida = await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/mover`,
      ),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS2,
        idTipoContrato: idTipoContratoTgn,
        idCargaHoraria: idCargaHorariaTc,
        idRolFuncional: idRolFuncionalAsistencial,
        motivo: 'Movimiento a otra unidad, prueba e2e.',
      })
      .expect(201);
    const idMovida = (movida.body as AsignacionOperacionResponseBody).id;

    const filaViejaTrasMover = await dataSource.query<
      Array<{ fecha_inicio: Date; activo: boolean }>
    >(
      `SELECT fecha_inicio, activo FROM dbo.asignacion_personal WHERE id = @0`,
      [idAsignacion],
    );
    expect(filaViejaTrasMover[0].activo).toBe(false);
    expect(filaViejaTrasMover[0].fecha_inicio.toISOString().slice(0, 10)).toBe(
      fechaInicioOriginal,
    );

    const filaNuevaTrasMover = await dataSource.query<
      Array<{ fecha_inicio: Date }>
    >(`SELECT fecha_inicio FROM dbo.asignacion_personal WHERE id = @0`, [
      idMovida,
    ]);
    expect(filaNuevaTrasMover[0].fecha_inicio.toISOString().slice(0, 10)).toBe(
      hoyIso(),
    );

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(`/v1/asignaciones/${idMovida}/cerrar`),
      tokenSesionAdmin,
    )
      .send({ motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('49.3 (decisiones-tecnicas seccion 49): crear un turno sin vigenciaDesde usa la fecha de hoy', async () => {
    const respuesta = await asActor(
      request(app.getHttpServer()).post('/v1/turnos'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        codigo: `E2ET${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`,
        nombre: 'Turno E2E sin vigencia',
        horaInicio: '07:00',
        horaFin: '19:00',
        // Sin vigenciaDesde.
      })
      .expect(201);

    expect(
      (respuesta.body as { vigenciaDesde: string }).vigenciaDesde.slice(0, 10),
    ).toBe(hoyIso());
  });

  it('49.4 (decisiones-tecnicas seccion 49): editar un turno sin vigenciaDesde conserva la vigencia original, no la resetea a hoy', async () => {
    const creado = await asActor(
      request(app.getHttpServer()).post('/v1/turnos'),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        codigo: `E2ET${Date.now() % 100000}${Math.floor(Math.random() * 1000)}`,
        nombre: 'Turno E2E vigencia original',
        horaInicio: '07:00',
        horaFin: '15:00',
        vigenciaDesde: '2026-02-01',
      })
      .expect(201);
    const idTurno = (creado.body as { id: number }).id;
    const codigoTurno = (creado.body as { codigo: string }).codigo;

    await asActor(
      request(app.getHttpServer()).put(`/v1/turnos/${idTurno}`),
      tokenSesionAdmin,
    )
      .send({
        idServicio: idServicioEnfS1,
        codigo: codigoTurno,
        nombre: 'Turno E2E vigencia original (editado)',
        horaInicio: '07:00',
        horaFin: '15:00',
        // Sin vigenciaDesde.
      })
      .expect(200);

    const actualizado = await asActor(
      request(app.getHttpServer()).get(`/v1/turnos/${idTurno}`),
      tokenSesionAdmin,
    ).expect(200);
    expect(
      (actualizado.body as { vigenciaDesde: string }).vigenciaDesde.slice(
        0,
        10,
      ),
    ).toBe('2026-02-01');
  });

  it('50.1 (decisiones-tecnicas seccion 50): GET conflicto-planificacion responde tieneConflicto=false cuando la asignacion no tiene actividad pendiente', async () => {
    const personalR = await crearPersonalUnico('SINCONFL');
    const asignacion = await crearAsignacion({
      idPersonal: personalR.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    const respuesta = await asActor(
      request(app.getHttpServer()).get(
        `/v1/asignaciones/${idAsignacion}/conflicto-planificacion`,
      ),
      tokenSesionAdmin,
    ).expect(200);

    expect(respuesta.body).toMatchObject({
      idAsignacion,
      tieneConflicto: false,
      unidadNombre: null,
      periodo: null,
    });

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('50.2 (decisiones-tecnicas seccion 50): GET conflicto-planificacion responde tieneConflicto=true con unidad y periodo cuando hay un turno futuro real', async () => {
    const periodo = getNextPlanningPeriod(getCurrentPlanningPeriod());

    await dataSource.query(
      `DELETE FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2`,
      [idServicioEnfS1, periodo.anio, periodo.mes],
    );

    const personalS = await crearPersonalUnico('CONCONFL');
    const asignacion = await crearAsignacion({
      idPersonal: personalS.id,
      idServicio: idServicioEnfS1,
      idRolFuncional: idRolFuncionalAsistencial,
      tipoAsignacion: 'PRINCIPAL',
    }).expect(201);
    const idAsignacion = (asignacion.body as AsignacionOperacionResponseBody)
      .id;

    await cargarTurnoFuturoParaAsignacion({
      idAsignacion,
      idServicio: idServicioEnfS1,
      periodo,
    });

    const respuesta = await asActor(
      request(app.getHttpServer()).get(
        `/v1/asignaciones/${idAsignacion}/conflicto-planificacion`,
      ),
      tokenSesionAdmin,
    ).expect(200);

    expect(respuesta.body).toMatchObject({
      idAsignacion,
      tieneConflicto: true,
      unidadNombre: 'Servicio E2E 1 (flujos operativos)',
    });
    expect((respuesta.body as { periodo: string }).periodo).toBeTruthy();

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({
        motivo: 'Cierre de prueba e2e.',
        regularizarPlanificacionesAbiertas: true,
      })
      .expect(201);
  });

  it('50.3 (decisiones-tecnicas seccion 50): GET conflicto-planificacion queda bloqueado (403) para un actor sin permiso de cerrar asignaciones', async () => {
    const jefeDepto = await crearActorJefeDepartamento();

    await asActor(
      request(app.getHttpServer()).get(
        `/v1/asignaciones/${jefeDepto.idAsignacion}/conflicto-planificacion`,
      ),
      jefeDepto.tokenSesion,
    ).expect(403);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).post(
        `/v1/asignaciones/${jefeDepto.idAsignacion}/cerrar`,
      ),
      tokenSesionAdmin,
    )
      .send({ motivo: 'Cierre de prueba e2e.' })
      .expect(201);
  });

  it('58.1 (decisiones-tecnicas seccion 58): crear un feriado con rango de fechas funciona y aparece en el listado del mes', async () => {
    await asegurarCalendarioMes(2027, 6);
    const idTipoFeriado = await obtenerIdTipoFeriado('FN');

    const creado = await asActor(
      request(app.getHttpServer()).post('/v1/feriados'),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.1',
        anio: 2027,
        mes: 6,
        fechaInicio: '2027-06-21',
        fechaFin: '2027-06-23',
        activo: true,
      })
      .expect(201);
    const idFeriado = (creado.body as FeriadoOperacionResponseBody).id;

    const listado = await asActor(
      request(app.getHttpServer()).get('/v1/feriados?anio=2027&mes=6'),
      tokenSesionAdmin,
    ).expect(200);
    const filas = (listado.body as { data: FeriadoOperacionResponseBody[] })
      .data;
    expect(filas.some((item) => item.id === idFeriado)).toBe(true);

    const calendarioDia = await asActor(
      request(app.getHttpServer()).get('/v1/calendarios?anio=2027&mes=6'),
      tokenSesionAdmin,
    ).expect(200);
    const dias = (
      calendarioDia.body as {
        data: Array<{
          fecha: string;
          esFeriado: boolean;
          codigoFeriado: string | null;
        }>;
      }
    ).data;
    const dia22 = dias.find((item) => item.fecha.slice(0, 10) === '2027-06-22');
    expect(dia22?.esFeriado).toBe(true);
    expect(dia22?.codigoFeriado).toBe('FN');

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).delete(`/v1/feriados/${idFeriado}`),
      tokenSesionAdmin,
    ).expect(200);
  });

  it('58.2 (decisiones-tecnicas seccion 58): crear un feriado que se superpone con otro activo queda bloqueado (409)', async () => {
    await asegurarCalendarioMes(2027, 7);
    const idTipoFeriado = await obtenerIdTipoFeriado('F');

    const original = await asActor(
      request(app.getHttpServer()).post('/v1/feriados'),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.2 original',
        anio: 2027,
        mes: 7,
        fechaInicio: '2027-07-10',
        fechaFin: '2027-07-12',
        activo: true,
      })
      .expect(201);
    const idOriginal = (original.body as FeriadoOperacionResponseBody).id;

    await asActor(
      request(app.getHttpServer()).post('/v1/feriados'),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.2 superpuesto',
        anio: 2027,
        mes: 7,
        fechaInicio: '2027-07-11',
        fechaFin: '2027-07-11',
        activo: true,
      })
      .expect(409);

    // Limpieza.
    await asActor(
      request(app.getHttpServer()).delete(`/v1/feriados/${idOriginal}`),
      tokenSesionAdmin,
    ).expect(200);
  });

  it('58.3 (decisiones-tecnicas seccion 58): un feriado no puede cruzar de un mes a otro (400)', async () => {
    await asegurarCalendarioMes(2027, 8);
    const idTipoFeriado = await obtenerIdTipoFeriado('FI');

    await asActor(
      request(app.getHttpServer()).post('/v1/feriados'),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.3',
        anio: 2027,
        mes: 8,
        fechaInicio: '2027-08-30',
        fechaFin: '2027-09-01',
        activo: true,
      })
      .expect(400);
  });

  it('58.4 (decisiones-tecnicas seccion 58): actualizar y desactivar un feriado funciona; desactivado deja de reflejarse en el calendario', async () => {
    await asegurarCalendarioMes(2027, 9);
    const idTipoFeriado = await obtenerIdTipoFeriado('FR');

    const creado = await asActor(
      request(app.getHttpServer()).post('/v1/feriados'),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.4',
        anio: 2027,
        mes: 9,
        fechaInicio: '2027-09-15',
        fechaFin: '2027-09-15',
        activo: true,
      })
      .expect(201);
    const idFeriado = (creado.body as FeriadoOperacionResponseBody).id;

    const actualizado = await asActor(
      request(app.getHttpServer()).put(`/v1/feriados/${idFeriado}`),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.4 renombrado',
        anio: 2027,
        mes: 9,
        fechaInicio: '2027-09-15',
        fechaFin: '2027-09-15',
        activo: true,
      })
      .expect(200);
    expect((actualizado.body as FeriadoOperacionResponseBody).nombre).toBe(
      'Feriado e2e 58.4 renombrado',
    );

    await asActor(
      request(app.getHttpServer()).delete(`/v1/feriados/${idFeriado}`),
      tokenSesionAdmin,
    ).expect(200);

    const calendarioDia = await asActor(
      request(app.getHttpServer()).get('/v1/calendarios?anio=2027&mes=9'),
      tokenSesionAdmin,
    ).expect(200);
    const dias = (
      calendarioDia.body as {
        data: Array<{ fecha: string; esFeriado: boolean }>;
      }
    ).data;
    const dia15 = dias.find((item) => item.fecha.slice(0, 10) === '2027-09-15');
    expect(dia15?.esFeriado).toBe(false);
  });

  it('58.5 (decisiones-tecnicas seccion 59): crear un feriado en un anio/mes cuyo calendario aun no fue generado queda bloqueado (400)', async () => {
    const idTipoFeriado = await obtenerIdTipoFeriado('FN');

    await asActor(
      request(app.getHttpServer()).post('/v1/feriados'),
      tokenSesionAdmin,
    )
      .send({
        idTipoFeriado,
        nombre: 'Feriado e2e 58.5',
        anio: 2029,
        mes: 11,
        fechaInicio: '2029-11-01',
        fechaFin: '2029-11-01',
        activo: true,
      })
      .expect(400);
  });

  describe('Sesion de edicion exclusiva de planificacion (control unico + jerarquia)', () => {
    it('el primero que escribe adquiere el control; un rango igual o menor queda bloqueado; un rango superior puede tomar el control; liberar solo afecta la sesion propia', async () => {
      const periodoActual = getCurrentPlanningPeriod();
      await asegurarCalendarioMes(periodoActual.anio, periodoActual.mes);

      // Deja el servicio E2E-S3 sin planificacion previa del mismo periodo
      // antes de crear la propia: hace la prueba re-ejecutable aunque un run
      // previo haya fallado a mitad de camino y dejado una planificacion
      // BORRADOR colgada (choca con la unicidad de periodo activo,
      // migracion 012). E2E-S3 es un servicio dedicado a este test, nunca
      // tocado por otro caso de la suite.
      await dataSource.query(
        `
          DELETE se FROM dbo.planificacion_sesion_edicion se
          INNER JOIN dbo.planificacion p ON p.id = se.id_planificacion
          WHERE p.id_servicio = @0 AND p.anio = @1 AND p.mes = @2;

          DELETE FROM dbo.planificacion
          WHERE id_servicio = @0 AND anio = @1 AND mes = @2;
        `,
        [idServicioE2eS3, periodoActual.anio, periodoActual.mes],
      );

      // Solo 2 actores nuevos (jefeServicio + el jefeDepto que ya trae
      // crearActorJefeDepartamento): el login comparte un limite de 5/60s por
      // IP con el resto de la suite e2e (AuthController.login,
      // seguridad.module.ts), asi que no se agrega un tercer actor (RRHH)
      // solo para probar el rango intermedio — esa comparacion puntual de
      // rango (RRHH entre DEPARTAMENTO y SISTEMA) ya la cubre el unit test de
      // jerarquia-edicion-planificacion.helper.spec.ts sin costo de login.
      const jefeServicio = await crearActorJefeServicio(idServicioE2eS3);
      const jefeDepto = await crearActorJefeDepartamento(true);

      const planificacionResponse = await asActor(
        request(app.getHttpServer()).post('/v1/planificaciones'),
        tokenSesionAdmin,
      )
        .send({
          idServicio: idServicioE2eS3,
          anio: periodoActual.anio,
          mes: periodoActual.mes,
          idUsuarioCreador: idUsuarioAdmin,
        })
        .expect(201);
      const idPlanificacion = (
        planificacionResponse.body as PlanificacionOperacionResponseBody
      ).id;

      const estadoInicial = await asActor(
        request(app.getHttpServer()).get(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        jefeServicio.tokenSesion,
      ).expect(200);
      expect((estadoInicial.body as { ocupada: boolean }).ocupada).toBe(false);

      const latidoJefeServicio = await asActor(
        request(app.getHttpServer()).post(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion/latido`,
        ),
        jefeServicio.tokenSesion,
      ).expect(201);
      expect((latidoJefeServicio.body as { esPropia: boolean }).esPropia).toBe(
        true,
      );

      // Mismo rango o inferior sin forzar: bloqueado.
      await asActor(
        request(app.getHttpServer()).post(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion/latido`,
        ),
        jefeDepto.tokenSesion,
      ).expect(409);

      const estadoDesdeJefeDepto = await asActor(
        request(app.getHttpServer()).get(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        jefeDepto.tokenSesion,
      ).expect(200);
      const cuerpoJefeDepto = estadoDesdeJefeDepto.body as {
        ocupada: boolean;
        esPropia: boolean;
        puedeTomarControl: boolean;
      };
      expect(cuerpoJefeDepto.ocupada).toBe(true);
      expect(cuerpoJefeDepto.esPropia).toBe(false);
      expect(cuerpoJefeDepto.puedeTomarControl).toBe(true);

      // Jefe de departamento (rango superior) toma el control al jefe de servicio.
      const tomaControlJefeDepto = await asActor(
        request(app.getHttpServer()).post(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion/tomar-control`,
        ),
        jefeDepto.tokenSesion,
      ).expect(201);
      expect(
        (tomaControlJefeDepto.body as { esPropia: boolean }).esPropia,
      ).toBe(true);

      // El jefe de servicio (rango inferior) ya no puede tomar el control por si mismo.
      const estadoDesdeJefeServicio = await asActor(
        request(app.getHttpServer()).get(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        jefeServicio.tokenSesion,
      ).expect(200);
      expect(
        (estadoDesdeJefeServicio.body as { puedeTomarControl: boolean })
          .puedeTomarControl,
      ).toBe(false);
      await asActor(
        request(app.getHttpServer()).post(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion/tomar-control`,
        ),
        jefeServicio.tokenSesion,
      ).expect(403);

      // Liberar esta acotado al propio usuario: el jefe de servicio (que ya
      // perdio el control) no puede liberar la sesion vigente del jefe de
      // departamento.
      await asActor(
        request(app.getHttpServer()).delete(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        jefeServicio.tokenSesion,
      ).expect(204);
      const estadoTrasLiberarAjeno = await asActor(
        request(app.getHttpServer()).get(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        tokenSesionAdmin,
      ).expect(200);
      expect(
        (estadoTrasLiberarAjeno.body as { ocupada: boolean }).ocupada,
      ).toBe(true);

      // El jefe de departamento libera su propia sesion: queda disponible para el siguiente.
      await asActor(
        request(app.getHttpServer()).delete(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        jefeDepto.tokenSesion,
      ).expect(204);
      const estadoFinal = await asActor(
        request(app.getHttpServer()).get(
          `/v1/planificaciones/${idPlanificacion}/sesion-edicion`,
        ),
        tokenSesionAdmin,
      ).expect(200);
      expect((estadoFinal.body as { ocupada: boolean }).ocupada).toBe(false);
    });
  });
});

// ActorContextGuard exige Authorization: Bearer <token> de un login real via
// POST /v1/auth/login — el header x-user-id de versiones anteriores de este
// archivo ya no se lee en ningun lado del backend actual (ver
// docs/database/decisiones-tecnicas.md seccion 39).
function asActor<T extends request.Test>(builder: T, tokenSesion: string): T {
  return builder.set('Authorization', `Bearer ${tokenSesion}`);
}

async function executeSqlFile(
  dataSource: DataSource,
  relativePath: string,
): Promise<void> {
  const filePath = resolveFromProjectRoot(relativePath);
  const sql = readFileSync(filePath, 'utf8');
  await dataSource.query(sql);
}

function getCurrentPlanningPeriod() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(new Date());

  return {
    anio: Number(parts.find((part) => part.type === 'year')?.value),
    mes: Number(parts.find((part) => part.type === 'month')?.value),
  };
}

function getNextPlanningPeriod(period: { anio: number; mes: number }) {
  if (period.mes === 12) {
    return {
      anio: period.anio + 1,
      mes: 1,
    };
  }

  return {
    anio: period.anio,
    mes: period.mes + 1,
  };
}
