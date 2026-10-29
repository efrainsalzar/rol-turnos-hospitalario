# Pruebas web de Operación

## Objetivo

Validar el módulo `Operación` entre backend NestJS y el frontend operativo actual sin tocar migraciones.

## Comandos para levantar todo

Desde la raíz:

```bash
npm run dev
```

## Comandos separados

Backend:

```bash
npm run dev:api
```

Frontend:

```bash
npm run dev:web
```

## URLs backend para probar

```text
http://localhost:3000/health/ready
http://localhost:3000/v1/tipos-dia?alcance=PERSONAL
http://localhost:3000/v1/tipos-feriado
http://localhost:3000/v1/turnos
```

## URLs frontend para probar

```text
http://localhost:3001/free/operacion/incidencias-personales
http://localhost:3001/free/operacion/tipos-feriado
http://localhost:3001/free/operacion/turnos
```

## Qué se debe ver

Nota:

* Postman puede responder bien aunque el navegador falle, porque Postman no aplica la política CORS del navegador.
* para esta integración, la API debe permitir `http://localhost:3001` y `http://127.0.0.1:3001`.

### `GET /health/ready`

Debe responder `200` con:

* `status: "ok"`
* `database`
* `details.appliedMigrations`
* `details.baselineTableCount`

### `GET /v1/tipos-dia?alcance=PERSONAL`

Debe responder `200` con:

* `data` como arreglo
* `meta.total`
* filas con:
  * `codigo`
  * `nombre`
  * `alcance = PERSONAL`
  * `esLaborable`
  * `generaHorasTrabajadas`
  * `activo`

### `GET /v1/tipos-feriado`

Debe responder `200` con:

* `data` como arreglo
* `meta.total`
* filas con:
  * `codigo`
  * `nombre`
  * `activo`

### `GET /v1/turnos`

Debe responder `200` con:

* `data` como arreglo
* `meta.total`
* filas con:
  * `codigo`
  * `nombre`
  * `nombreServicio`
  * `nombreTipoTurno`
  * `horaInicio`
  * `horaFin`
  * `duracionHoras`
  * `cruzaMedianoche`
  * `activo`

### Pantalla `Incidencias personales`

Debe mostrar:

* título `Operacion / Incidencias personales`
* card con tabla
* estado de carga mientras la API responde
* error visible si la API falla
* mensaje vacío si `data` llega vacía

### Pantalla `Catalogo de feriados`

Debe mostrar:

* título `Operacion / Catalogo de feriados`
* tabla con catálogo real de `F`, `FN`, `FR`, `FI`
* estados `loading`, `error`, `empty`, `success`

### Pantalla `Turnos`

Debe mostrar:

* título `Operacion / Turnos`
* tabla con turnos por servicio
* horario `horaInicio - horaFin`
* chips de estado

## Cómo detectar fallas

### Falla de backend

Síntomas:

* `http://localhost:3000/health/ready` no responde
* `503`, `500` o rechazo de conexión

Acción:

* verificar `npm run dev:api`
* revisar conexión a SQL Server

### Falla de frontend

Síntomas:

* `http://localhost:3001/free/...` no abre
* Vite no arranca

Acción:

* verificar `npm run dev:web`
* si en este entorno aparece `EPERM`, volver a intentar con permisos normales o elevados según el caso

### Falla de CORS o consumo web

Síntomas:

* la página carga pero muestra error de red
* el navegador reporta bloqueo de origen cruzado

Acción:

* verificar que la API esté levantada en `http://localhost:3000`
* revisar `VITE_API_BASE_URL`
* revisar `CORS_ORIGINS` en `apps/api/.env`
* confirmar que el navegador usa origen `http://localhost:3001`

### Mensajes externos de la plantilla

Síntomas:

* errores o warnings asociados a `cdn.jsdelivr.net`
* errores o warnings asociados a `fomo.codedthemes.com`

Acción:

* tratarlos como recursos externos de la plantilla Mantis
* no confundirlos con el CORS de la API hospitalaria

### Endpoint vacío

Síntomas:

* `200` con `data: []`
* la UI muestra alerta informativa

Acción:

* ejecutar seeds de operación

## Seeds si no hay datos

Ejecutar, con el perfil `demo` activo:

```bash
npm run env:demo
npm run seed:demo
```

## Validaciones útiles extra

Filtros backend ya soportados:

```text
GET /v1/turnos?id_servicio=2
GET /v1/turnos?activo=true
GET /v1/turnos?id_servicio=2&activo=true
```

Parámetro inválido esperado:

```text
GET /v1/turnos?id_servicio=abc
```

Debe responder `400`.
