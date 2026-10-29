# Levantar el entorno `demo` en una maquina nueva

Guia para dejar el sistema andando con datos ficticios en una maquina que no es la de desarrollo
habitual (ej. una laptop para llevar a una presentacion). No requiere el dataset real ni ningun
archivo gitignorado especial — el demo es 100% reproducible desde el repositorio.

## Requisitos previos

* Node.js y npm instalados.
* SQL Server Express local (por defecto `localhost\SQLEXPRESS`) con un login SQL propio de esa
  maquina.

## Pasos

```bash
git clone <este-repositorio>
cd rol-turnos-hospitalario
npm install
npm --prefix apps/web install   # el frontend tiene su propia instalacion

copy apps\api\.env.demo.example apps\api\.env.demo   # completar DB_USER, DB_PASSWORD y JWT_SECRET
npm run env:demo
```

Antes de seguir, confirma que la máquina tiene todo lo necesario:

```bash
npm run doctor
```

Va a fallar en "Conexión a la base configurada" hasta que crees la base en el siguiente paso — eso es
esperado en una máquina nueva. Si falla en Node/npm, dependencias o en el perfil (`apps/api/.env.demo`), corrige eso primero.

Crear la base (una sola vez; falla si ya existe, no hace falta repetir en corridas siguientes):

```powershell
sqlcmd -S localhost\SQLEXPRESS -U <usuario> -P <contrasena> -C -i .\database\scripts\create-database-demo.sql
```

Esquema + catalogos genericos, y despues los datos ficticios:

```bash
npm run migrate:api
npm run seed:demo
```

Confirmar que ya está todo listo y levantar el sistema:

```bash
npm run doctor
npm run dev
```

## Perfiles de login para mostrar

Ver `database/seeds/README.md` (seccion "Entorno `demo`") para la tabla completa de usuarios —
`admin.demo`, `rrhh.demo`, `jefe.departamento.demo`, `jefe.servicio.demo`, todos con password
`Demo1234!`.

## Por que `apps/api/.env.demo` no esta versionado

Hasta el 2026-10-24 se versionaba como excepcion al `.gitignore`, pero sus credenciales eran las
mismas que las de otras bases locales con datos reales y su `JWT_SECRET` quedaba publico. Ahora se
versiona solo la plantilla `.env.demo.example`, sin secretos (`docs/database/decisiones-tecnicas.md`
§161). Perfiles disponibles: `docs/deployment/guia-perfiles-entorno.md`.

## Volver a sincronizar despues de cambios de codigo

Cada vez que la maquina de desarrollo hace cambios de esquema/seed y se hace `git pull` en esta
maquina:

```bash
npm install                # por si cambiaron dependencias
npm --prefix apps/web install
npm run env:demo
npm run migrate:api        # aplica migraciones nuevas si las hay (es idempotente)
npm run seed:demo          # idempotente, no duplica nada ya creado
```

No hace falta recrear la base desde cero salvo que el esquema haya cambiado de forma incompatible.
