# Seeds y carga de datos

Semillas idempotentes y la arquitectura modular para cargar datos en el sistema. **Todos los datos de
este repositorio son ficticios.**

## Carga de datos en 3 niveles

### Nivel 0: catálogos del sistema y administrador inicial (`npm run seed:system`)

- **Objetivo:** una base limpia pero operativa, el punto de partida de una instalación nueva.
- **Contenido:** catálogos base (`rol_seguridad`, `rol_funcional`, `extension_documento_identidad`,
  `incidencia_personal`, `tipo_feriado`, `tipo_contrato`, `carga_horaria`, departamento placeholder
  `PENDIENTE-ASIGNACION`) y el usuario administrador inicial `admin.sistema` / `Admin1234!`.
  **Esa contraseña es pública: hay que cambiarla en cualquier instalación real.**
- **Ejecución:** corre automáticamente tras `npm run reset:db`, o se lanza a mano con
  `npm run seed:system`.

### Nivel 1: entorno demo (`npm run seed:demo`)

Organigrama ficticio ligero, 17 personas ficticias con su asignación, un usuario por rol, turnos y
una planificación aprobada con la matriz del mes en curso ya completada. Detalle más abajo.

### Nivel 2: carga por institución (`npm run seed:institution`)

- **Objetivo:** cargar el organigrama (y, si corresponde, cargos y personal) de una institución
  concreta, sin mezclarlo con las migraciones ni con la demo.
- **Arquitectura de plugins (`apps/api/scripts/institutions/`):**
  - `base-institution-importer.ts`: interfaz `IInstitutionImporter` (`validate()` + `run()`).
  - `hospital-ejemplo/`: institución ficticia de referencia (`ejemplo-001_organizacion.sql`:
    4 departamentos y 12 servicios/unidades, códigos con prefijo `EJ-`).
  - Cada institución nueva agrega su propia subcarpeta con `manifest.json` e `importer.ts`, y se
    registra en `institutions/index.ts`.
- **Comandos:**
  - `npm run seed:institution -- --list`: muestra las instituciones registradas.
  - `npm run seed:institution -- --id=ejemplo`: carga el Hospital de Ejemplo.

Los códigos de cada institución llevan un prefijo propio (`EJ-`): `departamento.codigo`,
`departamento.nombre` y `servicio.codigo` son únicos en toda la tabla, y sin prefijo dos
instituciones cargadas en la misma base chocarían en silencio.

Los datos reales de una institución (seeds `*_real.sql`, datasets, `apps/api/resources/`) están en
`.gitignore` y nunca se versionan.

## Inventario

### `dev-00N_*.sql`

Catálogos y organización mínimos, reutilizados por `seed:demo` y `seed:system`:

- `dev-001_departamentos.sql`: departamentos (`ENF`, `AMB`, `RRHH`)
- `dev-002_servicios.sql`: servicios de `ENF` y `AMB` (requiere `dev-001`)
- `dev-003_nivel_cargo.sql`: niveles de cargo (`LIC`, `AUX`)
- `dev-004_personal.sql`: 14 personas ficticias (requiere `dev-003`)
- `dev-005_tipo_contrato.sql`: fuentes de financiamiento (`TGN`, `MIN`, `IDH`, `FP`, `OTR`)
- `dev-006_carga_horaria.sql`: modalidades de carga horaria (`TC`, `MT`)
- `dev-007_usuario.sql`: usuario `admin.sistema` / `ADMIN_SISTEMA`

### Otros

- `ejemplo-001_organizacion.sql`: organigrama del Hospital de Ejemplo (Nivel 2).
- `000_reset_total.sql`: borra el contenido de todas las tablas transaccionales y reinicia los
  identities, conservando `schema_migration`. No siembra nada.

## Entorno demo

`roles_turnos_demo` (perfil `demo`) tiene **datos 100% ficticios**. Sirve para presentar el sistema y
también como entorno de desarrollo, porque se puede resetear y volver a sembrar.

```bash
npm run env:demo                                                       # 1. apunta la API a roles_turnos_demo
# crear la base una sola vez, con las credenciales del perfil:
sqlcmd -S <servidor> -U <usuario> -P <contrasena> -C -i .\database\scripts\create-database-demo.sql
npm run migrate:api                                                    # 2. esquema + catálogos genéricos
npm run seed:demo                                                      # 3. organización, personal y planificación ficticios
```

`apps/api/scripts/seed-datos-demo-ficticio.ts` es idempotente y, en orden:

1. Reutiliza `dev-001`/`dev-002`/`dev-003`/`dev-005`/`dev-006`.
2. Siembra 17 personas ficticias (nombres comunes y documento de identidad con una secuencia
   obviamente sintética) con su asignación principal.
3. Siembra un usuario de demostración por rol (tabla de abajo).
4. Siembra 2 turnos (`DEMO-MAN`/`DEMO-TAR`) para el servicio `ENF-S1`.
5. Siembra el calendario del mes en curso y una planificación `APROBADA` de `ENF-S1` con la matriz
   completa, para que no aparezca vacía al abrir la demo.

### Usuarios de demostración

| Usuario                  | Contraseña  | Rol de seguridad    | Qué muestra                                                     |
| ------------------------ | ----------- | ------------------- | --------------------------------------------------------------- |
| `admin.demo`             | `Demo1234!` | `ADMIN_SISTEMA`     | Vista global, todos los departamentos y servicios               |
| `rrhh.demo`              | `Demo1234!` | `RRHH`              | Gestión de personal y asignaciones, sin gestionar organización  |
| `jefe.departamento.demo` | `Demo1234!` | `JEFE_DEPARTAMENTO` | Alcance del departamento `ENF` completo                         |
| `jefe.servicio.demo`     | `Demo1234!` | `JEFE_SERVICIO`     | Alcance de `ENF-S1` únicamente, con la planificación ya pintada |

Volver a correr `npm run seed:demo` es seguro: no duplica personal, usuarios, turnos ni celdas ya
creadas.

## Qué endpoints dependen de qué seed

- `dev-001` a `dev-006` dejan los catálogos y la organización mínimos para que respondan con datos:
  `GET /v1/departamentos`, `GET /v1/servicios`, `GET /v1/personal`.
- `dev-007` deja el usuario `admin.sistema` para poder iniciar sesión.
- Turnos, planificaciones, asignaciones y configuración operativa vienen de `seed:demo` o se crean
  usando la aplicación.

## Reglas

- no reemplazan migraciones versionadas;
- deben ser compatibles con SQL Server 2008 R2 y con SQL Server moderno;
- deben ser idempotentes;
- no deben introducir lógica de negocio en la base.
