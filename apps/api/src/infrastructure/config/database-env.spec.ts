import { readDatabaseEnv } from './database-env';

describe('readDatabaseEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.DB_HOST = 'localhost';
    process.env.DB_INSTANCE = 'SQLEXPRESS';
    process.env.DB_PORT = '';
    process.env.DB_NAME = 'roles_turnos_demo';
    process.env.DB_USER = 'usuario_prueba';
    process.env.DB_PASSWORD = 'clave_prueba';
    process.env.DB_ENCRYPT = 'false';
    process.env.DB_TRUST_SERVER_CERTIFICATE = 'true';
    process.env.DB_DIALECT = 'mssql';
    process.env.DB_PROFILE = 'mssql-modern';
    process.env.DB_COMPATIBILITY_LEVEL = '160';
    process.env.DB_CONNECT_MAX_RETRIES = '5';
    process.env.DB_CONNECT_RETRY_DELAY_MS = '3000';
    process.env.DB_CONNECT_TIMEOUT_MS = '5000';
    process.env.DB_REQUEST_TIMEOUT_MS = '15000';
    process.env.DB_POOL_MAX = '10';
    process.env.DB_POOL_ACQUIRE_TIMEOUT_MS = '10000';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should parse the database environment correctly', () => {
    expect(readDatabaseEnv()).toEqual({
      host: 'localhost',
      instance: 'SQLEXPRESS',
      port: null,
      name: 'roles_turnos_demo',
      user: 'usuario_prueba',
      password: 'clave_prueba',
      encrypt: false,
      trustServerCertificate: true,
      dialect: 'mssql',
      profile: {
        name: 'mssql-modern',
        dialect: 'mssql',
        compatibilityLevel: 160,
        capabilities: {
          supportsOffsetFetch: true,
          supportsStringAgg: true,
          supportsJsonFunctions: true,
          supportsWindowFunctions: true,
        },
      },
      connectMaxRetries: 5,
      connectRetryDelayMs: 3000,
      connectTimeoutMs: 5000,
      requestTimeoutMs: 15000,
      poolMax: 10,
      poolAcquireTimeoutMs: 10000,
    });
  });

  it('should throw when a required variable is missing', () => {
    delete process.env.DB_NAME;

    expect(() => readDatabaseEnv()).toThrow(
      'La variable de entorno DB_NAME es obligatoria.',
    );
  });

  it('should fall back to defaults for requestTimeoutMs and pool settings when not set', () => {
    delete process.env.DB_REQUEST_TIMEOUT_MS;
    delete process.env.DB_POOL_MAX;
    delete process.env.DB_POOL_ACQUIRE_TIMEOUT_MS;

    const env = readDatabaseEnv();

    expect(env.requestTimeoutMs).toBe(15000);
    expect(env.poolMax).toBe(10);
    expect(env.poolAcquireTimeoutMs).toBe(10000);
  });
});
