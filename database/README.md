# Database

Linea base de base de datos y migraciones del proyecto.

## Estructura

* `migrations/`: DDL y seeds versionados del baseline (politica en `migrations/README.md`)
* `seeds/`: semillas de entorno, cargas operativas o datos auxiliares fuera del baseline
* `integracion/`: consultas versionadas de lectura sobre fuentes externas (por ejemplo `rrhh-externo/`)
* `scripts/`: creacion de bases por entorno, diagnostico y mantenimiento

## Orden de ejecucion

La carpeta `migrations/` es la unica fuente: `npm run migrate:api`, `npm run reset:db` y
`npm run doctor` leen sus archivos `NNN_*.sql` y los ejecutan en orden numerico
(`apps/api/scripts/lib/migraciones.ts`). Hoy:

1. `001_baseline_organizacion.sql`
2. `002_baseline_personal.sql`
3. `003_baseline_seguridad.sql`
4. `004_baseline_operacion.sql`
5. `005_baseline_planificacion.sql`
6. `006_seed_catalogos_base.sql`
7. `007_seed_extension_documento_identidad.sql`
8. `010_seed_departamento_pendiente_asignacion.sql`
9. `011_integracion_personal.sql` a `018_integracion_trazabilidad_ejecucion.sql`

Agregar una migracion es solo crear el archivo con el numero siguiente; no hay ninguna lista que
editar (`docs/database/decisiones-tecnicas.md` §163).

## Motores y versiones soportados

Las migraciones son un solo conjunto comun escrito con la sintaxis que acepta
SQL Server 2008 R2, de modo que los mismos archivos corren en 2008 R2 y en
versiones modernas. El backend ajusta las diferencias con `DB_PROFILE`
(`mssql-modern` | `mssql-2008r2`) y `DB_COMPATIBILITY_LEVEL`.

| Motor | Estado |
| --- | --- |
| SQL Server 2022 | Motor de esta instalacion (`decisiones-tecnicas.md` §36) |
| SQL Server 2008 R2 | Perfil de portabilidad validado con `roles_turnos_2008r2_prueba` (§140) |
| SQL Server 2012-2019 | Sin validar; deberia funcionar con `mssql-modern` y su nivel de compatibilidad |
| PostgreSQL u otro motor | No soportado (el experimento `postgres-poc/` se retiro el 2026-10-25, §165) |

## Reglas

* toda migracion nueva debe correr en SQL Server 2008 R2 y en SQL Server moderno
  (guia de sintaxis: `docs/database/compatibilidad-consultas-sql.md`)
* sin dependencia directa del ORM
* toda modificacion estructural futura debe ser una nueva migracion
* no editar la base manualmente fuera de migraciones

## Nota de arquitectura

Estas migraciones pertenecen a infraestructura. El dominio y los casos de uso no deben depender de los scripts SQL ni de detalles del motor.
