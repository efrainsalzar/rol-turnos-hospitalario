# Guía de perfiles de entorno

Fecha: 2026-10-24, actualizada 2026-10-25 (perfil `sql2008r2` reemplazado por
`preparacion` y `produccion`, `decisiones-tecnicas.md` §166). Reemplaza a las
guías de los entornos `dev`, `lab` y `stress`, retirados el 2026-10-24 (§161).

## 1. Perfiles disponibles

| Perfil | Base | Datos | Se puede resetear |
| --- | --- | --- | --- |
| `demo` | `roles_turnos_demo` | Ficticios (`npm run seed:demo`) | Sí |
| `preparacion` | `planificacion_turnos_preparacion` | Reales (RRHH externo); copia de trabajo | Sí |
| `produccion` | `planificacion_turnos` | Reales; ensayo local de la base oficial | **No** |

Relación entre las tres:

* **`produccion`** es la base oficial, ensayada primero en esta PC. Su backup es
  lo que se instala en el servidor del hospital. No se resetea ni se siembra: se
  llena restaurando un backup de `preparacion` la primera vez.
* **`preparacion`** es la copia de trabajo con datos reales: aquí se arma la
  base la primera vez y aquí se prueba después, restaurando un backup de
  `produccion` cuando se quiera una copia al día.
* **`demo`** es independiente, con datos ficticios, solo para mostrar y
  desarrollar.

La protección es por nombre de base (`RESETTABLE_DATABASES` en
`apps/api/scripts/lib/sql-script-runner.ts`): `planificacion_turnos` no debe
agregarse nunca a esa lista.

No hay un perfil `dev` aparte. Para desarrollar se usa `demo`: como sus datos
son ficticios y el seed es repetible, se puede resetear y volver a sembrar en
cualquier momento sin perder nada.

Un servidor real de una institución **no usa perfiles**: lleva un único
`apps/api/.env` copiado desde `.env.production.example`, o variables de entorno
del sistema, que siempre tienen prioridad.

## 2. Archivos

```text
apps/api/.env.example             referencia de TODAS las variables (en git)
apps/api/.env.demo.example        plantilla del perfil demo, sin secretos (en git)
apps/api/.env.preparacion.example plantilla del perfil preparacion, sin secretos (en git)
apps/api/.env.produccion.example  plantilla del perfil produccion, sin secretos (en git)
apps/api/.env.production.example  plantilla para un servidor real (en git)

apps/api/.env.demo                perfil demo con credenciales (local, fuera de git)
apps/api/.env.preparacion         perfil preparacion con credenciales (local, fuera de git)
apps/api/.env.produccion          perfil produccion con credenciales (local, fuera de git)
apps/api/.env.active              perfil activo; lo escribe npm run env:<perfil> (local)
```

Cada perfil contiene solo lo que lo distingue: conexión, credenciales,
`DB_PROFILE` y, en el perfil real, la conexión al RRHH externo. El resto (timeouts, pool, puerto,
`NODE_ENV`) toma el valor por defecto del código, documentado en `.env.example`.

## 3. Primer uso en una máquina

```powershell
copy apps\api\.env.demo.example apps\api\.env.demo
copy apps\api\.env.preparacion.example apps\api\.env.preparacion
```

Completar en cada copia `DB_USER`, `DB_PASSWORD` y un `JWT_SECRET` propio (largo
y aleatorio). Si SQL Server está en otra PC: `DB_HOST=<IP>`, `DB_PORT=<puerto TCP
fijo>` y `DB_INSTANCE` vacío (con puerto, la instancia se ignora).

## 4. Cambiar de perfil

```powershell
npm run env:demo         # o: npm run env:preparacion
npm run env:status       # muestra el perfil y la base activos
npm run doctor           # valida configuracion, conexion y coherencia del perfil SQL
```

`env:<perfil>` ya no copia el perfil sobre `apps/api/.env`: solo escribe
`apps/api/.env.active`, y la API, los scripts y `doctor` cargan
`apps/api/.env.<perfil>` directamente
(`apps/api/src/infrastructure/config/load-env.ts`). Por eso un cambio hecho en
`.env.preparacion` se ve de inmediato y no se pierde al cambiar de perfil.

Para un comando puntual con otro perfil, sin cambiar el activo:

```powershell
$env:API_ENV_PROFILE = 'demo'; npm run doctor; Remove-Item Env:API_ENV_PROFILE
```

`env:access:local` y `env:access:intranet-local` editan el archivo del perfil
activo (script `scripts/set-access-profile.ps1`).

## 5. Demo desde cero

```powershell
npm run env:demo
npm run migrate:api
npm run seed:demo
npm run doctor
```

Para volver a empezar: `npm run reset:db` (drop + create + migraciones) y luego
`npm run seed:demo`. Detalle de una máquina nueva:
`guia-nueva-maquina-demo.md`.

## 6. Datos reales (`preparacion` y `produccion`)

- Nunca ejecutar `seed:demo` sobre estas bases (el script lo rechaza).
- `npm run reset:db` está permitido sobre `planificacion_turnos_preparacion`;
  **borra todo**, incluido el personal sincronizado. Hacer `npm run backup:api` antes.
- Sobre `planificacion_turnos` (`produccion`) `reset:db`, `seed:system` y
  `seed:institution` se niegan. Funcionan `migrate:api`, la sincronización de
  personal, `backup:api` y `restore:api`.
- Paso a paso de la primera instalación: `guia-instalacion.md` §5.
- La sincronización de personal: módulo `integracion` y `database/integracion/rrhh-externo/`.
- Configuración del servidor para conectarse desde otra PC (TCP/IP, puerto fijo,
  firewall, autenticación mixta): `guia-instalacion.md` §3.

## 7. Backup y restore

Ambos comandos actúan sobre la base del perfil activo.

```powershell
npm run env:status
npm run backup:api
npm run restore:api -- .\database\backups\NOMBRE_ARCHIVO.bak
```

- El backup queda en `database/backups/<base>_YYYYMMDD-HHMMSS.bak` (fuera de git:
  puede contener datos reales).
- El restore conecta a `master`, detecta los archivos lógicos del backup, fuerza
  `SINGLE_USER` si la base existe, restaura con `REPLACE` y vuelve a
  `MULTI_USER`.
- **El restore reemplaza la base destino completa.** Confirmar con
  `npm run env:status` antes de ejecutarlo.
- La ruta del `.bak` debe ser legible por la cuenta del servicio de SQL Server;
  si no, moverlo a una carpeta local del servidor.
- Backup/restore transporta bases ya preparadas; no reemplaza a las migraciones,
  que siguen siendo la fuente de verdad del esquema.
