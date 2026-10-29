import { Injectable } from '@nestjs/common';
import * as mssql from 'mssql';
import { ConfigFuenteSqlServer } from '../../config/fuente-sql-server.config';

const SENTENCIAS_DE_ESCRITURA =
  /\b(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|EXEC|EXECUTE|GRANT|REVOKE|DENY|INTO)\b/i;

export interface LecturaSqlServer<TFila> {
  filas: TFila[];
  permisoEscritura: boolean;
}

/**
 * Lee de una base que no pertenece a esta aplicacion. Tres protecciones
 * independientes, porque hoy la credencial puede ser el usuario maestro:
 *  1. la consulta se rechaza si contiene cualquier sentencia de escritura;
 *  2. corre dentro de una transaccion que siempre se revierte;
 *  3. se usa un pool propio, de corta vida, separado del de la aplicacion,
 *     para que una fuente lenta o caida no afecte a la API.
 */
@Injectable()
export class LectorSqlServerSoloLectura {
  async leer<TFila>(
    config: ConfigFuenteSqlServer,
    consulta: string,
    objetoVerificacionPermisos: string,
  ): Promise<LecturaSqlServer<TFila>> {
    assertConsultaDeSoloLectura(consulta);

    const pool = new mssql.ConnectionPool({
      server: config.host,
      port: config.port ?? undefined,
      user: config.user,
      password: config.password,
      database: config.database,
      connectionTimeout: config.connectTimeoutMs,
      requestTimeout: config.requestTimeoutMs,
      pool: { max: 1, min: 0 },
      options: {
        encrypt: config.encrypt,
        trustServerCertificate: config.trustServerCertificate,
        instanceName: config.port ? undefined : (config.instance ?? undefined),
      },
    });

    await pool.connect();
    const transaccion = new mssql.Transaction(pool);

    try {
      await transaccion.begin();
      const permisoEscritura = await tienePermisoEscritura(
        transaccion,
        objetoVerificacionPermisos,
      );
      const resultado = await new mssql.Request(transaccion).query<TFila>(
        consulta,
      );

      return { filas: resultado.recordset, permisoEscritura };
    } finally {
      await revertirSinOcultarError(transaccion);
      await pool.close();
    }
  }
}

export function describirDestino(config: ConfigFuenteSqlServer): string {
  const servidor = config.port
    ? `${config.host}:${config.port}`
    : config.instance
      ? `${config.host}\\${config.instance}`
      : config.host;
  return `${servidor}/${config.database}`;
}

export function describirModo(config: ConfigFuenteSqlServer): string {
  return `${config.modoServidor}/${config.modoCredenciales}`;
}

function assertConsultaDeSoloLectura(consulta: string): void {
  const sinComentarios = consulta
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ');

  if (!/^\s*(SELECT|WITH)\b/i.test(sinComentarios)) {
    throw new Error(
      'La consulta a una fuente externa debe empezar con SELECT.',
    );
  }

  const sentencia = SENTENCIAS_DE_ESCRITURA.exec(sinComentarios);
  if (sentencia) {
    throw new Error(
      `La consulta a una fuente externa no puede contener ${sentencia[1].toUpperCase()}.`,
    );
  }
}

// Permisos efectivos (incluye roles fijos como db_owner o sysadmin) sobre la
// base completa o sobre el objeto que se lee.
async function tienePermisoEscritura(
  transaccion: mssql.Transaction,
  objeto: string,
): Promise<boolean> {
  const request = new mssql.Request(transaccion);
  request.input('objeto', mssql.NVarChar(256), objeto);
  const resultado = await request.query<{ escritura: number }>(`
    SELECT CASE WHEN
      ISNULL(HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT'), 0) = 1 OR
      ISNULL(HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'UPDATE'), 0) = 1 OR
      ISNULL(HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'DELETE'), 0) = 1 OR
      ISNULL(HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'ALTER'), 0) = 1 OR
      ISNULL(HAS_PERMS_BY_NAME(@objeto, 'OBJECT', 'INSERT'), 0) = 1 OR
      ISNULL(HAS_PERMS_BY_NAME(@objeto, 'OBJECT', 'UPDATE'), 0) = 1 OR
      ISNULL(HAS_PERMS_BY_NAME(@objeto, 'OBJECT', 'DELETE'), 0) = 1
    THEN 1 ELSE 0 END AS escritura
  `);

  return resultado.recordset[0]?.escritura === 1;
}

async function revertirSinOcultarError(
  transaccion: mssql.Transaction,
): Promise<void> {
  try {
    await transaccion.rollback();
  } catch {
    // Si begin() fallo no hay transaccion que revertir; el error real ya se
    // esta propagando y no debe reemplazarse por este.
  }
}
