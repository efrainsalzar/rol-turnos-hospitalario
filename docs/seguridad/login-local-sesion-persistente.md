# Login Local Con Sesion Persistente

## Estado actual

El sistema ya no usa el flujo temporal de sesion por selector de usuarios sembrados.

Ahora el login local funciona con:

- `username`
- `password`
- sesion persistida en `dbo.sesion_usuario`
- una sola sesion activa por usuario

## Flujo actual

1. `POST /v1/auth/login`
2. backend valida password con `bcrypt`
3. backend revoca sesiones activas previas del mismo usuario
4. backend crea una nueva fila en `dbo.sesion_usuario`
5. backend devuelve:
   - `tokenSesion`
   - `sesion`
6. frontend guarda:
   - token de sesion
   - snapshot de sesion
7. cada request autenticado usa:
   - `Authorization: Bearer <tokenSesion>`

## Persistencia

La sesion se mantiene al refrescar la pagina porque:

- el token queda guardado localmente
- al iniciar la web, el frontend consulta `GET /v1/sesion/actual`
- backend valida la sesion real en base de datos
- si el token ya no es valido, la sesion local se limpia automaticamente

## Duracion actual

Cada login local crea una sesion con vencimiento fijo de:

- `12 horas`

La sesion termina antes si:

- el usuario cierra sesion manualmente
- el mismo usuario inicia sesion otra vez y reemplaza la anterior
- un administrador la revoca directamente en base de datos
- un administrador restablece su password desde `Seguridad > Usuarios`

## Cierre de sesion

`POST /v1/sesion/logout`:

- revoca la sesion activa en base de datos
- limpia la sesion local del navegador

## Reset de password por admin

Desde `Seguridad > Usuarios`, un actor con `puedeGestionarUsuarios` puede:

- editar un usuario
- o usar la accion explicita `Resetear password`

Cuando se reemplaza la password:

- backend vuelve a hashear la nueva clave
- backend revoca las sesiones activas del usuario afectado
- el usuario debe volver a iniciar sesion con la nueva password

## Regla de una sola sesion

Cuando el mismo usuario vuelve a iniciar sesion:

- las sesiones activas anteriores se revocan
- solo la ultima sesion queda valida

## Limpieza aplicada

Quedaron fuera del flujo activo:

- selector de usuarios sembrados en login
- password demo prefijado
- `X-User-Id` como mecanismo de autenticacion
- ruta web `/sistema/sesion`
- endpoints demo:
  - `GET /v1/sesion/opciones-login`
  - `POST /v1/sesion/dev-login`

## Nota operativa

Este login sigue siendo local y orientado a intranet controlada.

No reemplaza todavia un proveedor institucional externo, pero ya ofrece un minimo coherente de:

- autenticacion por password
- persistencia real de sesion
- revocacion
- logout
- control de sesion unica por usuario
