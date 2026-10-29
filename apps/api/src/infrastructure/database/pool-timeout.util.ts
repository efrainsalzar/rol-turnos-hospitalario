// El pool de conexiones a SQL Server (driver `mssql`, pool `tarn` interno) lanza
// esta clase cuando una request agota `DB_POOL_ACQUIRE_TIMEOUT_MS` esperando una
// conexion libre. No se importa `tarn` directamente porque es una dependencia
// transitiva de `mssql` (no declarada en package.json): detectarla por el nombre
// de su constructor evita acoplar el codigo de la aplicacion a un paquete que no
// controlamos, sin perder la capacidad de distinguir este caso puntual (pool
// saturado, la request nunca llego a ejecutar consulta alguna) de cualquier otro
// error de base de datos.
export function isPoolAcquireTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.constructor.name === 'TimeoutError';
}
