export interface CorsEnv {
  origins: string[];
  credentials: boolean;
}

export function readCorsEnv(): CorsEnv {
  const credentials = getBooleanEnv('CORS_CREDENTIALS', false);
  const origins = parseOrigins(process.env.CORS_ORIGINS);
  const isProduction = process.env.NODE_ENV?.trim() === 'production';

  if (credentials && origins.includes('*')) {
    throw new Error(
      'La variable de entorno CORS_ORIGINS no puede usar "*" cuando CORS_CREDENTIALS=true.',
    );
  }

  if (isProduction && origins.length === 0) {
    throw new Error(
      'La variable de entorno CORS_ORIGINS es obligatoria en produccion.',
    );
  }

  return {
    origins,
    credentials,
  };
}

function parseOrigins(rawOrigins: string | undefined): string[] {
  if (!rawOrigins) {
    return [];
  }

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim();

  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}
