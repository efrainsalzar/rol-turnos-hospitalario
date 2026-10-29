# Política de migraciones por perfil

Las migraciones `001` a `010` ya forman parte del historial activo y no deben
renumerarse ni editarse después de haber sido aplicadas en un entorno.

## Nuevas migraciones

Las futuras migraciones deben:

- usar una versión mayor a la última activa, con el formato `NNN_descripcion.sql`: los ejecutores
  (`apps/api/scripts/lib/migraciones.ts`) toman todos los archivos de esta carpeta con ese formato y
  los corren en orden numérico, así que crear el archivo es todo lo necesario;
- ser idempotentes y transaccionales;
- registrar el estado en `dbo.schema_migration`;
- evitar `CREATE OR ALTER`, `DROP IF EXISTS` y `THROW`;
- parametrizar valores cuando ejecuten consultas desde TypeScript;
- probarse en SQL Server 2008 R2 y SQL Server moderno.

Cuando exista una diferencia real de motor o perfil, organizarla así:

```text
database/migrations/
├── common/
├── mssql-modern/
├── mssql-2008r2/
└── postgres/
```

No se deben mover las migraciones activas actuales a estas carpetas sin
actualizar primero el ejecutor y verificar todos los entornos. Esta estructura
es para nuevas migraciones cuando el selector por perfil esté implementado.

## Validación mínima

```powershell
npm run build:api
npm run doctor
npm run migrate:api
npm run doctor
```

Las migraciones nunca deben ejecutarse contra la base oficial de personal.
