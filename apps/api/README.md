# API

Backend NestJS del proyecto.

Ubicación:

* el código fuente vive en `apps/api/src`
* las pruebas e2e viven en `apps/api/test`
* la configuración propia de Nest y TypeScript vive en `apps/api`
* `database/` y `docs/` permanecen en la raíz como capas compartidas

Flujo de ejecución:

* desde la raíz del repositorio:
  * `npm run start:dev`
  * `npm run clean`
  * `npm run dev:api`
  * `npm run build`
  * `npm run typecheck:api`
* desde `apps/api`:
  * `npm run start:dev`
  * `npm run build`

`npm run test` y `npm run test:e2e` siguen existiendo para retomar las pruebas en el futuro, pero están suspendidos (`docs/database/decisiones-tecnicas.md` §150) y ningún build ni arranque los ejecuta.

Notas:

* la API puede ejecutarse directamente desde `apps/api`
* `apps/api/.env` es la fuente real de variables del backend en desarrollo
* el `.env` de la raíz es opcional y solo sirve como wrapper del monorepo
* si existe `apps/api/.env`, la API lo resuelve tanto desde la raíz como desde `apps/api`
* la raíz del repositorio es la fuente de verdad para dependencias y scripts coordinadores del monorepo
* la configuración específica del backend ya no vive en la raíz:
  * `apps/api/nest-cli.json` — desarrollo (`start`, `start:dev`, `start:debug`) con SWC y chequeo de tipos en paralelo
  * `apps/api/.swcrc` — iguala la semántica de SWC a la de `tsc` (`useDefineForClassFields`)
  * `apps/api/tsconfig.json` — editor, ESLint, `ts-node` (scripts, en modo `transpileOnly`) y `npm run typecheck:api`; solo `src`, sin specs
  * `apps/api/tsconfig.build.json` — build de producción con `tsc`; salida en `dist/apps/api/src/main.js`
  * `apps/api/tsconfig.spec.json` — solo para Jest; las pruebas están suspendidas (`docs/database/decisiones-tecnicas.md` §150) y nada del flujo diario lo usa
  * `apps/api/eslint.config.mjs`
* `build:api` y `start*` limpian `dist/apps/api` con `rimraf` antes de compilar: `rimraf` reintenta ante archivos bloqueados en Windows (`EBUSY`), cosa que el `deleteOutDir` de la CLI de Nest no hace (ver `decisiones-tecnicas.md` §158)
* los scripts locales de `apps/api` son wrappers que delegan a la raíz para evitar deriva entre entornos
* si cambia la configuración compartida, el ajuste debe hacerse primero en la raíz y luego reflejarse en la documentación

## Variables de entorno

Perfiles (guia: [docs/deployment/guia-perfiles-entorno.md](/docs/deployment/guia-perfiles-entorno.md)):

* [apps/api/.env.demo.example](/apps/api/.env.demo.example) — `demo`, datos ficticios
* [apps/api/.env.preparacion.example](/apps/api/.env.preparacion.example) — `preparacion`, copia de trabajo con datos reales
* [apps/api/.env.produccion.example](/apps/api/.env.produccion.example) — `produccion`, ensayo local de la base oficial
* [apps/api/.env.production.example](/apps/api/.env.production.example) — servidor real, sin perfiles
* [apps/api/.env.example](/apps/api/.env.example) — referencia de todas las variables y sus valores por defecto

Variables obligatorias: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (y `CORS_ORIGINS`
en produccion).

Notas:

* `DB_PORT` puede quedar vacío si usas `DB_INSTANCE`
* no guardar credenciales reales en `.env.example`
* no subir `apps/api/.env` ni los perfiles (`.env.demo`, `.env.preparacion`) al repositorio
* los reintentos de conexión a SQL Server deben ser finitos; no se permite reconexión infinita al arrancar
* CORS debe configurarse con orígenes explícitos del frontend; no usar `*` si `CORS_CREDENTIALS=true`
* en desarrollo, el frontend Mantis corre en `http://localhost:3001/free` y el backend en `http://localhost:3000`
* Postman no falla por CORS porque no ejecuta la política del navegador

## Lecturas funcionales actuales

Endpoints disponibles en esta fase:

* `GET /v1/departamentos`
* `GET /v1/servicios`
* `GET /v1/personal`
* `GET /v1/roles`
* `GET /v1/usuarios`
* `POST /v1/sesion/dev-login`
* `GET /v1/sesion/actual`
* `GET /v1/tipos-dia`
* `GET /v1/tipos-turno`
* `GET /v1/turnos`
* `GET /v1/calendarios`
* `GET /v1/planificaciones`
* `GET /v1/planificaciones/:id`
* `GET /v1/planificaciones/:id/asignaciones-disponibles`
* `GET /v1/plantillas-planificacion`
* `GET /v1/planificaciones/:id/rol-turnos`
* `GET /v1/planificaciones/:id/resumen-personal`
* `GET /v1/planificaciones/:id/resumen-calendario`
* `GET /v1/planificaciones/:id/matriz-mensual`
* `GET /v1/planificaciones/:id/validaciones-operativas`
* `POST /v1/planificaciones`
* `POST /v1/planificaciones/:id/plantillas`
* `POST /v1/planificaciones/:id/carga-asistida/desde-plantilla`
* `POST /v1/planificaciones/:id/rol-turnos`
* `PATCH /v1/planificaciones/:id/rol-turnos/:idRolTurno`
* `DELETE /v1/planificaciones/:id/rol-turnos/:idRolTurno`
* `POST /v1/planificaciones/:id/publicar`
* `POST /v1/planificaciones/:id/cerrar`

Notas:

* `calendarios` soporta filtros `anio` y `mes`
* `planificaciones` soporta filtros `id_servicio`, `anio`, `mes` y `estado`
* `asignaciones-disponibles` expone las asignaciones activas del servicio para la UI de edicion del rol
* `rol-turnos` soporta filtros `id_asignacion_personal` e `id_calendario`
* `resumen-personal` soporta filtro `id_asignacion_personal`
* `resumen-calendario` soporta filtro `id_calendario`
* `matriz-mensual` devuelve la estructura visual base del cuadrante mensual
* `plantillas-planificacion` permite descubrir plantillas activas por servicio
* `POST /v1/sesion/dev-login` resuelve un usuario real por `username` y devuelve su contexto operativo
* `GET /v1/sesion/actual` devuelve el actor actual a partir de la cabecera `X-User-Id`
* `POST /v1/planificaciones/:id/plantillas` guarda una planificacion como plantilla reutilizable
* `POST /v1/planificaciones/:id/carga-asistida/desde-plantilla` clona registros masivamente desde la planificacion base de una plantilla
* `GET /v1/planificaciones/:id/validaciones-operativas` resume cobertura y horas por persona antes de publicar
* `POST /v1/planificaciones` crea solo borradores y calcula la siguiente version del periodo
* `rol-turnos` solo permite escritura mientras la planificacion siga en `BORRADOR`
* `POST /v1/planificaciones/:id/publicar` exige al menos un registro de `rol_turno` y que no existan bloqueos operativos
* `POST /v1/planificaciones/:id/cerrar` solo permite transicion desde `PUBLICADO`
* toda coleccion responde con `{ data, meta: { total } }`
* los endpoints protegidos de `planificacion` requieren `X-User-Id` en desarrollo
* el gobierno actual queda así:
  * `ADMIN_SISTEMA`: alcance total
  * `JEFE_DEPARTAMENTO`: todos los servicios del departamento
  * `JEFE_SERVICIO` y `PLANIFICADOR`: servicios gestionables del actor
