# API

Documentacion operativa de endpoints expuestos por el backend.

> **Nota de autenticacion (2026-07-06):** este documento tiene multiples referencias a la cabecera `X-User-Id` y al endpoint `POST /v1/sesion/dev-login` como mecanismo de autenticacion. **Ninguno de los dos existe en el codigo actual** — `ActorContextGuard` exige `Authorization: Bearer <token>` obtenido de una sesion real (`POST /v1/auth/login`). No se corrigieron todas las referencias puntuales en este archivo en esta ronda (son varias, dispersas); ver `docs/database/decisiones-tecnicas.md §26` para el detalle completo y no asumir que los ejemplos con `X-User-Id` funcionan tal cual estan escritos.

## Regla

Todo endpoint nuevo o modificado debe quedar documentado con:

* metodo
* ruta
* version
* objetivo
* parametros
* respuesta esperada
* errores relevantes

Contrato transversal:

* [docs/api/contratos-estables.md](/docs/api/contratos-estables.md)

Regla operativa de permisos:

* [docs/arquitectura/matriz-permisos-operativos.md](/docs/arquitectura/matriz-permisos-operativos.md)

## Endpoints actuales

### Health

#### `GET /health/live`

Confirma que NestJS esta corriendo.

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "roles-turnos-api",
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

#### `GET /health/app`

Devuelve metadatos simples del backend.

Respuesta esperada:

```json
{
  "status": "ok",
  "service": "roles-turnos-api",
  "environment": "development",
  "timestamp": "2026-05-04T00:00:00.000Z"
}
```

#### `GET /health/ready`

Valida readiness operativa:

* base correcta
* existencia de `schema_migration`
* baseline minimo aplicado
* conteo minimo de tablas esperado

Respuesta esperada:

```json
{
  "status": "ok",
  "server": "localhost\\SQLEXPRESS",
  "database": "roles_turnos_demo",
  "dialect": "mssql",
  "details": {
    "currentDatabase": "roles_turnos_demo",
    "hasSchemaMigrationTable": true,
    "appliedMigrations": 8,
    "baselineTableCount": 27
  }
}
```

Errores relevantes:

* `503` si la base no esta lista para operar

#### `GET /health/database`

Valida la conexion real a SQL Server y expone detalle tecnico de la sesion.

Respuesta esperada:

```json
{
  "status": "ok",
  "server": "localhost\\SQLEXPRESS",
  "database": "roles_turnos_demo",
  "dialect": "mssql",
  "details": {
    "sqlServerVersion": "Microsoft SQL Server ...",
    "currentDatabase": "roles_turnos_demo",
    "systemUser": "usuario_app",
    "currentUser": "dbo"
  }
}
```

Errores relevantes:

* `503` si no se puede conectar a SQL Server

### Organizacion

#### `GET /v1/departamentos`

Lista departamentos.

Parametros:

* no recibe parametros en esta fase

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "codigo": "DEP-01",
      "nombre": "Emergencias",
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `503` si falla la consulta a SQL Server

#### `GET /v1/departamentos/:id/servicios`

Lista los servicios activos del departamento solicitado.

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 10,
      "idDepartamento": 1,
      "codigoDepartamento": "ENF",
      "nombreDepartamento": "Enfermeria",
      "codigo": "NEURO",
      "nombre": "Neurocirugia",
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `id` no es entero positivo
* `404` si el departamento no existe

### Planificacion

#### `GET /v1/calendarios`

Lista el calendario operativo.
Si el anio o mes solicitado no existe todavia, el backend genera automaticamente los dias faltantes antes de responder.

Parametros opcionales:

* `anio`: entero para filtrar por anio
* `mes`: entero entre `1` y `12` para filtrar por mes

Ejemplos:

```text
GET /v1/calendarios
GET /v1/calendarios?anio=2026&mes=5
```

#### `POST /v1/calendarios/generar`

Genera el calendario faltante para un anio completo o para un mes puntual.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Body:

```json
{
  "anio": 2026,
  "mes": 7
}
```

Si omites `mes`, genera o asegura los 12 meses del anio indicado.

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "fecha": "2026-05-01T00:00:00.000Z",
      "anio": 2026,
      "mes": 5,
      "diaMes": 1,
      "diaSemanaNombre": "Viernes",
      "diaSemanaNum": 5,
      "esFinSemana": false,
      "esFeriado": false,
      "codigoFeriado": null,
      "nombreFeriado": null,
      "semanaMes": 1
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `anio` no es numerico entero
* `400` si `mes` no esta entre `1` y `12`
* `401` si falta `X-User-Id`
* `403` si el actor no puede gestionar calendario

#### `GET /v1/feriados`

Lista feriados institucionales (2026-07-10, ver `docs/database/decisiones-tecnicas.md` seccion 58).
Reemplaza el antiguo `PUT /v1/calendarios/:id/feriado`, que marcaba un dia de calendario suelto como
feriado: ahora un feriado es una entidad propia con rango de fechas (`fechaInicio`/`fechaFin`), lo que
permite representar correctamente que un mismo mes tenga varios feriados (del mismo tipo o de tipos
distintos) y que un feriado abarque varios dias consecutivos.

Parametros opcionales:

* `anio`: entero para filtrar por anio
* `mes`: entero entre `1` y `12` para filtrar por mes

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "idTipoFeriado": 2,
      "codigoTipoFeriado": "FN",
      "nombreTipoFeriado": "Feriado nacional",
      "nombre": "Corpus Christi",
      "anio": 2026,
      "mes": 6,
      "fechaInicio": "2026-06-19",
      "fechaFin": "2026-06-19",
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

#### `POST /v1/feriados`

Crea un feriado. El dia (o rango de dias) queda reflejado inmediatamente en `GET /v1/calendarios`
(`esFeriado`/`codigoFeriado`/`nombreFeriado` por cada fecha cubierta).

Permisos:

* capacidad `gestionarCalendarios`

Body esperado:

```json
{
  "idTipoFeriado": 2,
  "nombre": "Corpus Christi",
  "anio": 2026,
  "mes": 6,
  "fechaInicio": "2026-06-19",
  "fechaFin": "2026-06-19",
  "activo": true
}
```

Reglas:

* `fechaInicio` y `fechaFin` deben caer dentro del mismo `anio`/`mes` indicado (un feriado no puede
  cruzar de un mes a otro)
* no puede superponerse en fechas con otro feriado activo

Errores relevantes:

* `400` si el rango de fechas cruza de mes o `fechaFin < fechaInicio`
* `403` si el actor no tiene la capacidad `gestionarCalendarios`
* `404` si `idTipoFeriado` no existe
* `409` si se superpone con otro feriado activo

#### `PUT /v1/feriados/:id`

Actualiza un feriado existente. Mismo body y reglas que la creacion.

#### `DELETE /v1/feriados/:id`

Desactiva (soft delete) un feriado. Deja de reflejarse en `GET /v1/calendarios`.

Permisos:

* capacidad `gestionarCalendarios`

#### `GET /v1/planificaciones`

Lista planificaciones por servicio y periodo.

Cabecera requerida en esta fase:

```text
X-User-Id: 1
```

Parametros opcionales:

* `id_servicio`: entero positivo para filtrar por servicio
* `anio`: entero para filtrar por anio
* `mes`: entero entre `1` y `12`
* `estado`: `BORRADOR`, `REVISION`, `APROBADA` o `CERRADA`

Ejemplos:

```text
GET /v1/planificaciones
GET /v1/planificaciones?id_servicio=2&anio=2026&mes=5&estado=BORRADOR
```

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "idServicio": 1,
      "idDepartamento": 1,
      "codigoDepartamento": "ENF",
      "nombreDepartamento": "Enfermeria",
      "codigoServicio": "NEURO",
      "nombreServicio": "Neurocirugia",
      "anio": 2026,
      "mes": 5,
      "version": 1,
      "estado": "BORRADOR",
      "cantidadPersonalPlanificable": 5,
      "activo": true,
      "fechaInicio": "2026-05-01T00:00:00.000Z",
      "fechaFin": "2026-05-31T00:00:00.000Z",
      "fechaPublicacion": null,
      "fechaCierre": null,
      "createdAt": "2026-05-05T00:00:00.000Z",
      "updatedAt": "2026-05-05T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `id_servicio` no es entero positivo
* `400` si `anio` no es numerico entero
* `400` si `mes` no esta entre `1` y `12`
* `400` si `estado` no es uno de `BORRADOR`, `REVISION`, `APROBADA`, `CERRADA`
* `401` si falta `X-User-Id`
* `403` si el actor no tiene alcance para el servicio solicitado

#### `POST /v1/planificaciones`

Crea una planificación nueva en estado `BORRADOR`.

Restricciones:

* no permite duplicar `servicio + anio + mes` activos
* la versión inicial se crea como `1`

Restriccion operativa:

* solo permite crear planificaciones para el mes actual o el siguiente
* antes de crear, asegura que el calendario del mes exista

#### `DELETE /v1/planificaciones/:id`

Hace eliminación lógica.

Restricciones:

* no elimina `APROBADA`
* no elimina `CERRADA`

#### `PATCH /v1/planificaciones/:id/estado`

Cambia el estado operativo.

Transiciones válidas:

* `BORRADOR -> REVISION`
* `REVISION -> BORRADOR`
* `REVISION -> APROBADA`
* `APROBADA -> CERRADA`

Permisos mínimos del MVP:

* `JEFE_SERVICIO`: puede mover `BORRADOR -> REVISION` y `REVISION -> BORRADOR`
* `JEFE_DEPARTAMENTO`: puede mover `REVISION -> BORRADOR`, `REVISION -> APROBADA` y `APROBADA -> CERRADA`
* `ADMIN_SISTEMA`: puede operar cualquier transición permitida por negocio

#### `POST /v1/planificaciones/:id/duplicar`

Restriccion operativa:

* solo permite duplicar hacia el mes actual o el siguiente
* antes de duplicar, asegura que el calendario del mes exista

Duplica una planificación hacia otro `anio/mes` y deja la nueva en `BORRADOR`.

Opciones:

* copiar estructura base
* copiar `rol_turno` de origen si se solicita

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación

#### `GET /v1/planificaciones/:id`

Obtiene el detalle basico de una planificacion.

Cabecera requerida:

```text
X-User-Id: 1
```

Respuesta esperada:

```json
{
  "id": 1,
  "idServicio": 2,
  "codigoServicio": "SRV-URG",
  "nombreServicio": "Urgencias",
  "anio": 2026,
  "mes": 5,
  "version": 1,
  "estado": "BORRADOR",
  "fechaInicio": "2026-05-01T00:00:00.000Z",
  "fechaFin": "2026-05-31T00:00:00.000Z",
  "fechaPublicacion": null,
  "fechaCierre": null,
  "createdAt": "2026-05-05T00:00:00.000Z",
  "updatedAt": "2026-05-05T00:00:00.000Z"
}
```

Errores relevantes:

* `404` si la planificacion no existe

#### `GET /v1/planificaciones/:id/asignaciones-disponibles`

Lista las asignaciones activas disponibles para editar `rol_turno` dentro del servicio de la planificacion.

Respuesta esperada:

```json
{
  "data": [
    {
      "idAsignacionPersonal": 5,
      "idPersonal": 2,
      "codigoPersonal": "PER-001",
      "nombreCompleto": "Ana Maria Rojas Lopez",
      "esPrincipal": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `404` si la planificacion no existe

#### `GET /v1/planificaciones/:id/rol-turnos`

Lista los registros de `rol_turno` asociados a una planificacion.

Parametros opcionales:

* `id_asignacion_personal`: entero positivo
* `id_calendario`: entero positivo

Ejemplos:

```text
GET /v1/planificaciones/1/rol-turnos
GET /v1/planificaciones/1/rol-turnos?id_asignacion_personal=5
GET /v1/planificaciones/1/rol-turnos?id_calendario=10
```

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "idPlanificacion": 1,
      "idAsignacionPersonal": 5,
      "idCalendario": 10,
      "fecha": "2026-05-01T00:00:00.000Z",
      "diaMes": 1,
      "diaSemanaNombre": "Viernes",
      "secuenciaDia": 1,
      "idTurno": 2,
      "codigoTurno": "TUR-URG-M",
      "nombreTurno": "Urgencias manana",
      "idIncidenciaPersonal": null,
      "codigoIncidenciaPersonal": null,
      "nombreIncidenciaPersonal": null,
      "horasProgramadas": 12,
      "origenRegistro": "MANUAL",
      "idPersonal": 2,
      "codigoPersonal": "PER-001",
      "nombreCompleto": "Ana Maria Rojas Lopez"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `id_asignacion_personal` no es entero positivo
* `400` si `id_calendario` no es entero positivo
* `404` si la planificacion no existe

#### `GET /v1/planificaciones/:id/resumen-personal`

Lista un resumen agregado del rol por persona dentro de la planificacion.

Parametros opcionales:

* `id_asignacion_personal`: entero positivo para filtrar una asignacion concreta

Respuesta esperada:

```json
{
  "data": [
    {
      "idAsignacionPersonal": 5,
      "idPersonal": 2,
      "codigoPersonal": "PER-001",
      "nombreCompleto": "Ana Maria Rojas Lopez",
      "idServicio": 2,
      "codigoServicio": "SRV-URG",
      "nombreServicio": "Urgencias",
      "totalRegistros": 2,
      "totalTurnos": 2,
      "totalTiposDia": 0,
      "totalDiasProgramados": 2,
      "totalHorasProgramadas": 24,
      "primeraFecha": "2026-05-01T00:00:00.000Z",
      "ultimaFecha": "2026-05-02T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `id_asignacion_personal` no es entero positivo
* `404` si la planificacion no existe

#### `GET /v1/planificaciones/:id/resumen-calendario`

Lista un resumen agregado del rol por dia de calendario dentro del periodo de la planificacion.

Parametros opcionales:

* `id_calendario`: entero positivo para filtrar un dia concreto

Respuesta esperada:

```json
{
  "data": [
    {
      "idCalendario": 10,
      "fecha": "2026-05-01T00:00:00.000Z",
      "anio": 2026,
      "mes": 5,
      "diaMes": 1,
      "diaSemanaNombre": "Viernes",
      "esFinSemana": false,
      "esFeriado": false,
      "nombreFeriado": null,
      "totalRegistros": 1,
      "totalTurnos": 1,
      "totalTiposDia": 0,
      "totalPersonasProgramadas": 1,
      "totalHorasProgramadas": 12
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `id_calendario` no es entero positivo
* `404` si la planificacion no existe

#### `GET /v1/planificaciones/:id/matriz-mensual`

Devuelve una vista mensual alineada al Excel operativo del rol.

Criterio de filas:

* solo devuelve asignaciones activas y planificables del servicio de la planificacion
* asignaciones exclusivamente departamentales no aparecen como filas operativas
* una `JEFE_SERVICIO` puede aparecer si tiene asignacion explicita al servicio
* una `JEFE_DEPARTAMENTO` no aparece en la matriz del servicio salvo que exista una asignacion real al servicio y se decida planificarla

La respuesta incluye:

* metadatos de la planificacion
* lista ordenada de dias del periodo
* marca `esFeriado` por dia para resaltar la columna completa en frontend
* filas por persona/asignacion con metadatos administrativos
* dias por fila con `valorVisual` y `registros`
* resumen global del periodo

Respuesta esperada:

```json
{
  "planificacion": {
    "id": 1,
    "idServicio": 1,
    "codigoServicio": "NEURO",
    "nombreServicio": "Neurocirugia",
    "anio": 2026,
    "mes": 5,
    "version": 1,
    "estado": "BORRADOR"
  },
  "dias": [
    {
      "idCalendario": 10,
      "fecha": "2026-05-01T00:00:00.000Z",
      "diaMes": 1,
      "diaSemanaNombre": "Viernes",
      "abreviaturaDiaSemana": "V",
      "esFeriado": false
    }
  ],
  "filas": [
    {
      "numeroFila": 1,
      "idAsignacionPersonal": 5,
      "idPersonal": 2,
      "codigoPersonal": "NEU-002",
      "nroItem": "260512",
      "cargaHorariaCodigo": "TC",
      "cargaHorariaNombre": "Tiempo Completo",
      "horasDiaBase": 6,
      "ci": "5632107",
      "tipoItemCodigo": "MIN",
      "tipoItemNombre": "Ministerio",
      "codigoFuenteItem": "MIN",
      "apellidoPaterno": "Flores",
      "apellidoMaterno": "Condori",
      "nombres": "Carla Beatriz",
      "nombreCompleto": "Carla Beatriz Flores Condori",
      "cargoActual": "Lic. Enfermeria",
      "rolFuncionalCodigo": "JEFE_SERVICIO",
      "rolFuncionalNombre": "Jefa de Servicio",
      "esJefatura": true,
      "servicioCodigo": "NEURO",
      "servicioNombre": "Neurocirugia",
      "dias": [
        {
          "idCalendario": 10,
          "fecha": "2026-05-01T00:00:00.000Z",
          "diaMes": 1,
          "valorVisual": "M/T",
          "registros": [
            {
              "idRolTurno": 1,
              "secuenciaDia": 1,
              "tipo": "TURNO",
              "codigo": "M",
              "nombre": "Manana Neurocirugia",
              "horasProgramadas": 6,
              "horaInicio": "08:00",
              "horaFin": "14:00",
              "cruzaMedianoche": false
            }
          ]
        }
      ],
      "totalHorasMes": 12,
      "horarioResumen": "08-14,14-20",
      "observacionMensual": "Apoyo a capacitacion interna durante la segunda semana."
    }
  ],
  "resumen": {
    "totalPersonas": 5,
    "totalDias": 31,
    "totalRegistros": 20,
    "totalHorasMes": 120
  }
}
```

Errores relevantes:

* `404` si la planificacion no existe
* `401` si falta `X-User-Id`
* `403` si el actor no puede acceder a la planificacion

#### `GET /v1/planificaciones/:id/configuracion-operativa`

Devuelve la configuracion operativa efectiva de la planificacion.

Objetivo:

* construir la toolbar de la matriz sin hardcodear `M/T/N`
* exponer el modo visual por servicio
* resolver codigos operativos permitidos con su equivalencia horaria

Respuesta esperada:

```json
{
  "planificacion": {
    "id": 1,
    "idServicio": 1,
    "codigoServicio": "NEURO",
    "nombreServicio": "Neurocirugia",
    "anio": 2026,
    "mes": 5
  },
  "servicio": {
    "id": 1,
    "codigo": "NEURO",
    "nombre": "Neurocirugia"
  },
  "modoVisual": "ETIQUETAS",
  "agrupaPorFamilia": false,
  "permiteMultiRegistroDia": true,
  "usaEquivalenciaHorariaExportacion": true,
  "codigosPermitidos": [
    {
      "id": 10,
      "origen": "TURNO",
      "idTurno": 1,
      "idIncidenciaPersonal": null,
      "codigo": "M",
      "etiqueta": "Manana",
      "descripcion": "Turno manana",
      "horas": 6,
      "categoria": "TRABAJO",
      "color": "#e6f4ea",
      "esLaborable": true,
      "requiereConfirmacion": false
    }
  ]
}
```

Reglas:

* si el servicio tiene configuracion operativa explicita, la devuelve tal cual
* si no existe configuracion operativa cargada, el backend construye un fallback desde `turno` y `tipo_dia`
* la fuente cuantitativa sigue siendo `horas_programadas` del `rol_turno`

Errores relevantes:

* `404` si la planificacion no existe
* `403` si el actor no puede acceder a la planificacion

#### `POST /v1/planificaciones`

Crea un nuevo borrador de planificacion.

Reglas de esta fase:

* siempre crea en estado `BORRADOR`
* calcula `fechaInicio` y `fechaFin` desde `anio` y `mes`
* asigna la siguiente `version` disponible para el servicio y periodo
* no publica ni cierra la planificacion

Body esperado:

```json
{
  "idServicio": 2,
  "anio": 2026,
  "mes": 6,
  "idUsuarioCreador": 1
}
```

Respuesta esperada:

```json
{
  "id": 2,
  "idServicio": 2,
  "codigoServicio": "SRV-URG",
  "nombreServicio": "Urgencias",
  "anio": 2026,
  "mes": 6,
  "version": 1,
  "estado": "BORRADOR",
  "fechaInicio": "2026-06-01T00:00:00.000Z",
  "fechaFin": "2026-06-30T00:00:00.000Z",
  "fechaPublicacion": null,
  "fechaCierre": null
}
```

Errores relevantes:

* `400` si `mes` no esta entre `1` y `12`
* `404` si el servicio no existe
* `404` si el usuario creador no existe

#### `POST /v1/planificaciones/:id/rol-turnos`

Crea un registro operativo dentro de una planificacion en estado `BORRADOR`.

Reglas de esta fase:

* solo permite escritura si la planificacion esta en `BORRADOR`
* puede enviarse `idCodigoOperativoServicio` como forma preferida
* si no se usa `idCodigoOperativoServicio`, debe enviarse exactamente uno entre `idTurno` e `idIncidenciaPersonal`
* la asignacion debe pertenecer al servicio de la planificacion
* el calendario debe pertenecer al periodo de la planificacion
* si se usa `idCodigoOperativoServicio`, el backend resuelve turno, tipo de dia y horas reales desde la configuracion operativa del servicio

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación

Body esperado:

```json
{
  "idAsignacionPersonal": 5,
  "idCalendario": 10,
  "secuenciaDia": 1,
  "idCodigoOperativoServicio": 10,
  "idUsuarioOperacion": 1
}
```

Respuesta esperada:

```json
{
  "id": 15,
  "idPlanificacion": 1,
  "idAsignacionPersonal": 5,
  "idCalendario": 10,
  "fecha": "2026-05-01T00:00:00.000Z",
  "diaMes": 1,
  "diaSemanaNombre": "Viernes",
  "secuenciaDia": 1,
  "idTurno": 2,
  "codigoTurno": "TUR-URG-M",
  "nombreTurno": "Urgencias manana",
  "idIncidenciaPersonal": null,
  "codigoIncidenciaPersonal": null,
  "nombreIncidenciaPersonal": null,
  "horasProgramadas": 6,
  "origenRegistro": "MANUAL",
  "idPersonal": 2,
  "codigoPersonal": "PER-001",
  "nombreCompleto": "Ana Maria Rojas Lopez"
}
```

Errores relevantes:

* `400` si el body no cumple validaciones
* `404` si la planificacion no existe
* `404` si la asignacion, calendario, turno, tipo de dia o usuario no existen en el contexto esperado
* `409` si la planificacion no esta en `BORRADOR`
* `409` si ya existe la misma combinacion de planificacion, asignacion, calendario y secuencia

#### `PATCH /v1/planificaciones/:id/rol-turnos/:idRolTurno`

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación

Ajusta un registro existente de `rol_turno` dentro de un borrador.

Regla:

* si se usa `idCodigoOperativoServicio`, el backend no confia en horas enviadas por frontend y recalcula desde configuracion

Body esperado:

```json
{
  "idAsignacionPersonal": 5,
  "idCalendario": 11,
  "secuenciaDia": 1,
  "idCodigoOperativoServicio": 25,
  "idUsuarioOperacion": 1
}
```

Respuesta esperada:

```json
{
  "id": 15,
  "idPlanificacion": 1,
  "idAsignacionPersonal": 5,
  "idCalendario": 11,
  "idIncidenciaPersonal": 4,
  "codigoIncidenciaPersonal": "DESCANSO",
  "nombreIncidenciaPersonal": "Descanso",
  "horasProgramadas": 0,
  "origenRegistro": "AJUSTE"
}
```

Errores relevantes:

* `400` si el body no cumple validaciones
* `404` si la planificacion o el `rol_turno` no existen
* `409` si la planificacion no esta en `BORRADOR`
* `409` si la actualizacion genera conflicto de secuencia

#### `DELETE /v1/planificaciones/:id/rol-turnos/:idRolTurno`

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación

Elimina un registro de `rol_turno` de una planificacion en borrador.

Parametros de query:

* `id_usuario_operacion`: entero positivo obligatorio

Respuesta esperada:

* `204 No Content`

Errores relevantes:

* `400` si `id_usuario_operacion` no es entero positivo
* `404` si la planificacion, el `rol_turno` o el usuario no existen
* `409` si la planificacion no esta en `BORRADOR`

#### `POST /v1/planificaciones/:id/publicar`

Publica una planificacion en estado `BORRADOR`.

Body esperado:

```json
{
  "idUsuarioPublicador": 1
}
```

Respuesta esperada:

```json
{
  "id": 1,
  "estado": "PUBLICADO",
  "fechaPublicacion": "2026-05-05T00:00:00.000Z"
}
```

Errores relevantes:

* `404` si la planificacion o el usuario publicador no existen
* `409` si la planificacion no esta en `BORRADOR`
* `409` si la planificacion no tiene registros de `rol_turno`
* `409` si la validacion operativa reporta bloqueos

#### `POST /v1/planificaciones/:id/cerrar`

Cierra una planificacion previamente publicada.

Body esperado:

```json
{
  "idUsuarioCierre": 1
}
```

Respuesta esperada:

```json
{
  "id": 1,
  "estado": "CERRADO",
  "fechaCierre": "2026-05-31T23:00:00.000Z"
}
```

Errores relevantes:

* `404` si la planificacion o el usuario de cierre no existen
* `409` si la planificacion no esta en `PUBLICADO`

#### `PUT /v1/planificaciones/:id/observaciones-mensuales/:idAsignacionPersonal`

Actualiza o elimina la observacion mensual de una asignacion dentro de una planificacion.

Reglas:

* si `descripcion` tiene contenido, crea o actualiza la observacion mensual
* si `descripcion` llega vacia, elimina la observacion mensual existente

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación

Body esperado:

```json
{
  "descripcion": "Apoyo a capacitacion interna durante la segunda semana.",
  "idUsuarioOperacion": 1
}
```

Respuesta esperada:

```json
{
  "id": 1,
  "idPlanificacion": 1,
  "idAsignacionPersonal": 5,
  "descripcion": "Apoyo a capacitacion interna durante la segunda semana.",
  "createdAt": "2026-05-09T00:00:00.000Z",
  "updatedAt": "2026-05-09T00:00:00.000Z"
}
```

Errores relevantes:

* `404` si la planificacion, la asignacion o el usuario no existen
* `409` si la planificacion no esta en `BORRADOR`

#### `GET /v1/planificaciones/:id/export/excel`

Genera un archivo Excel del rol mensual usando la plantilla institucional versionada correspondiente al anio de la planificacion.

Parametros opcionales:

* `modo`: `etiquetas` o `numerico`

Default:

* `modo=numerico`

Comportamiento:

* `modo=etiquetas` mantiene `M/T/N/LIC/VAC/FN`
* `modo=numerico` exporta turnos con `horas_programadas` reales y dias especiales con equivalencias administrativas

Ejemplos:

```text
GET /v1/planificaciones/10/export/excel
GET /v1/planificaciones/10/export/excel?modo=numerico
```

Plantilla actual:

* `2026` => formato institucional de referencia
* fallback => plantilla default

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación

Respuesta esperada:

* `200`
* `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
* `Content-Disposition: attachment; filename="planificacion-{id}.xlsx"`

Errores relevantes:

* `404` si la planificacion no existe
* `403` si el actor no tiene alcance para la planificacion
* `400` si `modo` no es `etiquetas` ni `numerico`

Referencia tecnica:

* [docs/exportacion/plantillas-excel-rol-turnos.md](/docs/exportacion/plantillas-excel-rol-turnos.md)
* [docs/exportacion/modos-exportacion-rol-turnos.md](/docs/exportacion/modos-exportacion-rol-turnos.md)

#### `GET /v1/planificaciones/:id/export/pdf`

Endpoint legado de compatibilidad para generar PDF horizontal imprimible a partir de la matriz mensual.

Estado actual:

* el backend todavía lo conserva
* el frontend operativo actual ya no lo expone como salida principal
* la salida institucional activa es `preview + Excel`

Parametros opcionales:

* `modo`: `etiquetas` o `numerico`

Default:

* `modo=numerico`

Comportamiento:

* `modo=numerico` respeta las horas reales del rol mensual para turnos y las equivalencias administrativas para dias especiales

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_SERVICIO` con alcance sobre la planificación
* `JEFE_DEPARTAMENTO` con alcance sobre la planificación

Respuesta esperada:

* `200`
* `Content-Type: application/pdf`
* `Content-Disposition: attachment; filename="planificacion-{id}.pdf"`

Errores relevantes:

* `404` si la planificacion no existe
* `500` si no hay navegador compatible disponible en el host para renderizar el PDF
* `400` si `modo` no es `etiquetas` ni `numerico`

#### `GET /v1/planificaciones/:id/export/preview`

Devuelve HTML imprimible institucional para vista previa de exportacion.

Parametros opcionales:

* `modo`: `etiquetas` o `numerico`

Default:

* `modo=numerico`

Comportamiento:

* el preview HTML usa el mismo mapper institucional y muestra horas reales para turnos en `modo=numerico`

Respuesta esperada:

* `200`
* `Content-Type: text/html; charset=utf-8`

#### `GET /v1/servicios`

Lista servicios.

Parametros opcionales:

* `id_departamento`: entero positivo para filtrar por departamento
* `idDepartamento`: alias compatible en esta fase

Ejemplo:

```text
GET /v1/servicios?id_departamento=1
```

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 10,
      "idDepartamento": 1,
      "codigo": "SRV-01",
      "nombre": "Urgencias",
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `idDepartamento` no es entero positivo
* `503` si falla la consulta a SQL Server

#### `GET /v1/servicios/:id/detalle`

Devuelve el detalle operativo básico de un servicio.

Respuesta esperada:

```json
{
  "id": 1,
  "idDepartamento": 1,
  "codigoDepartamento": "ENF",
  "nombreDepartamento": "Enfermeria",
  "codigo": "NEURO",
  "nombre": "Neurocirugia",
  "activo": true,
  "cantidadPersonalActivo": 5,
  "jefaServicio": {
    "idPersonal": 2,
    "codigoPersonal": "NEU-001",
    "nombreCompleto": "Laura Mendoza Vargas",
    "rolFuncionalCodigo": "JEFE_SERVICIO"
  },
  "turnos": [
    {
      "id": 1,
      "codigo": "M",
      "nombre": "Manana Neurocirugia",
      "horaInicio": "08:00",
      "horaFin": "14:00",
      "duracionHoras": 6
    }
  ]
}
```

Errores relevantes:

* `400` si `id` no es entero positivo
* `404` si el servicio no existe

### Personal

#### `GET /v1/personal`

Lista personal registrado.

Parametros opcionales:

* `id_servicio`: entero positivo para filtrar por servicio vigente principal
* `id_departamento`: entero positivo para filtrar por departamento
* `id_nivel_cargo`: entero positivo para filtrar por nivel de cargo
* `activo`: booleano para filtrar por estado del personal

Ejemplos:

```text
GET /v1/personal
GET /v1/personal?id_servicio=2
GET /v1/personal?id_departamento=1
GET /v1/personal?id_nivel_cargo=3
GET /v1/personal?activo=true
GET /v1/personal?id_servicio=2&activo=true
GET /v1/personal?id_departamento=1&id_nivel_cargo=3&activo=true
```

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "codigoPersonal": "PER-001",
      "nombres": "Ana Maria",
      "apellidoPaterno": "Rojas",
      "apellidoMaterno": "Lopez",
      "documentoIdentidad": "1000001",
      "idNivelCargo": 1,
      "codigoNivelCargo": "ENF-LIC",
      "nombreNivelCargo": "Licenciada en enfermeria",
      "idServicioPrincipal": 2,
      "codigoServicioPrincipal": "SRV-URG",
      "nombreServicioPrincipal": "Urgencias",
      "activo": true,
      "nombreCompleto": "Ana Maria Rojas Lopez"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `400` si `id_servicio` no es entero positivo
* `400` si `id_departamento` no es entero positivo
* `400` si `id_nivel_cargo` no es entero positivo
* `400` si `activo` no es booleano valido
* `503` si falla la consulta a SQL Server

#### `GET /v1/personal/:id/detalle`

Devuelve la ficha de lectura de una persona con sus relaciones operativas vigentes.

Incluye:

* datos personales
* cargo y familia laboral
* servicio y departamento actual
* usuario asociado si existe
* rol funcional actual
* asignaciones vigentes
* asignaciones históricas sembradas

Errores relevantes:

* `400` si `id` no es entero positivo
* `404` si la persona no existe

#### `POST /v1/personal`

Crea una persona operativa nueva.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Body esperado:

```json
{
  "codigoPersonal": "PER-100",
  "documentoIdentidad": "1000100",
  "nombres": "Maria Elena",
  "apellidoPaterno": "Suarez",
  "apellidoMaterno": "Mamani",
  "idNivelCargo": 1
}
```

Errores relevantes:

* `400` si falta o es inválido un campo requerido
* `403` si el actor no puede gestionar personal
* `409` si el documento o código personal ya existe

#### `PUT /v1/personal/:id`

Actualiza una persona existente.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Errores relevantes:

* `400` si `id` no es entero positivo
* `403` si el actor no puede gestionar personal
* `404` si la persona no existe
* `409` si el documento o código personal colisiona

#### `DELETE /v1/personal/:id`

Da de baja lógica a una persona.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Errores relevantes:

* `400` si `id` no es entero positivo
* `403` si el actor no puede gestionar personal
* `404` si la persona no existe
* `409` si la persona todavía tiene asignaciones vigentes

#### `GET /v1/servicios/:id/personal`

Lista el personal activo asignado al servicio indicado.

Incluye:

* persona
* cargo actual
* familia laboral
* rol funcional
* `nroItem`
* tipo item
* carga horaria
* estado

Errores relevantes:

* `400` si `id` no es entero positivo
* `404` si el servicio no existe

#### `GET /v1/departamentos/:id/personal`

Lista personal y asignaciones del departamento.

Errores relevantes:

* `400` si `id` no es entero positivo
* `404` si el departamento no existe

#### `GET /v1/asignaciones`

Lista asignaciones filtrables del personal.

Filtros opcionales:

* `id_departamento`
* `id_servicio`
* `id_personal`
* `activo`
* `rol_funcional`

Errores relevantes:

* `400` si un filtro numérico no es entero positivo
* `400` si `activo` no es booleano válido

#### `POST /v1/asignaciones`

Crea una asignación nueva para una persona.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Soporta:

* asignación principal o secundaria
* cambio de servicio
* promoción a `JEFE_SERVICIO`
* promoción a `JEFE_DEPARTAMENTO`

#### `PUT /v1/asignaciones/:id`

Actualiza una asignación vigente **sin cambiar de unidad** — rol funcional, carga horaria, tipo de
contrato, nro. item u otros datos administrativos. Rechaza con `409` cualquier cambio de
`idServicio`/`idDepartamento`: para eso existe `POST /v1/asignaciones/:id/mover` (ver
`docs/database/decisiones-tecnicas.md` sección 56).

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`
* Jefe de departamento, dentro de su alcance (no puede otorgar/editar `JEFE_DEPARTAMENTO`)

#### `POST /v1/asignaciones/:id/mover`

Único flujo válido para cambiar `idServicio`/`idDepartamento` de una asignación — operativa o de
jefatura, `PRINCIPAL` o `SECUNDARIA`. Cierra la fila actual y crea una fila nueva con `fecha_inicio`
propia, en una sola transacción atómica (nunca reescribe la unidad de una fila existente en el
sitio, para no dejar `fecha_inicio` representando la vigencia vieja).

Permisos: los mismos que `PUT /v1/asignaciones/:id` (no los de `cerrar`) — mover es una
transferencia, no una baja; la persona siempre queda con una fila activa al final.

Body esperado:

```json
{
  "idServicio": 12,
  "idRolFuncional": 4,
  "idTipoContrato": 1,
  "idCargaHoraria": 1,
  "motivo": "Promoción a jefatura de servicio",
  "regularizarPlanificacionesAbiertas": false
}
```

Errores relevantes:

* `400` si la unidad destino es la misma que la actual (no es un movimiento real)
* `409` si la unidad destino ya tiene jefe activo (rol destino de jefatura)
* `409` si existe actividad operativa en una planificación abierta y no se envía
  `regularizarPlanificacionesAbiertas: true`

#### `POST /v1/asignaciones/:id/cerrar`

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Cierra una asignación activa sin borrarla.

#### `GET /v1/familias-laborales`

Lista familias laborales activas para lectura y filtros del frontend.

#### `GET /v1/niveles-cargo`

Lista niveles/cargos con su familia laboral asociada.

#### `GET /v1/cargas-horarias`

Lista el catálogo visible de cargas horarias (`TC`, `MT`).

#### `GET /v1/tipos-contrato`

Lista todos los tipos de contrato / fuentes de financiamiento (activos e inactivos), ordenados por
nombre. Respuesta: `{ data: [{ id, codigo, nombre, descripcion, activo }], meta: { total } }`.

#### `POST /v1/tipos-contrato`

Permiso: `puedeGestionarPersonal`. Crea un tipo de contrato activo.

```json
{ "codigo": "CODIGO", "nombre": "Nombre visible", "descripcion": "Opcional" }
```

* `codigo` (obligatorio, máx. 30) se guarda en mayúsculas y **no se puede cambiar después**: se copia en
  el historial de planificación y en las exportaciones.
* `nombre` (obligatorio, máx. 120); `descripcion` (opcional, máx. 500).
* `409` si ya existe un tipo con ese código (sin distinguir mayúsculas). `400` si faltan campos.
* Respuesta: el tipo creado.

#### `PUT /v1/tipos-contrato/:id`

Permiso: `puedeGestionarPersonal`. Edita `nombre` y `descripcion` (mismo formato que el alta, sin
`codigo`). `404` si el tipo no existe. Respuesta: el tipo actualizado.

#### `DELETE /v1/tipos-contrato/:id` y `POST /v1/tipos-contrato/:id/activar`

Permiso: `puedeGestionarPersonal`. Baja lógica y reactivación (`activo`); nunca se borra el registro.
Un tipo inactivo deja de ofrecerse en el alta de personal y en asignaciones nuevas; las asignaciones
que ya lo usan lo conservan. `404` si el tipo no existe. Respuesta: `{ "ok": true }`.

### Seguridad

#### `POST /v1/auth/login`

Inicia sesion MVP simple usando usuarios locales ya sembrados.

Body esperado:

```json
{
  "username": "jefa.neuro",
  "password": "123456"
}
```

Respuesta esperada:

```json
{
  "id": 1,
  "username": "jefa.neuro",
  "tipoUsuario": "PERSONAL",
  "proveedorAutenticacion": "LOCAL",
  "sujetoAutenticacion": "jefa.neuro",
  "identidadLocalHabilitada": true,
  "activo": true,
  "rolSeguridad": {
    "id": 4,
    "codigo": "JEFE_SERVICIO",
    "nombre": "Jefa de servicio"
  },
  "personal": {
    "id": 1,
    "codigoPersonal": "NEU-001",
    "nombreCompleto": "Laura Mendoza Vargas"
  },
  "alcancePlanificacion": "SERVICIO",
  "puedeGestionarPlanificacion": true,
  "puedeGestionarTodo": false,
  "permisos": {
    "puedeVerOrganizacion": false,
    "puedeVerPersonal": false,
    "puedeGestionarPersonal": false,
    "puedeVerAsignaciones": false,
    "puedeGestionarAsignaciones": false,
    "puedeVerSeguridad": false,
    "puedeGestionarUsuarios": false,
    "puedeVerOperacion": false,
    "puedeVerPlanificacion": true,
    "puedeEditarPlanificacion": true,
    "puedeAprobarPlanificacion": false
  },
  "capacidades": {
    "verCalendarios": false,
    "verTiposDia": false,
    "verTiposTurno": false,
    "verCargasHorarias": false,
    "verTurnos": true,
    "crearPlanificacion": true,
    "editarPlanificacion": true,
    "enviarRevisionPlanificacion": true,
    "volverBorradorPlanificacion": true,
    "aprobarPlanificacion": false,
    "cerrarPlanificacion": false,
    "exportarPlanificacion": true,
    "exportarPlanificacionLote": false,
    "gestionarCodigosOperativos": false,
    "gestionarTurnos": true,
    "gestionarAsignaciones": false,
    "gestionarServicios": false,
    "gestionarUsuarios": false
  }
}
```

Errores relevantes:

* `401` si la contraseña no coincide
* `404` si el usuario no existe o no esta activo

#### `POST /v1/sesion/dev-login`

Activa una sesion local temporal de desarrollo a partir de un `username` real del sistema.

Body esperado:

```json
{
  "username": "ana.rojas"
}
```

Respuesta esperada:

```json
{
  "id": 3,
  "username": "ana.rojas",
  "tipoUsuario": "PERSONAL",
  "proveedorAutenticacion": "LOCAL",
  "sujetoAutenticacion": "ana.rojas",
  "identidadLocalHabilitada": true,
  "activo": true,
  "rolSeguridad": {
    "id": 3,
    "codigo": "JEFE_DEPARTAMENTO",
    "nombre": "Jefe de departamento"
  },
  "personal": {
    "id": 1,
    "codigoPersonal": "PER-001",
    "nombreCompleto": "Ana Maria Rojas Lopez"
  },
  "alcancePlanificacion": "DEPARTAMENTO",
  "puedeGestionarPlanificacion": true,
  "puedeGestionarTodo": false,
  "permisos": {
    "puedeVerOrganizacion": false,
    "puedeVerPersonal": false,
    "puedeGestionarPersonal": false,
    "puedeVerAsignaciones": true,
    "puedeGestionarAsignaciones": true,
    "puedeVerSeguridad": false,
    "puedeGestionarUsuarios": false,
    "puedeVerOperacion": true,
    "puedeVerPlanificacion": true,
    "puedeEditarPlanificacion": true,
    "puedeAprobarPlanificacion": true
  },
  "capacidades": {
    "verCalendarios": true,
    "verTiposDia": false,
    "verTiposTurno": false,
    "verCargasHorarias": false,
    "verTurnos": true,
    "crearPlanificacion": true,
    "editarPlanificacion": true,
    "enviarRevisionPlanificacion": false,
    "volverBorradorPlanificacion": true,
    "aprobarPlanificacion": true,
    "cerrarPlanificacion": true,
    "exportarPlanificacion": true,
    "exportarPlanificacionLote": true,
    "gestionarCodigosOperativos": false,
    "gestionarTurnos": true,
    "gestionarAsignaciones": true,
    "gestionarServicios": false,
    "gestionarUsuarios": false
  }
}
```

Errores relevantes:

* `404` si el usuario no existe o no está activo

#### `GET /v1/sesion/actual`

Devuelve el actor actual resuelto desde la cabecera `X-User-Id`.

Cabecera requerida:

```text
X-User-Id: 3
```

Respuesta esperada:

* el mismo contrato de `POST /v1/sesion/dev-login`
* `permisos` mantiene compatibilidad con vistas heredadas
* `capacidades` expone acciones operativas reutilizables para menus, rutas y botones

Errores relevantes:

* `401` si falta `X-User-Id`
* `401` si `X-User-Id` no es entero positivo
* `404` si el usuario no existe o no está activo

#### `GET /v1/roles`

Lista roles disponibles para seguridad y futura autorizacion.

Parametros:

* no recibe parametros en esta fase

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "codigo": "ADMIN_SISTEMA",
      "nombre": "Administrador del sistema",
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `403` si el actor no es `ADMIN_SISTEMA`
* `503` si falla la consulta a SQL Server

### Operacion

#### `GET /v1/incidencias-personales`

Lista el catálogo de incidencias personales y tipos de día operativos.

Parametros opcionales:

* `alcance`: `GENERAL`, `PERSONAL` o `OTRO`

Regla actual:

* el frontend operativo usa principalmente `alcance=PERSONAL`
* los feriados generales ya se gestionan desde `tipo_feriado` y `feriado` (ver `GET /v1/feriados` arriba)

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "codigo": "DESCANSO",
      "nombre": "Descanso",
      "descripcion": "Dia no laborable planificado.",
      "alcance": "PERSONAL",
      "esLaborable": false,
      "generaHorasTrabajadas": false,
      "computaParaMetaHoras": false,
      "requiereRespaldo": false,
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `503` si falla la consulta a SQL Server

#### `GET /v1/tipos-feriado`

Lista el catálogo institucional de feriados generales.

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "codigo": "FN",
      "nombre": "Feriado nacional",
      "descripcion": "Feriado general de alcance nacional.",
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `503` si falla la consulta a SQL Server

#### `GET /v1/turnos`

Lista turnos (horarios reales) por servicio o por departamento. El campo `id_tipo_turno` y la tabla `tipo_turno` fueron eliminados en la migración `033_remove_tipo_turno.sql` (2026-07-03); ya no existen ni el catálogo conceptual de tipos de turno ni ningún endpoint `/v1/tipos-turno` en este proyecto.

Parametros opcionales:

* `id_departamento`: entero positivo para filtrar por departamento
* `id_servicio`: entero positivo para filtrar por servicio
* `activo`: booleano para filtrar por estado
* `page`, `page_size`: paginación

Fuera de un alcance de sistema (`ADMIN_SISTEMA`, `RRHH`), el backend acota los resultados al alcance del actor y responde `403` si se pide explícitamente un `id_servicio` fuera de ese alcance (`TurnoController.buildScopedQuery`).

Ejemplos:

```text
GET /v1/turnos
GET /v1/turnos?id_servicio=2
GET /v1/turnos?id_departamento=1&activo=true
```

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "idServicio": 2,
      "codigoServicio": "SRV-URG",
      "nombreServicio": "Urgencias",
      "idDepartamento": null,
      "codigoDepartamento": null,
      "nombreDepartamento": null,
      "codigo": "TUR-URG-N",
      "nombre": "Urgencias noche",
      "codigoVisual": "N",
      "etiquetaVisual": "Noche",
      "tipoHorario": "CONTINUO",
      "horaInicio": "20:00",
      "horaFin": "08:00",
      "cruzaMedianoche": true,
      "duracionHoras": 12,
      "tramos": [],
      "vigenciaDesde": "2026-01-01T00:00:00.000Z",
      "vigenciaHasta": null,
      "activo": true
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Notas:

* un turno tiene exactamente uno de `idServicio` o `idDepartamento` (nunca ambos, nunca ninguno) — ver `ck_turno_scope_xor` en la migración `035_add_departamento_scope_to_turno.sql`
* `tipoHorario` es `CONTINUO` (usa `horaInicio`/`horaFin`) o `DISCONTINUO` (usa `tramos`, cada uno con su propio `horaInicio`/`horaFin`)
* `codigoVisual`/`etiquetaVisual` son opcionales, para exportación a Excel

Errores relevantes:

* `400` si `id_servicio`/`id_departamento` no son enteros positivos
* `400` si `activo` no es booleano valido
* `403` si se pide un `id_servicio` fuera del alcance del actor
* `503` si falla la consulta a SQL Server

#### `GET /v1/usuarios`

Lista usuarios operativos y su contrato base de identidad local, sin exponer secretos.

Parametros:

* no recibe parametros en esta fase

Respuesta esperada:

```json
{
  "data": [
    {
      "id": 1,
      "username": "luis.perez",
      "tipoUsuario": "PERSONAL",
      "proveedorAutenticacion": "LOCAL",
      "sujetoAutenticacion": "luis.perez",
      "identidadLocalHabilitada": true,
      "activo": true,
      "rolSeguridad": {
        "id": 4,
        "codigo": "JEFE_SERVICIO",
        "nombre": "Jefe de servicio"
      },
      "personal": {
        "id": 2,
        "codigoPersonal": "PER-002",
        "nombreCompleto": "Luis Fernando Perez Gutierrez"
      }
    }
  ],
  "meta": {
    "total": 1
  }
}
```

Errores relevantes:

* `403` si el actor no es `ADMIN_SISTEMA`
* `503` si falla la consulta a SQL Server

#### `POST /v1/usuarios`

Crea un usuario local nuevo.

Permisos:

* `ADMIN_SISTEMA`

Body esperado:

```json
{
  "username": "nuevo.usuario",
  "password": "123456",
  "idRolSeguridad": 1,
  "idPersonal": 10,
  "tipoUsuario": "PERSONAL"
}
```

Errores relevantes:

* `400` si falta un campo requerido
* `403` si el actor no es `ADMIN_SISTEMA`
* `409` si el `username` ya existe o el personal ya tiene usuario activo

#### `PUT /v1/usuarios/:id`

Actualiza un usuario local existente.

Permisos:

* `ADMIN_SISTEMA`

#### `DELETE /v1/usuarios/:id`

Da de baja lógica a un usuario.

Permisos:

* `ADMIN_SISTEMA`

### Sesión local de pruebas

#### `GET /v1/sesion/opciones-login`

Devuelve el listado de usuarios activos con identidad local habilitada para pruebas rápidas de login o cambio de sesión.

Permisos:

* público en entorno MVP local

Respuesta esperada:

```json
[
  {
    "idUsuario": 1,
    "username": "jefa.neuro",
    "nombreCompleto": "Carla Flores Condori",
    "codigoRol": "JEFE_SERVICIO",
    "nombreRol": "Jefe de servicio"
  }
]
```

### Operación editable

#### `POST /v1/incidencias-personales`

Crea un tipo de día institucional.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

Body esperado:

```json
{
  "codigo": "CAP_EXT",
  "nombre": "Capacitacion externa",
  "descripcion": "Dia administrativo especial",
  "esLaborable": false,
  "generaHorasTrabajadas": false,
  "computaParaMetaHoras": false,
  "requiereRespaldo": true,
  "activo": true
}
```

#### `PUT /v1/incidencias-personales/:id`

Actualiza un tipo de día existente.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

#### `DELETE /v1/incidencias-personales/:id`

Desactiva un tipo de día.

Permisos:

* `ADMIN_SISTEMA`
* `RRHH`

#### `POST /v1/turnos`

Crea un turno concreto por servicio o por departamento, con horario operativo real.

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO` (servicio o departamento dentro de su alcance)
* `JEFE_SERVICIO` (solo servicio, nunca departamento — `OperacionAccessPolicyService.assertPuedeGestionarTurnoDepartamento` exige jefatura departamental)

Con alcance válido sobre el servicio o departamento.

Body esperado (horario continuo):

```json
{
  "idServicio": 1,
  "codigo": "NEU-M-REF",
  "nombre": "Refuerzo mañana",
  "tipoHorario": "CONTINUO",
  "horaInicio": "08:00",
  "horaFin": "14:00",
  "vigenciaDesde": "2026-06-01",
  "vigenciaHasta": null,
  "codigoVisual": "M",
  "etiqueta": "Mañana",
  "activo": true
}
```

Body esperado (horario discontinuo, `tipoHorario: "DISCONTINUO"`, mínimo 2 tramos):

```json
{
  "idServicio": 1,
  "codigo": "NEU-DISC",
  "nombre": "Discontinuo",
  "tipoHorario": "DISCONTINUO",
  "tramos": [
    { "horaInicio": "07:00", "horaFin": "12:00" },
    { "horaInicio": "16:00", "horaFin": "20:00" }
  ],
  "vigenciaDesde": "2026-06-01",
  "activo": true
}
```

Notas:

* exactamente uno de `idServicio`/`idDepartamento` debe enviarse
* `duracionHoras` y `cruzaMedianoche` se recalculan desde `horaInicio`/`horaFin` (o desde `tramos`)
* `RRHH` queda solo con lectura de turnos
* si el cambio de horario impacta celdas ya asignadas en planificaciones no `CERRADA`, puede requerirse `estrategiaCeldasExistentes` (`PROPAGAR`/`LIMPIAR`) — ver `docs/arquitectura/impacto-edicion-eliminacion-turno-tipo-dia.md`

#### `PUT /v1/turnos/:id`

Actualiza un turno concreto por servicio o departamento. Mismo body y reglas que `POST /v1/turnos`.

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO`
* `JEFE_SERVICIO`

Con alcance válido sobre el servicio o departamento.

#### `DELETE /v1/turnos/:id`

Desactiva un turno concreto. Acepta `?confirmar_limpieza=true` para confirmar la desactivación cuando impacta celdas ya asignadas (si no se confirma, responde `409` con el detalle del impacto).

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO`
* `JEFE_SERVICIO`

Con alcance válido sobre el servicio o departamento.

### Exportación múltiple

#### `POST /v1/planificaciones/export/excel-lote`

Genera un único Excel con varias planificaciones seleccionadas. Cada planificación se exporta en una hoja distinta.

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO`
* cualquier actor con alcance válido sobre todas las planificaciones enviadas

Body esperado:

```json
{
  "idsPlanificacion": [1, 2, 3],
  "modo": "numerico"
}
```

#### `POST /v1/planificaciones/export/pdf-lote`

Endpoint legado de compatibilidad para generar un PDF consolidado con varias planificaciones seleccionadas.

Estado actual:

* el backend todavía lo conserva
* el frontend operativo actual no lo expone como opción principal

Permisos:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO`
* cualquier actor con alcance válido sobre todas las planificaciones enviadas
