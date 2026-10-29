import bcrypt from 'bcryptjs';
import { loadEnvFile } from '../src/infrastructure/config/load-env';
import { readDatabaseEnv } from '../src/infrastructure/config/database-env';
import { resolveFromProjectRoot } from '../src/infrastructure/config/project-root';
import { createTypeOrmDataSource } from '../src/infrastructure/persistence/typeorm/typeorm-data-source.factory';
import { loadSqlBatches } from './lib/sql-script-runner';

// Seed idempotente del entorno DEMO (roles_turnos_demo): organizacion,
// personal, usuarios y una planificacion ya pintada, TODO ficticio. No usa
// ningun dato real del hospital -- ver docs/database/decisiones-tecnicas.md
// (entrada de este cambio) para el porque de esta separacion.
//
// La organizacion y catalogos base (departamentos/servicios/nivel_cargo/
// tipo_contrato/carga_horaria) se reutilizan de database/seeds/dev-00N_*.sql:
// son genericos (nombres de dominio hospitalario, no datos de una
// institucion concreta), ya se usaban tal cual para desarrollo local antes
// de que existiera el dataset real. rol_seguridad/rol_funcional/
// incidencia_personal/tipo_feriado ya vienen de la migracion 006 (baseline,
// tambien generica).
const CATALOG_SEED_FILES = [
  'database/seeds/dev-001_departamentos.sql',
  'database/seeds/dev-002_servicios.sql',
  'database/seeds/dev-003_nivel_cargo.sql',
  'database/seeds/dev-005_tipo_contrato.sql',
  'database/seeds/dev-006_carga_horaria.sql',
];

const DEMO_PASSWORD = 'Demo1234!';

type PersonaDemo = {
  codigoPersonal: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombres: string;
  documentoIdentidad: string;
  nivelCargoCodigo: 'LIC' | 'AUX';
  servicioCodigo: string | null;
  departamentoCodigo: string;
  rolFuncional: 'ASISTENCIAL' | 'JEFE_SERVICIO' | 'JEFE_DEPARTAMENTO';
};

// 17 personas ficticias repartidas en la organizacion generica ya sembrada
// por dev-001/dev-002. Nombres comunes elegidos a proposito (evitar
// coincidencia con personas reales); documento_identidad es una secuencia
// obviamente sintetica, no un formato real de CI.
const PERSONAL_DEMO: PersonaDemo[] = [
  { codigoPersonal: 'DEMO-001', apellidoPaterno: 'Rojas', apellidoMaterno: 'Fernandez', nombres: 'Mariana', documentoIdentidad: '1000001', nivelCargoCodigo: 'LIC', servicioCodigo: 'ENF-S1', departamentoCodigo: 'ENF', rolFuncional: 'JEFE_SERVICIO' },
  { codigoPersonal: 'DEMO-002', apellidoPaterno: 'Vargas', apellidoMaterno: 'Quispe', nombres: 'Daniel', documentoIdentidad: '1000002', nivelCargoCodigo: 'AUX', servicioCodigo: 'ENF-S1', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-003', apellidoPaterno: 'Mamani', apellidoMaterno: 'Choque', nombres: 'Elena', documentoIdentidad: '1000003', nivelCargoCodigo: 'LIC', servicioCodigo: 'ENF-S1', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-004', apellidoPaterno: 'Torrez', apellidoMaterno: 'Gutierrez', nombres: 'Pablo', documentoIdentidad: '1000004', nivelCargoCodigo: 'AUX', servicioCodigo: 'ENF-S1', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-005', apellidoPaterno: 'Flores', apellidoMaterno: 'Aguilar', nombres: 'Carla', documentoIdentidad: '1000005', nivelCargoCodigo: 'LIC', servicioCodigo: 'ENF-S1', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-006', apellidoPaterno: 'Gutierrez', apellidoMaterno: 'Paz', nombres: 'Ricardo', documentoIdentidad: '1000006', nivelCargoCodigo: 'LIC', servicioCodigo: 'ENF-S2', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-007', apellidoPaterno: 'Choque', apellidoMaterno: 'Mamani', nombres: 'Beatriz', documentoIdentidad: '1000007', nivelCargoCodigo: 'AUX', servicioCodigo: 'ENF-S2', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-008', apellidoPaterno: 'Salazar', apellidoMaterno: 'Rivera', nombres: 'Jorge', documentoIdentidad: '1000008', nivelCargoCodigo: 'LIC', servicioCodigo: 'ENF-S2', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-009', apellidoPaterno: 'Aguilar', apellidoMaterno: 'Torrez', nombres: 'Susana', documentoIdentidad: '1000009', nivelCargoCodigo: 'AUX', servicioCodigo: 'ENF-S2', departamentoCodigo: 'ENF', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-010', apellidoPaterno: 'Vargas', apellidoMaterno: 'Mamani', nombres: 'Teresa', documentoIdentidad: '1000010', nivelCargoCodigo: 'LIC', servicioCodigo: null, departamentoCodigo: 'ENF', rolFuncional: 'JEFE_DEPARTAMENTO' },
  { codigoPersonal: 'DEMO-011', apellidoPaterno: 'Quispe', apellidoMaterno: 'Vargas', nombres: 'Manuel', documentoIdentidad: '1000011', nivelCargoCodigo: 'LIC', servicioCodigo: 'AMB-S1', departamentoCodigo: 'AMB', rolFuncional: 'JEFE_SERVICIO' },
  { codigoPersonal: 'DEMO-012', apellidoPaterno: 'Paz', apellidoMaterno: 'Gutierrez', nombres: 'Andrea', documentoIdentidad: '1000012', nivelCargoCodigo: 'LIC', servicioCodigo: 'AMB-S1', departamentoCodigo: 'AMB', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-013', apellidoPaterno: 'Rivera', apellidoMaterno: 'Salazar', nombres: 'Fernando', documentoIdentidad: '1000013', nivelCargoCodigo: 'AUX', servicioCodigo: 'AMB-S1', departamentoCodigo: 'AMB', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-014', apellidoPaterno: 'Fernandez', apellidoMaterno: 'Rojas', nombres: 'Patricia', documentoIdentidad: '1000014', nivelCargoCodigo: 'LIC', servicioCodigo: 'AMB-S2', departamentoCodigo: 'AMB', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-015', apellidoPaterno: 'Aguilar', apellidoMaterno: 'Flores', nombres: 'Roberto', documentoIdentidad: '1000015', nivelCargoCodigo: 'AUX', servicioCodigo: 'AMB-S2', departamentoCodigo: 'AMB', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-016', apellidoPaterno: 'Gutierrez', apellidoMaterno: 'Torrez', nombres: 'Diego', documentoIdentidad: '1000016', nivelCargoCodigo: 'LIC', servicioCodigo: 'ADM-SIS', departamentoCodigo: 'ADM', rolFuncional: 'ASISTENCIAL' },
  { codigoPersonal: 'DEMO-017', apellidoPaterno: 'Choque', apellidoMaterno: 'Salazar', nombres: 'Lucia', documentoIdentidad: '1000017', nivelCargoCodigo: 'LIC', servicioCodigo: 'ADM-CONT', departamentoCodigo: 'ADM', rolFuncional: 'ASISTENCIAL' },
];

const TURNOS_DEMO = [
  { codigo: 'DEMO-MAN', nombre: 'Manana', horaInicio: '07:00', horaFin: '13:00' },
  { codigo: 'DEMO-TAR', nombre: 'Tarde', horaInicio: '13:00', horaFin: '19:00' },
];

// Mismo criterio ISO que TypeOrmCalendarioRepository.getIsoDayOfWeek: 1=Lunes .. 7=Domingo.
const DIA_SEMANA_NOMBRES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];

function getIsoDayOfWeek(fecha: Date): number {
  const jsDay = fecha.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

type DataSource = Awaited<ReturnType<typeof createTypeOrmDataSource>>;

async function main(): Promise<void> {
  loadEnvFile();
  const env = readDatabaseEnv();

  if (env.name !== 'roles_turnos_demo') {
    throw new Error(
      `Este script solo debe ejecutarse sobre roles_turnos_demo y detecto ${env.name}.`,
    );
  }

  const dataSource = await createTypeOrmDataSource();

  try {
    const currentDatabaseRows = (await dataSource.query(
      'SELECT DB_NAME() AS current_database',
    )) as Array<{ current_database: string }>;
    const currentDatabase = currentDatabaseRows[0]?.current_database ?? '';

    if (currentDatabase !== 'roles_turnos_demo') {
      throw new Error(
        `La conexion activa esperaba roles_turnos_demo y detecto ${currentDatabase || 'desconocida'}.`,
      );
    }

    console.log('[seed-demo] Sembrando organizacion y catalogos genericos...');
    for (const relativePath of CATALOG_SEED_FILES) {
      const absolutePath = resolveFromProjectRoot(relativePath);
      const batches = loadSqlBatches(absolutePath, new Map());
      for (const batch of batches) {
        await dataSource.query(batch);
      }
    }

    const catalogos = await resolveCatalogIds(dataSource);

    console.log('[seed-demo] Sembrando personal ficticio y asignaciones...');
    const personalIds = new Map<string, number>();
    for (const persona of PERSONAL_DEMO) {
      const idPersonal = await upsertPersonal(dataSource, persona, catalogos.nivelCargoIds);
      personalIds.set(persona.codigoPersonal, idPersonal);
      await upsertAsignacionPrincipal(dataSource, persona, idPersonal, catalogos);
    }

    console.log('[seed-demo] Sembrando usuarios de demostracion...');
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
    await upsertUsuario(dataSource, {
      username: 'admin.demo',
      passwordHash,
      idRolSeguridad: catalogos.rolSeguridadIds.get('ADMIN_SISTEMA')!,
      idPersonal: null,
    });
    await upsertUsuario(dataSource, {
      username: 'rrhh.demo',
      passwordHash,
      idRolSeguridad: catalogos.rolSeguridadIds.get('RRHH')!,
      idPersonal: null,
    });
    await upsertUsuario(dataSource, {
      username: 'jefe.departamento.demo',
      passwordHash,
      idRolSeguridad: catalogos.rolSeguridadIds.get('JEFE_DEPARTAMENTO')!,
      idPersonal: personalIds.get('DEMO-010')!,
    });
    await upsertUsuario(dataSource, {
      username: 'jefe.servicio.demo',
      passwordHash,
      idRolSeguridad: catalogos.rolSeguridadIds.get('JEFE_SERVICIO')!,
      idPersonal: personalIds.get('DEMO-001')!,
    });
    const adminUsuarioId = await getUsuarioId(dataSource, 'admin.demo');

    console.log('[seed-demo] Sembrando turnos de ENF-S1...');
    const idServicioEnfS1 = catalogos.servicioIds.get('ENF-S1')!;
    const turnoIds = new Map<string, number>();
    for (const turno of TURNOS_DEMO) {
      const idTurno = await upsertTurnoServicio(dataSource, idServicioEnfS1, turno);
      turnoIds.set(turno.codigo, idTurno);
    }

    console.log('[seed-demo] Sembrando planificacion pintada del mes actual...');
    const hoy = new Date();
    const anio = hoy.getUTCFullYear();
    const mes = hoy.getUTCMonth() + 1;
    const diasEnMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    const calendarioIds = await ensureCalendarioMes(dataSource, anio, mes, diasEnMes);

    const idPlanificacion = await upsertPlanificacionServicio(
      dataSource,
      idServicioEnfS1,
      anio,
      mes,
      diasEnMes,
      adminUsuarioId,
    );

    const asignacionesEnfS1: number[] = [];
    for (const persona of PERSONAL_DEMO) {
      if (persona.servicioCodigo !== 'ENF-S1') continue;
      const idPersonal = personalIds.get(persona.codigoPersonal)!;
      const idAsignacion = await getAsignacionPrincipalId(dataSource, idPersonal);
      asignacionesEnfS1.push(idAsignacion);
    }

    await pintarRolTurnoMes(
      dataSource,
      idPlanificacion,
      asignacionesEnfS1,
      calendarioIds,
      turnoIds,
      adminUsuarioId,
    );

    console.log(
      `[seed-demo] Listo: ${PERSONAL_DEMO.length} personas, 4 usuarios de demo, planificacion ${idPlanificacion} pintada (${anio}-${String(mes).padStart(2, '0')}, ${asignacionesEnfS1.length} personas de ENF-S1).`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function resolveCatalogIds(dataSource: DataSource) {
  const departamentoRows = (await dataSource.query(
    `SELECT id, codigo FROM dbo.departamento WHERE codigo IN ('ENF', 'AMB', 'RRHH', 'ADM')`,
  )) as Array<{ id: number | string; codigo: string }>;
  const departamentoIds = new Map(departamentoRows.map((r) => [r.codigo, Number(r.id)]));

  const servicioRows = (await dataSource.query(
    `SELECT id, codigo FROM dbo.servicio WHERE codigo IN ('ENF-S1', 'ENF-S2', 'AMB-S1', 'AMB-S2', 'ADM-SIS', 'ADM-CONT')`,
  )) as Array<{ id: number | string; codigo: string }>;
  const servicioIds = new Map(servicioRows.map((r) => [r.codigo, Number(r.id)]));

  const nivelCargoRows = (await dataSource.query(
    `SELECT id, codigo FROM dbo.nivel_cargo WHERE codigo IN ('LIC', 'AUX')`,
  )) as Array<{ id: number | string; codigo: string }>;
  const nivelCargoIds = new Map(nivelCargoRows.map((r) => [r.codigo, Number(r.id)]));

  const tipoContratoRows = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.tipo_contrato WHERE codigo = 'TGN'`,
  )) as Array<{ id: number | string }>;
  const idTipoContrato = Number(tipoContratoRows[0].id);

  const cargaHorariaRows = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.carga_horaria WHERE codigo = 'TC'`,
  )) as Array<{ id: number | string }>;
  const idCargaHoraria = Number(cargaHorariaRows[0].id);

  const rolFuncionalRows = (await dataSource.query(
    `SELECT id, codigo FROM dbo.rol_funcional`,
  )) as Array<{ id: number | string; codigo: string }>;
  const rolFuncionalIds = new Map(rolFuncionalRows.map((r) => [r.codigo, Number(r.id)]));

  const rolSeguridadRows = (await dataSource.query(
    `SELECT id, codigo FROM dbo.rol_seguridad`,
  )) as Array<{ id: number | string; codigo: string }>;
  const rolSeguridadIds = new Map(rolSeguridadRows.map((r) => [r.codigo, Number(r.id)]));

  return {
    departamentoIds,
    servicioIds,
    nivelCargoIds,
    idTipoContrato,
    idCargaHoraria,
    rolFuncionalIds,
    rolSeguridadIds,
  };
}

async function upsertPersonal(
  dataSource: DataSource,
  persona: PersonaDemo,
  nivelCargoIds: Map<string, number>,
): Promise<number> {
  const existing = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.personal WHERE codigo_personal = @0`,
    [persona.codigoPersonal],
  )) as Array<{ id: number | string }>;

  if (existing[0]) {
    return Number(existing[0].id);
  }

  await dataSource.query(
    `
      INSERT INTO dbo.personal
      (codigo_personal, nombres, apellido_paterno, apellido_materno, documento_identidad, id_nivel_cargo, activo)
      VALUES (@0, @1, @2, @3, @4, @5, 1)
    `,
    [
      persona.codigoPersonal,
      persona.nombres,
      persona.apellidoPaterno,
      persona.apellidoMaterno,
      persona.documentoIdentidad,
      nivelCargoIds.get(persona.nivelCargoCodigo),
    ],
  );

  const inserted = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.personal WHERE codigo_personal = @0`,
    [persona.codigoPersonal],
  )) as Array<{ id: number | string }>;

  return Number(inserted[0].id);
}

async function upsertAsignacionPrincipal(
  dataSource: DataSource,
  persona: PersonaDemo,
  idPersonal: number,
  catalogos: Awaited<ReturnType<typeof resolveCatalogIds>>,
): Promise<void> {
  const existing = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.asignacion_personal WHERE id_personal = @0 AND es_principal = 1 AND activo = 1`,
    [idPersonal],
  )) as Array<{ id: number | string }>;

  if (existing[0]) {
    return;
  }

  const idServicio = persona.servicioCodigo ? catalogos.servicioIds.get(persona.servicioCodigo) ?? null : null;
  const idDepartamento = idServicio ? null : catalogos.departamentoIds.get(persona.departamentoCodigo);
  const idRolFuncional = catalogos.rolFuncionalIds.get(persona.rolFuncional);

  await dataSource.query(
    `
      INSERT INTO dbo.asignacion_personal
      (id_personal, id_servicio, id_departamento, id_tipo_contrato, id_rol_funcional, id_carga_horaria, tipo_asignacion, es_principal, fecha_inicio, activo)
      VALUES (@0, @1, @2, @3, @4, @5, 'PRINCIPAL', 1, GETUTCDATE(), 1)
    `,
    [idPersonal, idServicio, idDepartamento, catalogos.idTipoContrato, idRolFuncional, catalogos.idCargaHoraria],
  );
}

async function getAsignacionPrincipalId(dataSource: DataSource, idPersonal: number): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.asignacion_personal WHERE id_personal = @0 AND es_principal = 1 AND activo = 1`,
    [idPersonal],
  )) as Array<{ id: number | string }>;

  return Number(rows[0].id);
}

async function upsertUsuario(
  dataSource: DataSource,
  input: { username: string; passwordHash: string; idRolSeguridad: number; idPersonal: number | null },
): Promise<void> {
  const existing = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.usuario WHERE username = @0`,
    [input.username],
  )) as Array<{ id: number | string }>;

  if (existing[0]) {
    return;
  }

  await dataSource.query(
    `
      INSERT INTO dbo.usuario
      (username, password_hash, tipo_usuario, proveedor_autenticacion, id_rol_seguridad, id_personal, activo)
      VALUES (@0, @1, 'ADMINISTRATIVO', 'LOCAL', @2, @3, 1)
    `,
    [input.username, input.passwordHash, input.idRolSeguridad, input.idPersonal],
  );
}

async function getUsuarioId(dataSource: DataSource, username: string): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.usuario WHERE username = @0`,
    [username],
  )) as Array<{ id: number | string }>;

  return Number(rows[0].id);
}

async function upsertTurnoServicio(
  dataSource: DataSource,
  idServicio: number,
  turno: { codigo: string; nombre: string; horaInicio: string; horaFin: string },
): Promise<number> {
  const existing = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.turno WHERE id_servicio = @0 AND codigo = @1`,
    [idServicio, turno.codigo],
  )) as Array<{ id: number | string }>;

  if (existing[0]) {
    return Number(existing[0].id);
  }

  const duracionHoras = 6;

  await dataSource.query(
    `
      INSERT INTO dbo.turno
      (id_servicio, codigo, nombre, hora_inicio, hora_fin, cruza_medianoche, duracion_horas, vigencia_desde, activo, tipo_horario)
      VALUES (@0, @1, @2, @3, @4, 0, @5, GETUTCDATE(), 1, 'CONTINUO')
    `,
    [idServicio, turno.codigo, turno.nombre, turno.horaInicio, turno.horaFin, duracionHoras],
  );

  const inserted = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.turno WHERE id_servicio = @0 AND codigo = @1`,
    [idServicio, turno.codigo],
  )) as Array<{ id: number | string }>;

  return Number(inserted[0].id);
}

async function ensureCalendarioMes(
  dataSource: DataSource,
  anio: number,
  mes: number,
  diasEnMes: number,
): Promise<Map<number, number>> {
  const calendarioIds = new Map<number, number>();

  for (let diaMes = 1; diaMes <= diasEnMes; diaMes += 1) {
    const fecha = new Date(Date.UTC(anio, mes - 1, diaMes));
    const diaSemanaNum = getIsoDayOfWeek(fecha);
    const esFinSemana = diaSemanaNum >= 6;
    const semanaMes = Math.floor((diaMes - 1) / 7) + 1;

    const existing = (await dataSource.query(
      `SELECT TOP 1 id FROM dbo.calendario WHERE fecha = @0`,
      [fecha],
    )) as Array<{ id: number | string }>;

    if (existing[0]) {
      calendarioIds.set(diaMes, Number(existing[0].id));
      continue;
    }

    await dataSource.query(
      `
        INSERT INTO dbo.calendario
        (fecha, anio, mes, dia_mes, dia_semana_num, dia_semana_nombre, semana_mes, es_fin_semana)
        VALUES (@0, @1, @2, @3, @4, @5, @6, @7)
      `,
      [fecha, anio, mes, diaMes, diaSemanaNum, DIA_SEMANA_NOMBRES[diaSemanaNum - 1], semanaMes, esFinSemana],
    );

    const inserted = (await dataSource.query(
      `SELECT TOP 1 id FROM dbo.calendario WHERE fecha = @0`,
      [fecha],
    )) as Array<{ id: number | string }>;

    calendarioIds.set(diaMes, Number(inserted[0].id));
  }

  return calendarioIds;
}

async function upsertPlanificacionServicio(
  dataSource: DataSource,
  idServicio: number,
  anio: number,
  mes: number,
  diasEnMes: number,
  idUsuarioCreador: number,
): Promise<number> {
  const existing = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2 AND activo = 1`,
    [idServicio, anio, mes],
  )) as Array<{ id: number | string }>;

  if (existing[0]) {
    return Number(existing[0].id);
  }

  const fechaInicio = new Date(Date.UTC(anio, mes - 1, 1));
  const fechaFin = new Date(Date.UTC(anio, mes - 1, diasEnMes));

  await dataSource.query(
    `
      INSERT INTO dbo.planificacion
      (id_servicio, anio, mes, version, estado, fecha_inicio, fecha_fin, id_usuario_creador, activo)
      VALUES (@0, @1, @2, 1, 'APROBADA', @3, @4, @5, 1)
    `,
    [idServicio, anio, mes, fechaInicio, fechaFin, idUsuarioCreador],
  );

  const inserted = (await dataSource.query(
    `SELECT TOP 1 id FROM dbo.planificacion WHERE id_servicio = @0 AND anio = @1 AND mes = @2 AND activo = 1`,
    [idServicio, anio, mes],
  )) as Array<{ id: number | string }>;

  return Number(inserted[0].id);
}

async function pintarRolTurnoMes(
  dataSource: DataSource,
  idPlanificacion: number,
  asignacionIds: number[],
  calendarioIds: Map<number, number>,
  turnoIds: Map<string, number>,
  idUsuarioOperacion: number,
): Promise<void> {
  const idTurnoManana = turnoIds.get('DEMO-MAN')!;
  const idTurnoTarde = turnoIds.get('DEMO-TAR')!;
  const horasProgramadas = 6;

  let insertadas = 0;

  for (const [diaMes, idCalendario] of calendarioIds.entries()) {
    for (let i = 0; i < asignacionIds.length; i += 1) {
      const idAsignacion = asignacionIds[i];
      const existing = (await dataSource.query(
        `
          SELECT TOP 1 id FROM dbo.rol_turno
          WHERE id_planificacion = @0 AND id_asignacion_personal = @1 AND id_calendario = @2 AND secuencia_dia = 1
        `,
        [idPlanificacion, idAsignacion, idCalendario],
      )) as Array<{ id: number | string }>;

      if (existing[0]) {
        continue;
      }

      const idTurno = (i + diaMes) % 2 === 0 ? idTurnoManana : idTurnoTarde;

      await dataSource.query(
        `
          INSERT INTO dbo.rol_turno
          (id_planificacion, id_asignacion_personal, id_calendario, secuencia_dia, id_turno, horas_programadas, origen_registro, created_by)
          VALUES (@0, @1, @2, 1, @3, @4, 'MANUAL', @5)
        `,
        [idPlanificacion, idAsignacion, idCalendario, idTurno, horasProgramadas, idUsuarioOperacion],
      );
      insertadas += 1;
    }
  }

  console.log(`[seed-demo] rol_turno insertadas: ${insertadas}`);
}

void main().catch((error: unknown) => {
  console.error('[seed-demo] Error:', error);
  process.exitCode = 1;
});
