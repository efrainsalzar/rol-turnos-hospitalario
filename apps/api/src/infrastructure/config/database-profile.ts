export type DatabaseProfileName = 'mssql-modern' | 'mssql-2008r2';

export interface DatabaseCapabilities {
  supportsOffsetFetch: boolean;
  supportsStringAgg: boolean;
  supportsJsonFunctions: boolean;
  supportsWindowFunctions: boolean;
}

export interface DatabaseProfile {
  name: DatabaseProfileName;
  dialect: 'mssql';
  compatibilityLevel: number;
  capabilities: DatabaseCapabilities;
}

const PROFILES: Record<DatabaseProfileName, DatabaseProfile> = {
  'mssql-modern': {
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
  'mssql-2008r2': {
    name: 'mssql-2008r2',
    dialect: 'mssql',
    compatibilityLevel: 100,
    capabilities: {
      supportsOffsetFetch: false,
      supportsStringAgg: false,
      supportsJsonFunctions: false,
      supportsWindowFunctions: true,
    },
  },
};

export function readDatabaseProfile(): DatabaseProfile {
  const rawProfile = process.env.DB_PROFILE?.trim() || 'mssql-modern';

  if (!(rawProfile in PROFILES)) {
    throw new Error(
      `El perfil de base de datos ${rawProfile} no esta soportado. ` +
        `Use mssql-modern o mssql-2008r2.`,
    );
  }

  const profile = PROFILES[rawProfile as DatabaseProfileName];
  const configuredCompatibility = process.env.DB_COMPATIBILITY_LEVEL?.trim();

  if (!configuredCompatibility) {
    return profile;
  }

  const compatibilityLevel = Number(configuredCompatibility);

  if (!Number.isInteger(compatibilityLevel) || compatibilityLevel <= 0) {
    throw new Error(
      'La variable DB_COMPATIBILITY_LEVEL debe ser un entero positivo.',
    );
  }

  return { ...profile, compatibilityLevel };
}
