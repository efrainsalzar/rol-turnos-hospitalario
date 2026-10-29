# Guía de instalación

Fecha: 2026-10-25. Documento de entrada para instalar el sistema. Reúne en un solo lugar lo que antes
había que juntar entre `README.md`, `docs/comandos.md` y las guías de esta carpeta; esas guías siguen
siendo el detalle de cada tema y se enlazan desde aquí.

## 1. Qué se instala

| Pieza | Dónde vive | Qué es |
| --- | --- | --- |
| API | `apps/api` | Backend NestJS. Escucha en `PORT` (por defecto `3000`) sobre `HOST` (por defecto `0.0.0.0`). Rutas versionadas `/v1/...`; salud pública en `/health/live`. |
| Web | `apps/web` | Frontend React + Vite. En desarrollo corre en `VITE_DEV_SERVER_PORT` (por defecto `3001`); en producción es un build estático (`apps/web/dist`). |
| Base de datos | SQL Server | Esquema creado por las migraciones de `database/migrations/`. Motores soportados: SQL Server 2022 y SQL Server 2008 R2 (perfil `mssql-2008r2`). PostgreSQL no está soportado. |

## 2. Las tres bases

| Base | Perfil en la PC | Para qué | ¿Se puede resetear? |
| --- | --- | --- | --- |
| `planificacion_turnos` | `produccion` | **Base oficial.** Se ensaya en la PC y su backup se instala en el servidor del hospital. | **No** |
| `planificacion_turnos_preparacion` | `preparacion` | Copia de trabajo con datos reales. Aquí se arma la base la primera vez y aquí se prueba después. | Sí |
| `roles_turnos_demo` | `demo` | Datos ficticios, solo para mostrar y desarrollar. Independiente de las otras dos. | Sí |

Cómo se relacionan:

```text
primera vez:   preparacion  --backup/restore-->  produccion (PC)  --backup/restore-->  servidor del hospital
después:       produccion   --backup/restore-->  preparacion      (copia al día para probar)
```

El nombre de cada base lo fija `DB_NAME` en el archivo de su perfil. Los comandos que borran o siembran
(`reset:db`, `seed:system`, `seed:institution`) solo aceptan las bases de la lista
`RESETTABLE_DATABASES` (`apps/api/scripts/lib/sql-script-runner.ts`): `roles_turnos_demo` y
`planificacion_turnos_preparacion`. **`planificacion_turnos` no debe agregarse nunca a esa lista**: la
protección es por nombre, y agregarla habilitaría `reset:db` sobre la base oficial. Por eso la base
oficial se llena restaurando un backup, no sembrándola.

## 3. Requisitos

* **Windows** con PowerShell: los comandos `env:*` ejecutan scripts `.ps1` (`scripts/`).
* **Node.js 20 o superior** y npm (`engines` en `package.json`; `npm run doctor` lo verifica).
* **SQL Server** iniciado y accesible, con un login SQL propio (usuario y contraseña) con permiso para
  crear bases (`dbcreator`), porque `reset:db` crea la base si no existe.
* **git** para clonar el repositorio.

### Instalar dependencias

El repositorio tiene **dos instalaciones** separadas: la raíz (API y herramientas) y el frontend.

```powershell
git clone <este-repositorio>
cd rol-turnos-hospitalario
npm install
npm --prefix apps/web install
```

### Conexión a SQL Server: por puerto o por instancia

Se usa **una** de las dos formas en el archivo de entorno:

| Forma | Variables | Cuándo |
| --- | --- | --- |
| **Por puerto (recomendada)** | `DB_PORT=<puerto TCP fijo>`, `DB_INSTANCE` vacío | Siempre que se pueda. No depende del servicio SQL Browser y en el firewall basta abrir ese puerto. |
| Por instancia | `DB_INSTANCE=<nombre, ej. SQL2008R2>`, `DB_PORT` vacío | Solo si la instancia usa puerto dinámico. Requiere el servicio **SQL Browser** activo (y el puerto UDP 1434 abierto si es remoto). |

Si se definen ambas, gana el puerto y la instancia se ignora (la API, `doctor`, `reset:db`, backup y
restore aplican la misma regla). `DB_HOST` es `localhost` en la misma PC, o la IP/nombre del servidor.

Para conectar por puerto desde otra máquina, en el servidor SQL:

1. Habilitar **TCP/IP** para la instancia (SQL Server Configuration Manager) y fijar un **puerto TCP
   fijo** en "IPAll" (borrar "TCP Dynamic Ports"). Reiniciar el servicio.
2. Habilitar **autenticación mixta** (SQL Server y Windows) para poder usar un login SQL.
3. Abrir ese puerto en el **firewall** del servidor.

## 4. Configurar los perfiles en la PC (una vez)

```powershell
copy apps\api\.env.preparacion.example apps\api\.env.preparacion
copy apps\api\.env.produccion.example  apps\api\.env.produccion
copy apps\api\.env.demo.example        apps\api\.env.demo
copy apps\web\.env.example             apps\web\.env
```

En cada `apps/api/.env.<perfil>` completar `DB_HOST`, `DB_PORT` (o `DB_INSTANCE`), `DB_USER`,
`DB_PASSWORD` y un `JWT_SECRET` propio (largo y aleatorio, distinto en cada perfil). En
`preparacion` y `produccion`, además, la conexión al sistema de RRHH externo (`RRHH_DB_*`). No cambiar `DB_NAME`: ya trae el nombre
correcto de cada base. Revisar `apps/web/.env` según §8.

Comprobar cada perfil:

```powershell
npm run env:preparacion   # o env:produccion / env:demo
npm run env:status        # muestra perfil y base activos (rojo = produccion)
npm run doctor
```

## 5. Primera instalación: armar la base oficial en la PC

**5.1 Crear y llenar la copia de trabajo**

```powershell
npm run env:preparacion
npm run reset:db                  # crea planificacion_turnos_preparacion: migraciones + catálogos + admin.sistema
npm run doctor                    # debe decir "Sistema listo para correr"
npm run seed:institution -- --list
npm run seed:institution -- --id=<institución>   # organigrama
npm run sync:personal:validate    # lee el RRHH externo y deja el lote en staging; no crea personal
npm run sync:personal:conflicts   # revisar los observados
npm run sync:personal:apply       # crea solo los registros VALIDO
```

**5.2 Dejarla lista para uso real.** Levantar el sistema (`npm run dev`) y:

* entrar como `admin.sistema` / `Admin1234!` y **cambiar la contraseña de inmediato**: la inicial está
  escrita en el repositorio (`database/seeds/dev-007_usuario.sql`);
* crear los usuarios reales (jefaturas, RRHH);
* **no crear planificaciones ni turnos de prueba**: todo lo que haya en esta base pasa a producción.
  Si hace falta probar, hacerlo antes y repetir desde `reset:db`.

**5.3 Pasarla a la base oficial**

```powershell
npm run backup:api                # database/backups/planificacion_turnos_preparacion_AAAAMMDD-HHMMSS.bak
npm run env:produccion
npm run restore:api -- .\database\backups\planificacion_turnos_preparacion_AAAAMMDD-HHMMSS.bak
npm run doctor
```

`restore:api` restaura con el nombre del perfil activo (`planificacion_turnos`), no con el del backup.
Probar la base oficial en la PC con `npm run dev`. Cuando esté conforme:

```powershell
npm run backup:api                # database/backups/planificacion_turnos_AAAAMMDD-HHMMSS.bak
```

Ese archivo es el que se instala en el servidor del hospital (§6).

**5.4 Copia de trabajo al día (cuando se necesite).** Para probar algo sobre datos iguales a los
oficiales sin tocarlos:

```powershell
npm run env:produccion
npm run backup:api
npm run env:preparacion
npm run restore:api -- .\database\backups\planificacion_turnos_AAAAMMDD-HHMMSS.bak
```

## 6. Instalación en el servidor del hospital

### 6.1 Configurar la API

En el servidor **no se usan perfiles** (no ejecutar `npm run env:*`: haría que la API ignore el
`.env`). Copiar `apps/api/.env.production.example` como `apps/api/.env` y completar:

* `DB_HOST`, `DB_PORT` (o `DB_INSTANCE`, §3), `DB_USER`, `DB_PASSWORD`;
* `DB_NAME=planificacion_turnos` (ya viene así);
* `DB_PROFILE=mssql-2008r2` (ya viene así): una base restaurada desde un backup de 2008 R2 conserva
  su nivel de compatibilidad 100. Solo si se sube ese nivel en el servidor, usar `mssql-modern`.
  `npm run doctor` avisa si no coinciden;
* `DB_ENCRYPT` / `DB_TRUST_SERVER_CERTIFICATE` según el certificado del servidor SQL;
* `CORS_ORIGINS`: URL donde se abrirá la web (obligatoria en producción);
* `JWT_SECRET`: **nuevo**, largo y aleatorio, distinto del de la PC;
* `RRHH_DB_*`, si el servidor sincroniza personal desde un sistema de RRHH externo.

Las variables de entorno del sistema siempre tienen prioridad sobre el archivo.

### 6.2 Restaurar la base oficial

Un backup de 2008 R2 se puede restaurar en una versión igual o más nueva de SQL Server, **no** en una
más antigua. Copiar `planificacion_turnos_AAAAMMDD-HHMMSS.bak` a una carpeta local del servidor que
pueda leer la cuenta del servicio de SQL Server, y restaurar:

```powershell
npm run restore:api -- C:\ruta\planificacion_turnos_AAAAMMDD-HHMMSS.bak
npm run doctor
```

(También puede restaurarse desde SSMS con el nombre `planificacion_turnos`.)

### 6.3 Compilar y ejecutar

```powershell
npm run build:api      # genera dist/apps/api
npm run build:web      # genera apps/web/dist (antes, apps/web/.env con valores de producción, §8)
npm run start:prod     # node dist/apps/api/src/main
```

`start:prod` resuelve la raíz del proyecto y el `.env` desde la ubicación del archivo compilado, así que
puede lanzarse con otro directorio de trabajo (por ejemplo, como servicio de Windows). El repositorio
no fija qué herramienta registra el servicio; es una decisión de la institución.

Comprobar: `GET http://<servidor>:3000/health/live` (público). `/health/ready` muestra el estado de la
conexión a la base, pero exige una sesión con permiso de detalle técnico; para validar la base sin
sesión, usar `npm run doctor`.

### 6.4 Publicar la web y el proxy

API y web se despliegan separados y un proxy inverso los une bajo un solo dominio:

* `/api/` → API (el proxy quita el prefijo `/api`; la API recibe `/v1/...`)
* `/` → contenido estático de `apps/web/dist`

Ejemplo de referencia con nginx: [`deploy/nginx/roles-turnos-app.conf.example`](../../deploy/nginx/roles-turnos-app.conf.example).
Ese ejemplo supone que la web la sirve un servidor estático interno en el puerto `8080`; si nginx sirve
`apps/web/dist` directamente, reemplazar ese `proxy_pass` por `root` + `try_files $uri /index.html`
(la web es una SPA y sus rutas las resuelve el navegador).

## 7. Demo (opcional)

```powershell
npm run env:demo
npm run reset:db        # crea roles_turnos_demo: migraciones + catálogos + admin.sistema
npm run seed:demo       # organización, personal y usuarios demo ficticios
npm run doctor
npm run dev
```

Usuarios demo (`admin.demo`, `rrhh.demo`, `jefe.departamento.demo`, `jefe.servicio.demo`, contraseña
`Demo1234!`): `database/seeds/README.md`, sección "Entorno `demo`". Máquina aparte solo para la demo:
[guia-nueva-maquina-demo.md](./guia-nueva-maquina-demo.md).

## 8. Variables del frontend (`apps/web/.env`)

| Variable | Desarrollo local | Producción detrás del proxy |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | `/api` |
| `VITE_APP_BASE_NAME` | `/` | `/` (o la subruta donde se publique) |
| `VITE_DEV_SERVER_PORT` | `3001` | no aplica |

`apps/web/.env.example` trae `VITE_APP_BASE_NAME=/`: cambiarlo solo si la web se publica en un
subdirectorio (por ejemplo `/turnos`). Vite fija estos valores dentro del
build: cambiarlos exige volver a correr `npm run build:web`.

Para probar desde otros equipos de la misma red (laptop, celular) sin servidor:
`npm run env:access:intranet-local -- <IPv4 de esta PC>` (vuelve a la configuración local con
`npm run env:access:local`).

## 9. Después de cada actualización (`git pull`)

```powershell
npm install
npm --prefix apps/web install
npm run backup:api       # antes de migrar una base con datos reales
npm run migrate:api      # aplica solo las migraciones nuevas
npm run doctor
```

Repetir `migrate:api` en cada perfil que se use (`produccion`, `preparacion`, `demo`). En el servidor,
además, `npm run build:api`, `npm run build:web` y reiniciar la API.

## 10. Si algo falla

`npm run doctor` revisa Node/npm, dependencias, archivo de entorno, conexión, perfil SQL contra el
nivel de compatibilidad de la base, migraciones pendientes, catálogos, puertos y coherencia entre
`VITE_API_BASE_URL` y `PORT`. No se detiene en el primer error y dice qué comando corregir en cada caso.

| Síntoma | Causa probable |
| --- | --- |
| `Failed to connect to localhost:<puerto>` | El servicio de SQL Server está detenido, o el puerto/instancia no coincide. |
| `Esta operacion solo debe ejecutarse sobre roles_turnos_demo o planificacion_turnos_preparacion` | Se intentó `reset:db`/`seed:*` con el perfil `produccion` activo. Es la protección funcionando: cambiar de perfil. |
| `El perfil de entorno "X" esta activo pero no existe apps/api/.env.X` | Falta copiar la plantilla del perfil (§4). |

Referencia de todos los comandos: [`docs/comandos.md`](../comandos.md).
