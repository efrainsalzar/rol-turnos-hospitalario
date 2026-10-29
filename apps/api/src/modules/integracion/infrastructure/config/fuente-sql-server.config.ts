import { readDatabaseEnv } from '../../../../infrastructure/config/database-env';

export type ModoServidorFuente = 'MISMA_INSTANCIA' | 'PROPIA';
export type ModoCredencialesFuente = 'MISMAS' | 'PROPIAS';

export interface ConfigFuenteSqlServer {
  modoServidor: ModoServidorFuente;
  modoCredenciales: ModoCredencialesFuente;
  host: string;
  instance: string | null;
  port: number | null;
  database: string;
  user: string;
  password: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  connectTimeoutMs: number;
  requestTimeoutMs: number;
  advertencias: string[];
}

export interface DefinicionFuenteSqlServer {
  // Prefijo de las variables: `RRHH` lee RRHH_DB_*.
  prefijo: string;
  baseDatosPorDefecto: string;
  // Prefijo historico aceptado durante la transicion (`SOURCE` = SOURCE_DB_*).
  prefijoLegado?: string;
}

/**
 * Lee la conexion a una fuente SQL Server externa. Ubicacion y credenciales
 * son dos decisiones independientes:
 *
 *   <P>_DB_SERVIDOR     = MISMA_INSTANCIA (usa DB_HOST/DB_INSTANCE/DB_PORT) | PROPIA
 *   <P>_DB_CREDENCIALES = MISMAS (usa DB_USER/DB_PASSWORD)                   | PROPIAS
 *
 * Nunca se cae silenciosamente a las credenciales de la base propia: si la
 * configuracion es incompleta o ambigua, falla indicando que variable falta.
 * Se lee recien al ejecutar, no al arrancar la API, para que una fuente sin
 * configurar no impida levantar el resto del sistema.
 */
export function leerConfigFuenteSqlServer(
  definicion: DefinicionFuenteSqlServer,
): ConfigFuenteSqlServer {
  const lector = new LectorVariables(definicion);
  const { modoServidor, modoCredenciales } = lector.leerModos();

  const ubicacion =
    modoServidor === 'MISMA_INSTANCIA'
      ? leerUbicacionPropia(lector)
      : leerUbicacionExterna(lector);
  const credenciales =
    modoCredenciales === 'MISMAS'
      ? leerCredencialesPropias(lector)
      : leerCredencialesExternas(lector);

  return {
    modoServidor,
    modoCredenciales,
    ...ubicacion,
    ...credenciales,
    database: lector.opcional('NAME') ?? definicion.baseDatosPorDefecto,
    connectTimeoutMs: lector.entero('CONNECT_TIMEOUT_MS', 5000),
    requestTimeoutMs: lector.entero('REQUEST_TIMEOUT_MS', 15000),
    advertencias: lector.advertencias(),
  };
}

function leerUbicacionPropia(lector: LectorVariables) {
  lector.prohibir(['HOST', 'INSTANCE', 'PORT'], 'SERVIDOR=MISMA_INSTANCIA');
  const env = readDatabaseEnv();

  return {
    host: env.host,
    instance: env.instance,
    port: env.port,
    encrypt: env.encrypt,
    trustServerCertificate: env.trustServerCertificate,
  };
}

function leerUbicacionExterna(lector: LectorVariables) {
  return {
    host: lector.obligatorio('HOST', 'SERVIDOR=PROPIA'),
    instance: lector.opcional('INSTANCE'),
    port: lector.puerto('PORT'),
    encrypt: lector.booleano('ENCRYPT', false),
    trustServerCertificate: lector.booleano('TRUST_SERVER_CERTIFICATE', true),
  };
}

function leerCredencialesPropias(lector: LectorVariables) {
  lector.prohibir(['USER', 'PASSWORD'], 'CREDENCIALES=MISMAS');
  const env = readDatabaseEnv();

  return { user: env.user, password: env.password };
}

function leerCredencialesExternas(lector: LectorVariables) {
  return {
    user: lector.obligatorio('USER', 'CREDENCIALES=PROPIAS'),
    password: lector.obligatorio('PASSWORD', 'CREDENCIALES=PROPIAS'),
  };
}

class LectorVariables {
  private readonly legadas = new Set<string>();

  constructor(private readonly definicion: DefinicionFuenteSqlServer) {}

  leerModos(): {
    modoServidor: ModoServidorFuente;
    modoCredenciales: ModoCredencialesFuente;
  } {
    const servidor = this.valorNuevo('SERVIDOR');
    const credenciales = this.valorNuevo('CREDENCIALES');

    if (servidor || credenciales) {
      return {
        modoServidor: this.validarModo('SERVIDOR', servidor, [
          'MISMA_INSTANCIA',
          'PROPIA',
        ] as const),
        modoCredenciales: this.validarModo('CREDENCIALES', credenciales, [
          'MISMAS',
          'PROPIAS',
        ] as const),
      };
    }

    return this.leerModosLegados();
  }

  // Antes un unico interruptor (<LEGADO>_DB_USE_TARGET_CONNECTION) decidia
  // ubicacion y credenciales a la vez; se traduce a los dos ejes nuevos.
  private leerModosLegados(): {
    modoServidor: ModoServidorFuente;
    modoCredenciales: ModoCredencialesFuente;
  } {
    const legado = this.definicion.prefijoLegado;
    const usarDestino = legado
      ? process.env[`${legado}_DB_USE_TARGET_CONNECTION`]?.trim()
      : undefined;
    const hostLegado = legado
      ? process.env[`${legado}_DB_HOST`]?.trim()
      : undefined;

    if (legado && (usarDestino || hostLegado)) {
      this.legadas.add(`${legado}_DB_USE_TARGET_CONNECTION`);
      const mismo = usarDestino?.toLowerCase() === 'true';
      return mismo
        ? { modoServidor: 'MISMA_INSTANCIA', modoCredenciales: 'MISMAS' }
        : { modoServidor: 'PROPIA', modoCredenciales: 'PROPIAS' };
    }

    throw new Error(
      `Falta configurar la conexion a la fuente: defina ${this.nombre('SERVIDOR')} ` +
        `(MISMA_INSTANCIA | PROPIA) y ${this.nombre('CREDENCIALES')} (MISMAS | PROPIAS).`,
    );
  }

  private validarModo<T extends string>(
    sufijo: string,
    valor: string | null,
    permitidos: readonly T[],
  ): T {
    const normalizado = valor?.toUpperCase();
    const modo = permitidos.find((p) => p === normalizado);

    if (!modo) {
      throw new Error(
        `${this.nombre(sufijo)} debe ser ${permitidos.join(' o ')}` +
          (valor ? ` (valor actual: "${valor}").` : ' y no esta definida.'),
      );
    }

    return modo;
  }

  obligatorio(sufijo: string, motivo: string): string {
    const valor = this.opcional(sufijo);

    if (!valor) {
      throw new Error(`${this.nombre(sufijo)} es obligatoria con ${motivo}.`);
    }

    return valor;
  }

  // Con MISMA_INSTANCIA/MISMAS, definir tambien las propias seria ambiguo:
  // no se sabria cual se esta usando realmente.
  prohibir(sufijos: string[], motivo: string): void {
    const definidas = sufijos.filter((s) => this.valorNuevo(s));

    if (definidas.length > 0) {
      throw new Error(
        `Con ${motivo} no se deben definir ${definidas.map((s) => this.nombre(s)).join(', ')}: ` +
          'se usan las de la base propia (DB_*). Quitelas o cambie el modo.',
      );
    }
  }

  opcional(sufijo: string): string | null {
    const nuevo = this.valorNuevo(sufijo);
    if (nuevo) return nuevo;

    const legado = this.definicion.prefijoLegado;
    const valorLegado = legado
      ? process.env[`${legado}_DB_${sufijo}`]?.trim()
      : undefined;
    if (legado && valorLegado) {
      this.legadas.add(`${legado}_DB_${sufijo}`);
      return valorLegado;
    }

    return null;
  }

  puerto(sufijo: string): number | null {
    const valor = this.opcional(sufijo);
    if (!valor) return null;

    const port = Number(valor);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error(`${this.nombre(sufijo)} debe ser un puerto valido.`);
    }

    return port;
  }

  entero(sufijo: string, porDefecto: number): number {
    const valor = this.opcional(sufijo);
    if (!valor) return porDefecto;

    const parsed = Number(valor);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${this.nombre(sufijo)} debe ser un entero valido.`);
    }

    return parsed;
  }

  booleano(sufijo: string, porDefecto: boolean): boolean {
    const valor = this.opcional(sufijo);
    return valor ? valor.toLowerCase() === 'true' : porDefecto;
  }

  advertencias(): string[] {
    if (this.legadas.size === 0) return [];

    return [
      `Se usaron variables con nombre anterior (${[...this.legadas].join(', ')}). ` +
        `Renombrelas a ${this.definicion.prefijo}_DB_* (ver apps/api/.env.example).`,
    ];
  }

  private valorNuevo(sufijo: string): string | null {
    return process.env[this.nombre(sufijo)]?.trim() || null;
  }

  private nombre(sufijo: string): string {
    return `${this.definicion.prefijo}_DB_${sufijo}`;
  }
}
