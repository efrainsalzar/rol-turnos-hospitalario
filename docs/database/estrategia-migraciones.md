# Estrategia de migraciones

## Objetivo

Las migraciones deben ser:

* versionadas
* ordenadas
* ejecutables desde cero
* auditables en revision tecnica
* independientes del ORM

## Estructura

```text
database/
  migrations/
    001_baseline_organizacion.sql
    002_baseline_personal.sql
    003_baseline_seguridad.sql
    004_baseline_operacion.sql
    005_baseline_planificacion.sql
    006_seed_catalogos_base.sql
    007_seed_extension_documento_identidad.sql
    010_seed_departamento_pendiente_asignacion.sql
    archive/
  seeds/
    README.md
```

Estructura vigente desde la consolidacion del 2026-07-22 (baseline limpio, ver
`docs/database/decisiones-tecnicas.md`). Las migraciones `008`/`009` no aparecen en esta lista a
proposito: no eran esquema, eran datos reales del hospital, se sacaron del baseline el 2026-07-23 y
ahora viven como seeds opcionales (`database/seeds/hospital-00N_*.sql`) — ver seccion 136 de
decisiones-tecnicas.md. Los archivos originales quedaron en `database/migrations/archive/` como
registro historico, junto con el historial completo previo a la consolidacion.

## Convenciones

* cada archivo representa un cambio estable y versionado
* los nombres usan prefijo numerico fijo de tres digitos
* las migraciones iniciales se ejecutan en orden ascendente
* cada migracion abre su propia transaccion

## Criterio de separacion

La separacion por archivos sigue el dominio relacional (organizacion, personal, seguridad,
operacion, planificacion), mas archivos de seed de catalogos base y extensiones puntuales. No se
numera aqui una lista fija por archivo para evitar que este documento se desincronice otra vez (ver
nota mas abajo) — la lista completa y vigente es siempre el contenido de `database/migrations/`.

## Dependencias diferidas

Hay dependencias circulares en el modelo que obligan a diferir algunas FK:

* `historial_asignacion.id_usuario` se crea en personal y se enlaza una vez existe `usuario`
* (historico) `planificacion.id_plantilla_planificacion` se materializaba como FK despues de crear `plantilla_planificacion` — columna y tabla eliminadas en la migracion `041`, ver `docs/database/decisiones-tecnicas.md §29`

Esto mantiene el orden funcional sin romper el modelo.

## Ejecucion desde cero

Desde el 2026-10-24 (`decisiones-tecnicas.md` §163) la carpeta `database/migrations/` es la unica fuente: `apps/api/scripts/lib/migraciones.ts` lista los archivos `NNN_*.sql` y los ejecuta en orden numerico, y lo usan `npm run migrate:api`, `npm run reset:db` y `npm run doctor` (que informa las pendientes). **Agregar una migracion es solo crear el archivo con el numero siguiente**; no hay ninguna lista que editar. Antes existian dos listas escritas a mano (`database/run-migrations.sql` y `MIGRATION_FILES`) y una migracion agregada a una sola rompio la otra dos veces (§148, §162).

Sin Node (por ejemplo, un administrador en el servidor de una institucion): ejecutar los archivos de `database/migrations/` en orden numerico con `sqlcmd` o SSMS, despues de crear `dbo.schema_migration` (definicion en `lib/migraciones.ts`). Cada archivo es idempotente.

**Validacion obligatoria antes de mergear una migracion nueva:** correr `npm run migrate:api` contra una base ya migrada (no solo contra una base nueva) y confirmar que termina sin errores. El 2026-07-06 esto detecto un bug real: la migracion `011_add_export_codes_operacion.sql` no protegia sus sentencias contra `dbo.tipo_turno` ya no existir (la tabla se elimina en la `033`), asi que el script completo fallaba al re-ejecutarse sobre cualquier base ya migrada, aunque en una instalacion desde cero (orden estricto 001→039) nunca fallaba. Cada migracion que dependa de que un objeto exista debe protegerse con `IF OBJECT_ID(...) IS NOT NULL`, no asumir que solo se ejecutara una vez en su vida.

## Seeds

La migracion `006_seed_catalogos_base.sql` solo crea catalogos base no controversiales y respaldados
por la documentacion (roles de seguridad, `rol_funcional`, `incidencia_personal`, `tipo_feriado`).

No incluye:

* calendario anual
* datos institucionales reales del hospital (viven en `database/seeds/hospital-00N_*.sql`, opcionales)
* contratos o familias laborales no validadas formalmente

Los seeds de entorno o de carga inicial real deben vivir fuera del baseline y documentarse en `database/seeds/`.

## Runner de migraciones (ya existe, no es futuro)

Ya existe tabla de historial aplicada (`dbo.schema_migration`, version/nombre/aplicado_at/checksum/estado) y un ejecutor unico que la usa (`apps/api/scripts/lib/migraciones.ts`, desde `migrate:api` y `reset:db`). Esta seccion decia "futuro" cuando en realidad ya estaba construido — corregido el 2026-07-06.

Nota sobre la propia tabla de historial: no todas las migraciones registran su aplicacion ahi. Las migraciones `011`, `012`, `015`, `016`, `018`, `019` dependen solo de guards `IF NOT EXISTS` internos (nunca insertan/actualizan `dbo.schema_migration`), y `020`/`021` consultan la tabla pero nunca la actualizan — quedan "no aplicadas" para siempre y sus sentencias se re-evaluan en cada corrida. Esto no es necesariamente incorrecto (sus guards internos evitan duplicar datos), pero reduce la trazabilidad exigida por `ARQUITECTURA.md` §1.5 y §6. Si se toca una de estas migraciones a futuro, considerar agregarle el mismo bloque de tracking que usan las demas.

Criterio central que se mantiene:

* el SQL sigue siendo la fuente de verdad del esquema
* el dominio sigue sin conocer migraciones

## Portabilidad futura a PostgreSQL

La estrategia de salida es:

1. conservar contratos de dominio y application
2. reimplementar repositorios e integracion
3. traducir migraciones a la sintaxis del motor destino
4. ejecutar la misma suite de pruebas de integracion y casos de uso

La portabilidad se consigue por desacoplamiento arquitectonico, no por fingir que todos los motores aceptan exactamente el mismo SQL.
