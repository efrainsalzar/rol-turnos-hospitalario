# Estándar de notificaciones y mensajes al usuario

Fecha de inicio: 2026-10-25. Documento de seguimiento (mismo criterio que `estandar-modales.md`).
Decisión de origen: `docs/database/decisiones-tecnicas.md` §169.

## Problema

El frontend muestra **tal cual** el `message` que devuelve el backend (`apps/web/src/services/apiClient.ts`,
`buildApiError`). Por eso el usuario veía textos como "No se encontro el departamento con id 7", nombres
técnicos (`rolSeguridad`, `rol_turno`, nombres de tablas) y, ante un error no controlado, el texto crudo
de SQL Server. El inventario inicial encontró **185 mensajes de backend con id o código** (127 textos
distintos); 24 son internos o de consola y no llegan a pantalla.

## Reglas del estándar

1. **Ningún id interno en un mensaje que pueda ver el usuario.** El id va al log del servidor
   (`ARQUITECTURA.md` §9).
2. **Registro inexistente** → `noEncontrado(entidad, id, contexto)` (`apps/api/src/common/errors/mensajes-usuario.ts`).
   No hay nombre que mostrar porque el registro no existe: el mensaje pide actualizar la pantalla.
3. **Registro que existe** (relaciones, permisos, conflictos) → mostrar su **nombre**, no su id.
   Ejemplo: `El horario "Mañana" no pertenece al servicio de la planificacion.`
4. **Escritura que no se pudo releer** → `errorAlConfirmarGuardado(entidad, id, contexto)`. El mensaje no
   afirma que se guardó (si estaba en una transacción, se revirtió).
5. **Duplicados** (violación de `UNIQUE`) → traducir con `obtenerRestriccionUnicaViolada()`
   (`apps/api/src/infrastructure/persistence/typeorm/violacion-unica.ts`) a "Ya existe un X con el
   código/nombre Y". Reconoce los nombres `uq_*` aunque SQL Server esté en otro idioma.
6. **Error no controlado** (no `HttpException`): el filtro global lo registra completo y responde
   `MENSAJE_ERROR_INESPERADO`. Nunca llega texto técnico a pantalla.
7. **Avisos de éxito en el frontend**: `{Entidad} "{nombre}" {acción} correctamente.`
   Ejemplo: `Servicio "Emergencias" creado correctamente.` / `Departamento "Enfermeria" desactivado.`
8. **Términos de usuario**, no técnicos: "incidencia de personal" (no "tipo de día", renombrado en la
   migración 042), "rol de seguridad" (no `rolSeguridad`), "registro de la matriz" (no `rol_turno`).
9. Backend sin tildes, igual que el resto de sus mensajes (convención existente).
10. **Trato de "tú"** en todos los mensajes ("Actualiza la pantalla", "Usa otro código"), que es lo que ya
    usaba casi todo el frontend (38 contra 2); el backend estaba mezclado 28/28.
11. **Login**: un solo mensaje (`Usuario o contrasena incorrectos.`) para usuario inexistente, sin
    credenciales locales o contraseña incorrecta; el motivo real va al log. Mensajes distintos permitían
    averiguar qué nombres de usuario existen.

## Avance por menú

| Menú | Backend | Frontend | Estado |
| --- | --- | --- | --- |
| Base común (helpers + filtro global) | — | — | ✅ 2026-10-25 |
| Organización | 3 + 3 internos + duplicados | avisos de éxito unificados | ✅ 2026-10-25 |
| Seguridad | 17 + login unificado | roles y usuarios: avisos de éxito, textos "RolSeguridad" | ✅ 2026-10-25 |
| Operación | 21 + 4 `Error` de validación en configuración operativa + permisos | horarios, incidencias, tipos de feriado, cargas horarias, configuración | ✅ 2026-10-25 |
| Personal | 31 + permisos + duplicados de cargos y cargas horarias | personal, asignaciones, cargos, tipos de contrato | ✅ 2026-10-25 |
| Planificación | 88 + permisos + nombres en crear/duplicar | avisos de cambio de estado, creación y borrado; respaldo "servicio 8"; matriz | ✅ 2026-10-25 |

### Corrección transversal: textos dañados por el renombrado `rol` → `rolSeguridad` (2026-10-25)

El commit `3b3e0c5` (2026-07-06) reemplazó "rol" por "rolSeguridad" en todo el código, incluidos textos
visibles, y cambió su sentido: en este sistema "rol" también es **el rol de turnos** (la planificación
mensual). Se restauraron según su contexto, usando ese commit como referencia del texto original
(26 textos):

* rol de turnos: título y descripción del reporte por personal, detalle de planificación, matriz, y en
  **documentos exportados**: hoja de Excel por defecto (`Rol turnos`), asunto del archivo, títulos HTML del
  reporte individual y de la exportación múltiple, descripción de códigos operativos.
* rol de seguridad: pantalla de roles (botón, buscador, títulos, ayuda), filtro y columna de usuarios,
  mensajes del backend.
* rol funcional: alta de personal, asignaciones, detalle de servicio, mensajes y logs de personal.

Quedan 9 comentarios de código con el mismo reemplazo (no visibles para el usuario).

### Hecho en Planificación (además del checklist)

* `helpers/planificacion-mensajes.ts` (backend): `describirPlanificacion` ("la planificacion de Emergencias de
  octubre 2026"), `nombrePeriodo` y estado legible ("esta en borrador", "de borrador a revision"). Lo usan las
  reglas de estado (`planificacion-business-rules.ts`) y aprobar sin registros.
* Crear borrador: el repositorio pasa de `existeServicio`/`existeDepartamento` a
  `obtenerNombreServicio`/`obtenerNombreDepartamento` para nombrar la unidad sin personal y el periodo duplicado.
  Duplicar y configuración operativa faltante usan los nombres que ya trae la planificación.
* Matriz: horario e incidencia de personal por nombre; persona, día o código operativo que ya no pertenecen a la
  planificación (pantalla desactualizada) piden actualizar la pantalla.
* Permisos: `PlanificacionAccessPolicyService` y `CalendarioAccessPolicyService` pasan a "No tienes permiso
  para ..."; `denegar()` registra actor e ids en el log. Las acciones del controller dejan de decir `rol_turno`.
* Control de edición: sin id, y "tomar el control" nombra a quien está editando.
* Frontend: `utils/planificacion-mensajes.ts` (`etiquetaPlanificacion`, `mensajeCambioEstadoPlanificacion`):
  `Planificación "Emergencias — Octubre 2026" aprobada correctamente.` en detalle, matriz y listado; creación y
  borrado con el mismo formato. `TurnoFormDialog`: `successMessage` (que reemplazaba el aviso con nombre) pasa a
  `creationHint`, que se agrega al aviso estándar.

### Barrido final (2026-10-25, ver §173)

* Backend fuera del inventario: 7 relecturas con `new Error` e id en los repositorios de planificación y registros de la
  matriz, 2 permisos del controller de planificación, periodos `2026-10` → "octubre 2026", lote de integración con id
  y mensajes de integración en "usted".
* Frontend: feriados, generación de calendario, horario desactivado en la matriz y visualización de código con el
  formato de la regla 7.
* No incluido: mensajes de validación de DTO (class-validator).

### Hecho en Personal (además del checklist)

* Permisos (16 mensajes): "El usuario X no puede crear asignaciones" pasa a "No tienes permiso para crear
  asignaciones." (mismo criterio que Operación).
* Mensajes con nombre: `El servicio "X" no pertenece al departamento "Y"`; Nro. ITEM con el nombre de la persona
  y el ITEM ya definido; documento o código de personal duplicado dice a quién pertenece
  (`El documento 123 ya esta registrado para Ana Perez Lopez.`).
* "La asignacion 15 ya tiene actividad operativa..." (3 variantes) pasa a "Esta asignacion ya tiene registros en
  una planificacion abierta...".
* Fecha del traslado sin planificación aprobada en `DD/MM/YYYY` (antes ISO).
* Cargos y cargas horarias: el código o nombre duplicado no se validaba y llegaba como error inesperado; ahora
  `409` "Ya existe un cargo con el codigo X. Usa otro codigo." (`mapearDuplicadoCatalogo`).
* `mapearErrorAsignacion` usa `obtenerRestriccionUnicaViolada` (antes copia local de la detección).
* Trato de "tú" y sin tildes en todos los mensajes del repositorio (antes "Verifique", "Cierre", "Use").
* Frontend: avisos con nombre en personal (alta, edición, baja), asignaciones (editar, mover, jefaturas, quitar,
  secundaria), cargos y tipos de contrato; chip "Filtro por personal #6" → nombre de la persona; respaldo
  `#id` en `AsignacionCloseDialog` → "Unidad sin nombre".

### Hecho en Operación (además del checklist)

* Permisos (`operacion-access-policy.service.ts`, los 7 mensajes): "El usuario X no puede gestionar turnos
  del servicio 8" pasa a `No tienes permiso para gestionar los horarios de este servicio.` No se nombra el
  servicio porque está fuera del alcance del usuario; actor e ids van al log.
* Configuración operativa (`typeorm-configuracion-operativa-servicio.repository.ts`): los 4 `throw new Error`
  respondían el mensaje genérico. "Código operativo que no pertenece al servicio" ocurre cuando la pantalla
  quedó abierta mientras otro usuario cambiaba los horarios: ahora `409` pidiendo actualizar la pantalla.
  "No se pudo recuperar la configuración" pasa a `errorAlConfirmarGuardado`.
* "No se encontró configuración operativa para el servicio X": el repositorio solo devuelve vacío si el
  servicio/departamento no existe o está inactivo (la configuración se crea sola), así que pasa a
  `noEncontrado('servicio' | 'departamento')`.
* Horario duplicado: `Ya existe un horario con el codigo M en este servicio que rige desde el 01/10/2026.
  Usa otro codigo o cambia la fecha de inicio de vigencia.`
* "turno" → "horario" y "tipo de dia" → "incidencia de personal" en los mensajes y logs del módulo;
  "Debe especificar idServicio o idDepartamento" → texto sin nombres de campos.
* `ImpactoUsoDialog`: título con mayúscula y nueva prop `entidadGenero` (antes "usan este incidencia").
* Frontend: avisos de éxito con nombre en horarios (`turnos.tsx`, `TurnoFormDialog.tsx`), incidencias y días
  generales (`incidencia-personal-base.tsx`, antes "Activado correctamente." sin decir qué), tipos de
  feriado, cargas horarias y etiquetas de configuración operativa.

### Hecho en Seguridad (además del checklist)

* Personal vinculado a un usuario: los mensajes nombran a la persona (`<Nombre Apellido> ya tiene un usuario activo
  (<usuario>)...`) en lugar de "el personal 6"; la consulta de validación ahora trae el nombre.
* Mensaje de alcance con etiquetas legibles (`alcance servicio; tu alcance es departamento`).
* `roles.tsx`: se quitó la rama de `formatRolError` que buscaba `IDENTITY_INSERT` en el mensaje (ya no llega
  texto de SQL Server).
* Avisos de éxito de roles, usuarios y restablecer contraseña con la regla 7.

### Hecho en Organización (además del checklist)

* `typeorm-departamento.repository.ts` / `typeorm-servicio.repository.ts`: los `throw new Error('No se pudo
  recuperar ...')` pasan a `noEncontrado` (actualizar un id inexistente) o `errorAlConfirmarGuardado`.
* Código o nombre duplicado en departamento/servicio: antes llegaba el texto de SQL Server; ahora
  `Ya existe un departamento con el codigo X` / `Ya existe un servicio llamado "X" en ese departamento`.
* Frontend `departamentos.tsx` y `servicios.tsx`: avisos de éxito con el formato de la regla 7.

## Pendientes transversales (fuera de un solo menú)

* [x] Frontend planificación: "Planificación 12 creada/aprobada/eliminada" (`PlanificacionCreateDialog.tsx`,
  `planificacion-detalle.tsx`, `planificacion-matriz.tsx`, `planificaciones.tsx` ×2) → servicio + periodo,
  y estado legible en lugar de `APROBADA`.
* [x] Textos de pantalla con id: "servicio 8" de respaldo al borrar planificación (`planificaciones.tsx`). El chip
  de asignaciones y el respaldo de `AsignacionCloseDialog.tsx` ya se hicieron en Personal.
* [x] "tipo de dia" → "incidencia de personal": Operación hecho; los 11 de Planificación (matriz y
  `resolver-codigo-operativo-planificacion.ts`).
* [x] `planificacion-matriz.tsx`: `ImpactoUsoDialog` con `entidadLabel="turno"` y aviso "Horario creado. Ya
  disponible en la toolbar." sin nombre (se hace con Planificación).
* [x] Unificar las dos copias locales de detección de `UNIQUE` (Personal hecho; la de configuración operativa
  es `insertIgnorandoDuplicados`, que ignora el duplicado a propósito y se deja así) (`typeorm-personal.repository.ts`
  `mapearErrorAsignacion`, `typeorm-configuracion-operativa-servicio.repository.ts`) con
  `obtenerRestriccionUnicaViolada`.
* [x] Niveles de cargo: código duplicado no se valida (hecho en Personal, también cargas horarias) (hoy responde el mensaje genérico de error inesperado).
* [x] `configuracion-operativa`: 4 `throw new Error` de validación (hecho en Operación, ver arriba).

## Checklist de backend por menú

Generado del inventario del 2026-10-25 (archivo y texto original; los números de línea cambian con cada
edición, por eso no se listan).

### Organización (departamentos, servicios) — 3 mensajes de backend ✅

- [x] `modules/organizacion/application/use-cases/listar-servicios-por-departamento.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro un departamento con id ${idDepartamento}.
- [x] `modules/organizacion/application/use-cases/obtener-servicio-detalle.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro un servicio con id ${idServicio}.
- [x] `modules/organizacion/presentation/controllers/servicio.controller.ts` (no encontrado → `noEncontrado()`): No se encontro un servicio con id ${idServicio}.

### Seguridad (usuarios, roles) — 17 mensajes de backend ✅

- [x] `modules/seguridad/application/use-cases/actualizar-rol-seguridad.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el rolSeguridad con id ${idRolSeguridad}.
- [x] `modules/seguridad/application/use-cases/actualizar-usuario.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el rolSeguridad con id ${input.idRolSeguridad}.
- [x] `modules/seguridad/application/use-cases/crear-usuario.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el rolSeguridad con id ${input.idRolSeguridad}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro un usuario activo con id ${input.idUsuario}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el usuario creado con id ${insertedId}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario con id ${idUsuario}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el usuario actualizado con id ${idUsuario}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario con id ${idUsuario}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario con id ${idUsuario}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${input.idPersonal}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (relación/permiso → mostrar nombre): No se puede dejar activo un usuario vinculado a personal inactivo. Reactiva primero al personal ${input.idPersonal} o desvincula la cuenta.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (relación/permiso → mostrar nombre): El personal ${input.idPersonal} ya tiene un usuario activo asociado.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el rolSeguridad con id ${input.idRolSeguridad}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${input.idPersonal}.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (relación/permiso → mostrar nombre): El personal ${input.idPersonal} no tiene una asignacion activa compatible con jefatura de departamento. Primero regulariza su asignacion institucional.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (relación/permiso → mostrar nombre): El personal ${input.idPersonal} no tiene una asignacion activa compatible con jefatura de servicio. Primero regulariza su asignacion institucional.
- [x] `modules/seguridad/infrastructure/persistence/typeorm-usuario.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario con id ${idUsuario}.

### Operación (horarios, incidencias, feriados, configuración operativa) — 21 mensajes de backend

- [x] `modules/operacion/application/use-cases/helpers/operacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede gestionar turnos del servicio ${idServicio}.
- [x] `modules/operacion/application/use-cases/helpers/operacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede gestionar turnos del departamento ${idDepartamento}.
- [x] `modules/operacion/application/use-cases/helpers/operacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede gestionar la configuracion operativa del servicio ${idServicio}.
- [x] `modules/operacion/application/use-cases/helpers/operacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede gestionar la configuracion operativa del departamento ${idDepartamento}.
- [x] `modules/operacion/application/use-cases/obtener-configuracion-operativa-departamento.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro configuracion operativa para el departamento ${idDepartamento}.
- [x] `modules/operacion/application/use-cases/obtener-configuracion-operativa-servicio.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro configuracion operativa para el servicio ${idServicio}.
- [x] `modules/operacion/application/use-cases/obtener-impacto-uso-incidencia-personal.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de dia con id ${id}.
- [x] `modules/operacion/application/use-cases/obtener-impacto-uso-turno.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${id}.
- [x] `modules/operacion/application/use-cases/obtener-turno-por-id.use-case.ts` (no encontrado → `noEncontrado()`): Turno con id ${id} no encontrado.
- [x] `modules/operacion/infrastructure/persistence/typeorm-incidencia-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de dia con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-incidencia-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el tipo de dia actualizado con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-incidencia-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de dia con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-incidencia-personal.repository.ts` (con código (revisar)): Ya existe un tipo de dia con codigo ${codigo.trim().toUpperCase()}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el turno actualizado con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${id}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el servicio activo con id ${idServicio}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el departamento activo con id ${idDepartamento}.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (con código (revisar)): Ya existe un turno ${codigo.trim().toUpperCase()} para ese servicio con la misma vigencia de inicio.
- [x] `modules/operacion/infrastructure/persistence/typeorm-turno.repository.ts` (con código (revisar)): Ya existe un turno ${codigo.trim().toUpperCase()} para ese departamento con la misma vigencia de inicio.

### Personal (personal, asignaciones, cargos, catálogos) — 32 mensajes de backend

- [x] `modules/personal/application/use-cases/activar-personal.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${idPersonal}.
- [x] `modules/personal/application/use-cases/crear-asignacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${input.idPersonal}.
- [x] `modules/personal/application/use-cases/desactivar-personal.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${idPersonal}.
- [x] `modules/personal/application/use-cases/helpers/asignacion-access-policy.service.ts` (no encontrado → `noEncontrado()`): No se encontro la asignacion con id ${idAsignacion}.
- [x] `modules/personal/application/use-cases/helpers/asignacion-access-policy.service.ts` (no encontrado → `noEncontrado()`): No se encontro el rolSeguridad funcional con id ${idRolFuncional}.
- [x] `modules/personal/application/use-cases/listar-personal-por-departamento.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro un departamento con id ${idDepartamento}.
- [x] `modules/personal/application/use-cases/listar-personal-por-servicio.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro un servicio con id ${idServicio}.
- [x] `modules/personal/application/use-cases/obtener-personal-detalle.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro personal con id ${idPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar la asignacion creada con id ${insertedId}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro la asignacion con id ${idAsignacion}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar la asignacion con id ${idAsignacion}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar la asignacion actualizada con id ${idAsignacion}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro la asignacion con id ${idAsignacion}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar la asignacion movida con id ${insertedId}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro la asignacion con id ${idAsignacion}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar la asignacion cerrada con id ${idAsignacion}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el personal creado con id ${insertedId}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${idPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el personal actualizado con id ${idPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${idPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${idPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el personal con id ${input.idPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el servicio con id ${input.idServicio}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el departamento con id ${idDepartamentoResuelto}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (relación/permiso → mostrar nombre): El servicio ${input.idServicio} no pertenece al departamento ${idDepartamentoResuelto}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (relación/permiso → mostrar nombre): El personal ${idPersonal} tiene mas de un Nro. ITEM historico. Corrija el dato administrativo antes de continuar.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (relación/permiso → mostrar nombre): El Nro. ITEM del personal ${idPersonal} ya esta definido y no puede modificarse desde asignaciones.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el registro ${id} en ${tableName}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (con código (revisar)): Ya existe personal registrado con codigo ${input.codigoPersonal}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el nivel de cargo con id ${idNivelCargo}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el cargo ${idNivelCargo}.
- [x] `modules/personal/infrastructure/persistence/typeorm-personal.repository.ts` (no encontrado → `noEncontrado()`): No se encontro la carga horaria ${idCargaHoraria}.

### Planificación (planificaciones, matriz, calendarios, reportes) — 88 mensajes de backend ✅

- [x] `modules/planificacion/application/use-cases/actualizar-observacion-mensual-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/actualizar-observacion-mensual-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario de operacion con id ${idUsuarioOperacion}.
- [x] `modules/planificacion/application/use-cases/actualizar-observacion-mensual-planificacion.use-case.ts` (relación/permiso → mostrar nombre): La asignacion ${idAsignacionPersonal} no pertenece al alcance de la planificacion.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el rol_turno ${idRolTurno} en la planificacion ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario de operacion con id ${input.idUsuarioOperacion}.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): La asignacion ${input.idAsignacionPersonal} no pertenece al alcance de la planificacion.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El calendario ${input.idCalendario} no pertenece al periodo de la planificacion.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${codigoOperativo.idTurno}.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El turno ${codigoOperativo.idTurno} no pertenece al servicio de la planificacion.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El turno ${codigoOperativo.idTurno} no esta activo para planificacion.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de dia con id ${codigoOperativo.idIncidenciaPersonal}.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (con código (revisar)): El tipo de dia ${incidenciaPersonal.codigo} no esta activo para planificacion.
- [x] `modules/planificacion/application/use-cases/actualizar-rol-turno-planificacion.use-case.ts` (con código (revisar)): El tipo de dia ${incidenciaPersonal.codigo} corresponde a un dia general del calendario y no debe asignarse a una persona en la matriz.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (relación/permiso → mostrar nombre): La asignacion ${input.idAsignacionPersonal} no pertenece al servicio de la planificacion.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El calendario ${input.idCalendario} no pertenece al periodo de la planificacion.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${idTurno}.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El turno ${idTurno} no pertenece al servicio de la planificacion.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El turno ${idTurno} no esta activo para planificacion.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de dia con id ${idIncidenciaPersonal}.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (con código (revisar)): El tipo de dia ${incidenciaPersonal.codigo} no esta activo para planificacion.
- [x] `modules/planificacion/application/use-cases/aplicar-celda-matriz-planificacion.use-case.ts` (con código (revisar)): El tipo de dia ${incidenciaPersonal.codigo} corresponde a un dia general del calendario y no debe asignarse a una persona en la matriz.
- [x] `modules/planificacion/application/use-cases/cambiar-estado-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/cambiar-estado-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario con id ${idUsuarioOperacion}.
- [x] `modules/planificacion/application/use-cases/cambiar-estado-planificacion.use-case.ts` (relación/permiso → mostrar nombre): La planificacion ${idPlanificacion} no puede aprobarse sin registros de rol_turno.
- [x] `modules/planificacion/application/use-cases/cerrar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/cerrar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario de cierre con id ${input.idUsuarioCierre}.
- [x] `modules/planificacion/application/use-cases/crear-borrador-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario creador con id ${input.idUsuarioCreador}.
- [x] `modules/planificacion/application/use-cases/crear-borrador-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el servicio con id ${idServicio}.
- [x] `modules/planificacion/application/use-cases/crear-borrador-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El servicio ${idServicio} no tiene personal activo asignado. Asigna personal antes de crear una planificacion.
- [x] `modules/planificacion/application/use-cases/crear-borrador-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el departamento con id ${idDepartamento}.
- [x] `modules/planificacion/application/use-cases/crear-borrador-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El departamento ${idDepartamento} no tiene personal activo asignado directamente. Asigna personal antes de crear una planificacion departamental.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario de operacion con id ${input.idUsuarioOperacion}.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): La asignacion ${input.idAsignacionPersonal} no pertenece al alcance de la planificacion.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El calendario ${input.idCalendario} no pertenece al periodo de la planificacion.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el turno con id ${codigoOperativo.idTurno}.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El turno ${codigoOperativo.idTurno} no pertenece al servicio de la planificacion.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (relación/permiso → mostrar nombre): El turno ${codigoOperativo.idTurno} no esta activo para planificacion.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de dia con id ${codigoOperativo.idIncidenciaPersonal}.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (con código (revisar)): El tipo de dia ${incidenciaPersonal.codigo} no esta activo para planificacion.
- [x] `modules/planificacion/application/use-cases/crear-rol-turno-planificacion.use-case.ts` (con código (revisar)): El tipo de dia ${incidenciaPersonal.codigo} corresponde a un dia general del calendario y no debe asignarse a una persona en la matriz.
- [x] `modules/planificacion/application/use-cases/duplicar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/duplicar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario con id ${idUsuarioOperacion}.
- [x] `modules/planificacion/application/use-cases/duplicar-planificacion.use-case.ts` (relación/permiso → mostrar nombre): Ya existe una planificacion activa para el servicio ${planificacion.idServicio} en ${input.anio}-${input.mes}.
- [x] `modules/planificacion/application/use-cases/eliminar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/eliminar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/eliminar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario de operacion con id ${idUsuarioOperacion}.
- [x] `modules/planificacion/application/use-cases/eliminar-rol-turno-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el rol_turno ${idRolTurno} en la planificacion ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/generar-reporte-personal.use-case.ts` (relación/permiso → mostrar nombre): La asignacion ${idAsignacion} no pertenece a la planificacion ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/helpers/asegurar-control-edicion-planificacion.helper.ts` (relación/permiso → mostrar nombre): La planificacion ${idPlanificacion} esta siendo editada por ${obtenerEtiquetaCortaRol(resultado.sesion.codigoRolEditor)}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede consultar planificaciones del servicio ${filtro.idServicio}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede consultar planificaciones del departamento ${filtro.idDepartamento}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (relación/permiso → mostrar nombre): El usuario ${actor.username} no puede ${accion} en el servicio ${idServicio}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-access-policy.service.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-business-rules.ts` (relación/permiso → mostrar nombre): La planificacion ${planificacion.id} no permite ${accion} porque esta en estado ${planificacion.estado}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-business-rules.ts` (relación/permiso → mostrar nombre): La planificacion ${planificacion.id} no puede aprobarse porque esta en estado ${planificacion.estado}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-business-rules.ts` (relación/permiso → mostrar nombre): La planificacion ${planificacion.id} no puede cerrarse porque esta en estado ${planificacion.estado}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-business-rules.ts` (relación/permiso → mostrar nombre): La planificacion ${planificacion.id} no puede editarse porque esta en estado ${planificacion.estado}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-business-rules.ts` (relación/permiso → mostrar nombre): La planificacion ${planificacion.id} solo puede copiar su rolSeguridad base cuando esta APROBADA o CERRADA. Estado actual: ${planificacion.estado}.
- [x] `modules/planificacion/application/use-cases/helpers/planificacion-business-rules.ts` (relación/permiso → mostrar nombre): La planificacion ${planificacion.id} no puede eliminarse porque esta en estado ${planificacion.estado}.
- [x] `modules/planificacion/application/use-cases/helpers/resolver-codigo-operativo-planificacion.ts` (relación/permiso → mostrar nombre): El codigo operativo ${input.idCodigoOperativoServicio} no pertenece a la configuracion operativa de la planificacion ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/helpers/resolver-codigo-operativo-planificacion.ts` (con código (revisar)): El tipo de dia ${codigo.codigoInterno} corresponde a un dia general del calendario y no debe asignarse como incidencia personal en la matriz.
- [x] `modules/planificacion/application/use-cases/listar-asignaciones-disponibles-por-planificacion.use-case.ts` (relación/permiso → mostrar nombre): No existe una planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/listar-resumen-calendario-por-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/listar-resumen-personal-por-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/listar-rol-turnos-por-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/obtener-configuracion-operativa-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/obtener-matriz-mensual-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/obtener-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${id}.
- [x] `modules/planificacion/application/use-cases/publicar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro la planificacion con id ${idPlanificacion}.
- [x] `modules/planificacion/application/use-cases/publicar-planificacion.use-case.ts` (no encontrado → `noEncontrado()`): No se encontro el usuario publicador con id ${input.idUsuarioPublicador}.
- [x] `modules/planificacion/application/use-cases/publicar-planificacion.use-case.ts` (relación/permiso → mostrar nombre): La planificacion ${idPlanificacion} no puede publicarse sin registros de rol_turno.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-feriado.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el feriado con id ${id}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-feriado.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el feriado actualizado con id ${id}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-feriado.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el feriado con id ${id}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-feriado.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de feriado con id ${idTipoFeriado}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-planificacion-historial.repository.ts` (relación/permiso → mostrar nombre): La planificacion ${input.idPlanificacion} ya tiene historial materializado.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-planificacion-historial.repository.ts` (relación/permiso → mostrar nombre): No se encontro la planificacion ${input.idPlanificacion} para materializar su historial.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-planificacion-historial.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar la planificacion cerrada con id ${input.idPlanificacion}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-tipo-feriado.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de feriado con id ${id}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-tipo-feriado.repository.ts` (interno → `errorAlConfirmarGuardado()`): No se pudo recuperar el tipo de feriado actualizado con id ${id}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-tipo-feriado.repository.ts` (no encontrado → `noEncontrado()`): No se encontro el tipo de feriado con id ${id}.
- [x] `modules/planificacion/infrastructure/persistence/typeorm-tipo-feriado.repository.ts` (con código (revisar)): Ya existe un tipo de feriado con codigo ${normalizeCode(codigo)}.
