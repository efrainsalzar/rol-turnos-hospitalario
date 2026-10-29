# Matriz de Permisos Operativos

Documento operativo para preproducción del sistema de roles y turnos hospitalarios.

## Objetivo

Dejar claro:

* qué usuarios existen hoy
* qué puede hacer cada rol
* qué menús debe ver cada rol
* qué reglas backend y frontend ya quedaron implementadas

## Principios funcionales

Separación correcta del modelo:

* `cargo base` = profesión o nivel real de la persona
* `rol funcional` = función organizativa u operativa actual

Ejemplos:

* `Lic. Enfermería` + `JEFE_SERVICIO`
* `Lic. Enfermería` + `JEFE_DEPARTAMENTO`
* `Aux. Enfermería` + `ASISTENCIAL`

La jefatura no reemplaza el cargo base.

## Roles operativos

### `ADMIN_SISTEMA`

Actor con control total del sistema.

Debe poder:

* ver toda la información base
* gestionar personal
* gestionar asignaciones
* gestionar usuarios
* gestionar tipos de día
* gestionar catálogo de feriados
* gestionar turnos por servicio
* gestionar calendario y feriados
* ver y operar planificación
* aprobar y cerrar planificación

### `RRHH`

Actor administrativo de personal y asignaciones.

Debe poder:

* ver organización
* ver personal
* gestionar personal
* ver asignaciones
* gestionar asignaciones
* definir quién pasa a `JEFE_SERVICIO`
* definir quién pasa a `JEFE_DEPARTAMENTO`
* gestionar calendario y feriados
* gestionar tipos de día

No debe operar la planificación mensual como usuaria normal de matriz.

### `JEFE_DEPARTAMENTO`

Actor supervisor operativo por departamento.

Debe poder:

* ver planificaciones de sus servicios
* abrir matrices de servicios bajo su alcance
* devolver a borrador
* aprobar planificación
* cerrar planificación aprobada
* gestionar turnos concretos de servicios de su departamento
* ver calendario operativo y feriados
* ver incidencias personales (catálogo de licencias/vacaciones/bajas)

No debe:

* ver personal (catálogo institucional completo — ver migración `045_ajustar_permisos_jefaturas.sql`, 2026-07-07)
* ver reportes (se otorga de forma independiente desde la pantalla de Roles)
* gestionar usuarios
* gestionar asignaciones administrativas
* editar la matriz diaria normal
* gestionar tipos de día
* gestionar catálogo de feriados
* marcar feriados globales

### `JEFE_SERVICIO`

Actor operador del rol mensual de un servicio.

Debe poder:

* ver planificaciones de su servicio
* crear borradores de su servicio
* editar matriz mensual de su servicio
* duplicar planificación
* generar el siguiente mes sobre servicios que puede gestionar
* enviar una planificación a revisión
* gestionar turnos concretos de su servicio
* ver asignaciones de su servicio (no gestionarlas — ver migración `045_ajustar_permisos_jefaturas.sql`, 2026-07-07)
* ver calendario operativo y feriados
* ver incidencias personales (catálogo de licencias/vacaciones/bajas)

No debe:

* aprobar planificación
* ver organización (estructura institucional completa)
* ver personal (catálogo institucional completo)
* ver reportes (se otorga de forma independiente desde la pantalla de Roles)
* gestionar usuarios
* gestionar asignaciones administrativas
* gestionar tipos de día
* gestionar catálogo de feriados
* marcar feriados globales

## Permisos implementados

Tabla actualizada 2026-07-11 contra los valores reales de `dbo.rol_seguridad` (backfill de la migración
`017`, ajustado por `045_ajustar_permisos_jefaturas.sql` y `039_add_puede_ver_reportes_permission.sql`).
La versión anterior de esta tabla no incluía la columna `Ver reportes` (agregada en la migración `039`,
2026-07-05) y no reflejaba los ajustes de `045` — ver `docs/database/decisiones-tecnicas.md` para el
detalle de la reconciliación.

| Rol | Ver organización | Ver personal | Gestionar personal | Ver asignaciones | Gestionar asignaciones | Ver seguridad | Gestionar usuarios | Ver operación | Ver planificación | Editar planificación | Aprobar planificación | Ver reportes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `ADMIN_SISTEMA` | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí | Sí |
| `RRHH` | Sí | Sí | Sí | Sí | Sí | No | No | Sí | No | No | No | No |
| `JEFE_DEPARTAMENTO` | No | No | No | Sí | Sí | No | No | Sí | Sí | Sí | Sí | No |
| `JEFE_SERVICIO` | No | No | No | Sí | No | No | No | Sí | Sí | Sí | No | No |
| `PLANIFICADOR` | No | No | No | No | No | No | No | Sí | Sí | Sí | No | No |

Nota sobre `capacidades operativas` (columnas booleanas independientes de esta tabla, ver
`docs/database/decisiones-tecnicas.md`): las capacidades `gestionarAsignaciones`, `gestionarUsuarios` y
`verTiposTurno` fueron eliminadas el 2026-07-11 (migraciones `050`/`051`) por no tener ningún consumidor
real en backend ni frontend — eran checkboxes en el diálogo de Roles que no producían ningún efecto. El
gating real de asignaciones/usuarios siempre usó los permisos `puedeGestionarAsignaciones`/
`puedeGestionarUsuarios` de esta tabla, no esas capacidades.

## Menú esperado por rol

### `ADMIN_SISTEMA`

Debe ver:

* Organización
* Personal
* Asignaciones
* Seguridad
* Operación
* Planificación

### `RRHH`

Debe ver:

* Organización
* Personal
* Asignaciones
* Operación

No debe ver:

* Seguridad
* Operación
* Planificación

### `JEFE_DEPARTAMENTO`

Debe ver:

* Asignaciones de su departamento
* Planificación

No debe ver:

* Seguridad
* Organización administrativa
* Personal administrativo
* Asignaciones fuera de su departamento

En el menú de Asignaciones (2026-07-05): ve todo el personal activo de su departamento (todos sus servicios + asignaciones directas a nivel departamento), con filtro "Todos" o por servicio puntual. No ve el filtro "Estado" ni el botón "Mostrar historial" — solo ve asignaciones activas, nunca historial. El filtro "Rol funcional" mantiene los 3 tipos (`ASISTENCIAL`, `JEFE_SERVICIO`, `JEFE_DEPARTAMENTO`).

### `JEFE_SERVICIO`

Debe ver:

* Operación
* Planificación

No debe ver:

* Seguridad
* Organización administrativa
* Personal administrativo
* Asignaciones administrativas

Si en algún momento recibe `puedeVerAsignaciones` (hoy en `0` por defecto, ver migración `021`), el acceso al menú de Asignaciones es de solo lectura y fuertemente acotado (2026-07-05): solo ve el personal activo de su propio servicio (nunca de otros servicios del mismo departamento), no ve el filtro "Servicio" (fijo, mostrado como contexto) ni "Estado" ni el botón "Mostrar historial", el filtro "Rol funcional" excluye `JEFE_DEPARTAMENTO`, y la columna de acciones no aparece en absoluto (ni siquiera "Ficha").

## Reglas backend activas

### Gestión de asignaciones

Pueden crear o modificar asignaciones (mover, editar, agregar secundaria, nombrar jefatura de servicio):

* `ADMIN_SISTEMA`
* `RRHH`
* `JEFE_DEPARTAMENTO`, pero solo dentro de su departamento

Pueden cerrar/quitar una asignación (decisión 2026-07-05, ver `docs/database/decisiones-tecnicas.md` §19):

* `ADMIN_SISTEMA`
* `RRHH`

`JEFE_DEPARTAMENTO` ya **no** puede cerrar/quitar asignaciones, aunque siga pudiendo crear, modificar y nombrar jefaturas de servicio dentro de su departamento. `JEFE_SERVICIO` no gestiona asignaciones en absoluto; si en algún momento se le concede `puedeVerAsignaciones` desde la pantalla de Roles, el acceso es de solo lectura y la columna de acciones no debe aparecer.

Restricciones activas para `JEFE_DEPARTAMENTO`:

* no puede crear, mover ni cerrar asignaciones de `JEFE_SERVICIO` o `JEFE_DEPARTAMENTO`
* no puede promover a jefatura departamental, solo a `JEFE_SERVICIO` de servicios dentro de su propio departamento
* no puede mover personal fuera de sus `departamentosGestionables`
* no puede cambiar una asignación si la persona o la asignación ya participa en una planificación abierta (`BORRADOR`, `REVISION`, `APROBADA`)
* no puede cerrar/quitar ninguna asignación

### Gestión de usuarios

Solo puede gestionar usuarios:

* `ADMIN_SISTEMA`

### Tipos de día

Pueden crear, editar o desactivar:

* `ADMIN_SISTEMA`
* `RRHH`

### Catálogo de feriados

Pueden ver y mantener:

* `ADMIN_SISTEMA`
* `RRHH`

### Servicios (catálogo de organización)

Decisión 2026-07-06: fuera de un alcance de sistema (`ADMIN_SISTEMA`, `RRHH`), una jefatura solo gestiona operación vigente, así que el listado de servicios (`GET /v1/servicios`) excluye los inactivos para ella:

* `ADMIN_SISTEMA`, `RRHH`: ven activos e inactivos, con filtro "Estado" disponible.
* `JEFE_DEPARTAMENTO`: ve solo servicios activos de su propio departamento (filtro "Estado" oculto, sin efecto real).
* `JEFE_SERVICIO`: ve solo servicios activos dentro de su alcance (mismo criterio; en la práctica no gestiona este catálogo, pero la regla de alcance es la misma para cualquier actor sin alcance de sistema — ver `ServicioController.scopeServicios`).

### Turnos por servicio (menú "Horarios de servicio y departamento")

Pueden crear, editar o desactivar turnos concretos:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO`
* `JEFE_SERVICIO`

Con alcance válido sobre el servicio. Solo `ADMIN_SISTEMA` y `JEFE_DEPARTAMENTO` pueden crear/editar horarios a **nivel departamento** (`assertPuedeGestionarTurnoDepartamento`); `JEFE_SERVICIO` nunca ve esa opción en el diálogo de creación, ni desde el catálogo de Horarios ni desde "Nuevo horario" en la matriz de planificación (2026-07-05, ver `docs/database/decisiones-tecnicas.md` §21 y §22 — el bug se filtró en dos lugares distintos, hubo que corregirlo en ambos).

`JEFE_DEPARTAMENTO` tiene botón "Limpiar filtros" (2026-07-05, §22) para volver a la vista "Todos" (todo el departamento) después de acotar a un servicio puntual.

Filtros (2026-07-05): `JEFE_SERVICIO` no ve ningún filtro (Departamento y Servicio ocultos, un único valor posible en ambos). `JEFE_DEPARTAMENTO` no ve el filtro Departamento (uno solo), pero sí ve "Servicio" con opción "Todos" (trae turnos directos del departamento + de todos sus servicios) o un servicio puntual de su departamento.

Filtro "Estado" (activo/inactivo, 2026-07-06): visible para `JEFE_SERVICIO` y `JEFE_DEPARTAMENTO` (y para cualquier otro rol con acceso a esta pantalla). A diferencia del catálogo de Servicios, aquí sí tiene sentido dejar ver horarios desactivados: un jefe suele necesitar consultar un horario que dio de baja para revisar su configuración antes de reactivarlo o de crear uno equivalente. El filtro llama al backend con el parámetro `activo` (`GET /v1/turnos?activo=...`), que ya existía en `ListarTurnosQueryDto` pero no estaba expuesto en la UI.

### Calendario y feriados

Pueden generar calendario y marcar feriados:

* `ADMIN_SISTEMA`
* `RRHH`

### Planificación

#### Crear, eliminar y duplicar

Pueden:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO` (planificación de un servicio de su departamento, o de su propio departamento)
* `JEFE_SERVICIO` (solo de su propio servicio)

Con alcance válido sobre el servicio o planificación.

#### Ver vs. editar el contenido de la matriz (decisión 2026-07-06)

"Ver" y "editar" son reglas independientes desde 2026-07-06 (antes, `CERRADA` bloqueaba también la lectura para cualquier jefatura — ver más abajo). Editar contenido (asignar personal, marcar tipo de día/turno) sigue exactamente igual que antes, según el estado de la planificación:

* `ADMIN_SISTEMA`: siempre.
* `JEFE_SERVICIO`: solo mientras está en `BORRADOR`.
* `JEFE_DEPARTAMENTO`: solo mientras está en `REVISION` (correcciones durante la revisión; no edita el `BORRADOR` normal, que es responsabilidad del jefe de servicio).

Ninguna jefatura puede editar contenido de una planificación `APROBADA` o `CERRADA`, sin excepción — eso no cambió.

#### Aprobar o cerrar

Pueden:

* `ADMIN_SISTEMA`
* `JEFE_DEPARTAMENTO`

Con alcance válido sobre la planificación.

#### Transiciones de estado

* `JEFE_SERVICIO`
  * `BORRADOR -> REVISION`
* `JEFE_DEPARTAMENTO`
  * `BORRADOR -> REVISION`
  * `REVISION -> BORRADOR`
  * `REVISION -> APROBADA`
  * `APROBADA -> REVISION`
  * `APROBADA -> CERRADA`

Corrección 2026-07-05: esta sección decía que `JEFE_SERVICIO` podía hacer `REVISION -> BORRADOR`, pero ni la capacidad `volverBorradorPlanificacion` (en `0` para ese rol) ni la tabla de transiciones real del backend (`PlanificacionAccessPolicyService.assertPuedeCambiarEstadoPlanificacion`) lo permiten — solo `'BORRADOR:REVISION'` está habilitado para `isServicioHead`. El código ya estaba correcto, era la documentación la que estaba desactualizada.

#### Bandeja de planificaciones (menú "Bandeja mensual operativa", `pages/planificacion/planificaciones.tsx`)

Filtros (2026-07-05, ver `docs/database/decisiones-tecnicas.md` §23):

* `JEFE_SERVICIO`: no ve los filtros "Tipo", "Departamento" ni "Servicio" (una sola opción posible, y el backend ya acota los resultados a su propio servicio sin importar el filtro pedido — `PlanificacionAccessPolicyService.filtrarPlanificaciones`). Solo ve "Periodo", más un contexto fijo de su servicio.
* `JEFE_DEPARTAMENTO`: conserva "Tipo" (útil, gestiona tanto planificaciones de servicio como de su propio departamento), "Servicio" (varios servicios posibles) y "Estado". No ve "Departamento" (una sola opción, siempre el suyo).

Filtro "Estado" (decisión 2026-07-06): oculto para `JEFE_SERVICIO`. Con el filtro "Periodo" ya fijando un único mes y un único servicio, solo puede existir una planificación visible a la vez — el filtro de Estado no discrimina nada. `JEFE_DEPARTAMENTO` sí lo conserva porque puede tener varios servicios en distintos estados dentro del mismo mes.

Ventana de "Periodo" ampliada a mes anterior/actual/siguiente (decisión 2026-07-06, aplica a `JEFE_SERVICIO` y `JEFE_DEPARTAMENTO` por igual, cada uno dentro de su propio alcance — uno ve solo la planificación de su servicio, el otro las de todos los servicios de su departamento y la departamental): antes, una planificación `CERRADA` quedaba invisible para cualquier jefatura, sin importar el mes; ahora las jefaturas pueden **ver** (nunca editar) cualquier planificación de su alcance dentro de esa ventana de 3 meses, en cualquier estado — típicamente para consultar el mes anterior ya cerrado. Fuera de esa ventana, la planificación sigue sin ser visible para ellas. `ADMIN_SISTEMA`/`RRHH` no tienen esta restricción de ventana (alcance de sistema, sin límite de periodo). Implementado en `PlanificacionAccessPolicyService.estaDentroDePeriodoVisibleJefatura` (backend) y en `getViewablePlanningPeriods` de `planificaciones.tsx` (frontend, debe mantenerse igual a la ventana del backend).

Panel "Nueva planificación": el selector "¿Qué deseas planificar?" (servicio específico / departamento completo) solo se muestra a `ADMIN_SISTEMA`/`RRHH`/`JEFE_DEPARTAMENTO`. Un `JEFE_SERVICIO` siempre crea para su propio servicio, sin selector de scope ni de servicio (ambos autocompletados y bloqueados cuando solo hay una opción). El campo "Periodo a planificar" (decisión 2026-07-06) es un único selector año+mes limitado a mes actual/siguiente (igual que `assertPeriodoPlanificable` en el backend) — antes eran dos selectores separados (Año y Mes), pero con solo 1-2 años posibles el selector de Año no aportaba nada; ahora es el primer campo del formulario.

## Usuarios sembrados para prueba

### Administración

* `admin.sistema` -> `ADMIN_SISTEMA`
* `rrhh.sistema` -> `RRHH`

### Jefaturas de departamento

* `jefa.enfermeria` -> `JEFE_DEPARTAMENTO`
* `jefa.medicina` -> `JEFE_DEPARTAMENTO`
* `jefa.administracion` -> `JEFE_DEPARTAMENTO`

### Jefaturas de servicio

* `jefa.neuro` -> `JEFE_SERVICIO`
* `jefa.cirugia` -> `JEFE_SERVICIO`
* `jefa.emergencias` -> `JEFE_SERVICIO`
* `jefa.quirofano` -> `JEFE_SERVICIO`
* `jefa.utip` -> `JEFE_SERVICIO`
* `jefa.pediatria` -> `JEFE_SERVICIO`
* `jefa.geriatria` -> `JEFE_SERVICIO`
* `jefa.consultorios` -> `JEFE_SERVICIO`
* `jefa.esterilizacion` -> `JEFE_SERVICIO`
* `jefa.medi` -> `JEFE_SERVICIO`
* `jefa.especialidades` -> `JEFE_SERVICIO`

## Qué debe probarse ahora

### `ADMIN_SISTEMA`

* ve todos los menús
* puede entrar a usuarios
* puede gestionar personal
* puede gestionar asignaciones
* puede operar planificación completa

### `RRHH`

* ve organización, personal, asignaciones y operación
* no ve seguridad ni planificación
* puede crear, modificar y cerrar asignaciones
* puede promover a `JEFE_SERVICIO` o `JEFE_DEPARTAMENTO`
* puede gestionar tipos de día
* puede gestionar feriados

### `JEFE_DEPARTAMENTO`

* ve operación y planificación
* puede abrir planificación de servicios de su departamento
* no puede editar matriz
* puede aprobar y cerrar
* puede gestionar turnos por servicio dentro de su departamento
* en el catálogo de Servicios no ve inactivos, ni el filtro para buscarlos
* en el listado de planificaciones puede elegir "Periodo" del mes anterior y abrir una planificación `CERRADA` en modo solo lectura (sin botones de edición ni de cambio de estado)

### `JEFE_SERVICIO`

* ve operación y planificación
* puede editar matriz de su servicio
* puede enviar a revisión
* no puede aprobar ni gestionar usuarios
* puede gestionar turnos de su servicio
* en el listado de planificaciones no ve el filtro "Estado" (solo "Periodo")
* puede elegir "Periodo" del mes anterior y abrir la planificación `CERRADA` de su servicio en modo solo lectura
* en el catálogo de Servicios no ve inactivos, ni el filtro para buscarlos
* en Horarios de servicio y departamento ve el filtro "Estado" (activo/inactivo)

## Decisión operativa vigente

La administración de personal no es el centro del producto, pero sí debe quedar suficientemente sólida para sostener el rol mensual.

Por eso:

* el flujo principal de la app sigue siendo `planificación`
* `RRHH` y `ADMIN_SISTEMA` sostienen los datos administrativos
* `JEFE_DEPARTAMENTO` y `JEFE_SERVICIO` sostienen la operación del rol
