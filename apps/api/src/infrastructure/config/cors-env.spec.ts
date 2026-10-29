import { readCorsEnv } from './cors-env';

describe('readCorsEnv', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CORS_ORIGINS;
    delete process.env.CORS_CREDENTIALS;
    delete process.env.NODE_ENV;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should parse origins and credentials', () => {
    process.env.CORS_ORIGINS = 'http://localhost:3001, http://127.0.0.1:3001,';
    process.env.CORS_CREDENTIALS = 'false';

    expect(readCorsEnv()).toEqual({
      origins: ['http://localhost:3001', 'http://127.0.0.1:3001'],
      credentials: false,
    });
  });

  it('should reject wildcard origins when credentials are enabled', () => {
    process.env.CORS_ORIGINS = '*';
    process.env.CORS_CREDENTIALS = 'true';

    expect(() => readCorsEnv()).toThrow(
      'La variable de entorno CORS_ORIGINS no puede usar "*" cuando CORS_CREDENTIALS=true.',
    );
  });

  it('should require explicit origins in production', () => {
    process.env.NODE_ENV = 'production';

    expect(() => readCorsEnv()).toThrow(
      'La variable de entorno CORS_ORIGINS es obligatoria en produccion.',
    );
  });
});
