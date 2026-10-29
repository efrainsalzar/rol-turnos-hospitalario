# Base de datos

Esta carpeta documenta la estrategia inicial de base de datos del Sistema de Gestion de Roles y Turnos Hospitalarios.

## Objetivo

La base debe cumplir tres condiciones al mismo tiempo:

1. Funcionar hoy sobre SQL Server 2022 en desarrollo.
2. Ser 100% compatible con SQL Server 2008 R2 SP3 en produccion.
3. Mantener el dominio desacoplado del motor y del ORM para facilitar una futura migracion a PostgreSQL, MySQL u otro motor.

## Principios

- El dominio no conoce tablas, drivers ni decorators de ORM.
- Las migraciones viven fuera del dominio y son responsabilidad de infraestructura.
- El DDL usa solo capacidades compatibles con SQL Server 2008 R2.
- La logica de negocio vive en backend; la base protege integridad estructural y restricciones locales de fila.
- Las reglas no expresables de forma portable en SQL se validan en application/domain.

## Estado actual del repositorio

- El proyecto NestJS ya tiene health endpoints y modulos funcionales iniciales.
- `TypeORM` ya esta incorporado de forma controlada en infraestructura.
- La base inicial sigue modelada con SQL versionado como fuente de verdad del esquema.

## Configuracion local

El entorno local usa tres perfiles: `demo` (`roles_turnos_demo`, datos ficticios), `preparacion`
(`planificacion_turnos_preparacion`, copia de trabajo con datos reales) y `produccion`
(`planificacion_turnos`, ensayo local de la base oficial, no reseteable), activados con
`npm run env:<perfil>`. Cada perfil vive en `apps/api/.env.<perfil>` (fuera de git), creado desde
su plantilla `.env.<perfil>.example`. Guia completa: `docs/deployment/guia-perfiles-entorno.md`;
referencia de todas las variables y sus valores por defecto: `apps/api/.env.example`.

Notas:

- `DB_PORT` puede quedar vacio si la conexion usa nombre de instancia.
- `DB_ENCRYPT=false` reduce friccion en entornos locales donde `sqlcmd` o el driver presentan problemas TLS.
- `DB_TRUST_SERVER_CERTIFICATE=true` es aceptable solo para desarrollo local.
- `DB_DIALECT` ya no necesita declararse en el `.env`; el backend usa `mssql` por defecto.
- los reintentos de conexión deben ser finitos y configurables para evitar loops infinitos de arranque.

## Conexion local a SQL Server

Instancia prevista:

```text
localhost\SQLEXPRESS
```

Base inicial para tareas administrativas:

```text
master
```

Prueba de conexion sugerida:

```bash
sqlcmd -S localhost\SQLEXPRESS -U <usuario_sql> -P <password_sql> -d master -l 15 -b -C -i .\database\scripts\test-connection.sql
```

Si `sqlcmd` no reconoce `-C`, ejecutar el mismo comando sin `-C`.

## Verificacion desde el backend

El backend dispone de una integracion tecnica con `mssql` y persistencia controlada con `TypeORM`.

Endpoint disponible:

```text
GET /health/live
GET /health/app
GET /health/ready
GET /health/database
```

Uso sugerido:

1. levantar NestJS con `npm run start:dev`
2. invocar `GET /health/live` para validar que NestJS responde
3. invocar `GET /health/ready` para validar readiness operativa
4. invocar `GET /health/database` para revisar detalle tecnico de la conexion

Notas de ejecución:

- la raíz del repositorio mantiene la configuración compartida de compilación, pruebas y lint
- desde la raíz, `npm run start:dev` sigue apuntando a la API
- desde `apps/api`, también puedes ejecutar `npm run start:dev` porque sus scripts delegan a la raíz
- la API resuelve `apps/api/.env` aunque se levante desde la raíz
- el `.env` de la raíz, si existe, solo debe apuntar a `apps/api/.env` y `apps/web/.env`
- el build del backend puede apoyarse en `rimraf` cuando se necesite una limpieza explícita, pero no depende de borrar artefactos en cada compilación normal

Endpoint funcional inicial:

```text
GET /v1/departamentos
GET /v1/servicios
GET /v1/personal
GET /v1/roles
GET /v1/usuarios
GET /v1/tipos-dia
GET /v1/turnos
```

## Flujo local recomendado

Demo (ver `database/seeds/README.md` para el detalle completo):

```bash
npm run env:demo
npm run reset:db        # drop + create + migraciones — base limpia, sin datos
npm run seed:demo       # organizacion, personal y planificacion ficticios
```

En una instancia real el personal puede entrar por la sincronizacion con un sistema de RRHH externo
(modulo `integracion`, consulta en `database/integracion/rrhh-externo/`).

Pasos SQL individuales equivalentes, si hace falta correrlos sueltos:

1. Probar conexion con `database/scripts/test-connection.sql`
2. Crear la base demo con `database/scripts/create-database-demo.sql`
3. Ejecutar migraciones con `npm run migrate:api` (todos los archivos de `database/migrations/`)
4. Validar esquema con `database/scripts/check-schema.sql`

## ORM en uso

El proyecto ya usa `TypeORM` como ORM controlado para los modulos iniciales. Reglas vigentes:

- su uso debe limitarse a `infrastructure/persistence`
- las entidades de dominio no deben depender de decorators del ORM
- las migraciones SQL deben seguir siendo revisables y explícitas y correr en SQL Server 2008 R2 y moderno (2022 es el motor de esta instalación; 2008 R2 se mantiene como perfil de portabilidad, ver `decisiones-tecnicas.md` secciones 36, 140 y 160)
- cualquier SQL generado automaticamente debe auditarse antes de adoptarse
- `synchronize` debe permanecer en `false`

La integracion tecnica con SQL Server para health, readiness y diagnostico sigue usando `mssql`.

## Documentos

- `decisiones-tecnicas.md`: decisiones base del diseno y del desacoplamiento
- `compatibilidad-sql-server-2008-r2.md`: **[superado 2026-07-08]** contexto histórico, ya no son reglas vigentes (ver `decisiones-tecnicas.md` sección 36)
- `estrategia-migraciones.md`: versionado, orden, ejecucion y futura portabilidad
- `estrategia-orm.md`: criterios para introducir ORM sin romper el desacoplamiento
- `contexto-sistema-rol-turnos.md`: contexto funcional y operativo que respalda el modelo
- `modelo-relacional-rol-turnos.md`: referencia relacional base para DDL y backend
  (gitignored desde 2026-07-24, solo disponible localmente; ver `database/seeds/README.md`)
- `../deployment/guia-perfiles-entorno.md`: perfiles `demo`, `preparacion` y `produccion`, backup y restore
