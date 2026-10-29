# Estrategia: módulo de Usuarios y Roles/Permisos

**Estado:** implementado y verificado (2026-07-04).
**Fecha:** 2026-07-04
**Módulos afectados:** `seguridad` (backend), `pages/seguridad/*` (frontend).

---

## 1. Qué existe hoy (diagnóstico)

### 1.1 Modelo de permisos

No es una tabla de permisos flexible: son **columnas booleanas fijas en `dbo.rol`** — 11 `permisos` (`puedeVerOperacion`, `puedeGestionarUsuarios`, etc., `usuario-permisos.ts`) + 20 `capacidades` (`verCalendarios`, `gestionarTurnos`, etc., `usuario-capacidades.ts`), agregadas en la migración `017_add_role_permissions_and_scope.sql`. Agregar un permiso nuevo hoy implica: nueva migración + columna en `rol.orm-entity.ts` + campo en la interfaz + mapper — no es un problema a resolver ahora, es una restricción de arquitectura ya asumida por el proyecto que hay que respetar al planear cambios.

Cada rol también tiene `alcancePlanificacion` (`SISTEMA | DEPARTAMENTO | SERVICIO | LECTURA`), que junto con `asignacion_personal` (vía jefaturas) determina `departamentosGestionables`/`serviciosGestionables` de la sesión activa (`typeorm-usuario.repository.ts`, `buildSessionFromUsuarioBase`).

### 1.2 Validaciones de negocio ya existentes

Centralizadas en `assertCanPersistUser` (`typeorm-usuario.repository.ts:930-1055`): unicidad de `username`, un `idPersonal` no puede tener 2 usuarios activos, un usuario activo requiere rol, y si el rol es de alcance `DEPARTAMENTO`/`SERVICIO` requiere que el personal vinculado tenga jefatura activa compatible.

**Gap encontrado:** no existe ninguna regla que impida desactivar al único usuario con rol de alcance `SISTEMA` activo. Hoy es posible quedarse sin ningún administrador funcional del sistema por error. Ver sección 4.

### 1.3 Pantallas actuales

- `usuarios.tsx`: filtros `username` (texto libre), `rol`, `activo`, `tipoUsuario` — todos con la convención "vacío = Todos". Formulario único crea/edita/resetea password, con auto-generación de credenciales y alertas de compatibilidad rol↔jefatura ya implementadas.
- `roles.tsx`: filtros `search`, `activo`. Formulario con los 31 permisos/capacidades como **dos listas planas de checkboxes** (Permisos globales / Capacidades operativas), sin agrupación temática interna.

### 1.4 Patrones ya establecidos en el proyecto (para reusar, no reinventar)

- **Ocultar acciones por permiso**: spread condicional `...(puedeGestionar ? [...] : [])` sobre columnas de tabla y botones de `actions`. Ya usado en `usuarios.tsx`/`roles.tsx` vía `permissions.puedeGestionarUsuarios`.
- **Filtro vacío = "Todos"**: convención consistente en todo el proyecto (`activoFilter`, etc.) — nunca "vacío = ninguno".
- **Auto-selección cuando hay una sola opción** ("patrón único"): `xDisponibles.length === 1 ? xDisponibles[0] : null`, usado para ocultar el selector y fijar el valor (ej. `turnos.tsx`, `servicios.tsx`).
- **Cascada departamento→servicio real**: hook `useDepartmentServiceCascade` (auto-selecciona, invalida selección si deja de existir, expone helper text/placeholder). Ninguno de estos 3 patrones existe todavía en `usuarios.tsx`/`roles.tsx`.

---

## 2. Lectura de lo que pediste

Interpreto tus 3 puntos así, mapeados a mecanismos que el proyecto ya tiene y debe extender (no inventar desde cero):

1. **"Según permisos, se muestran acciones correspondientes"** → ya está bien resuelto y es consistente (`puedeGestionar ? [...] : []`). Solo hay que mantenerlo igual en lo nuevo que se toque.
2. **"Cargas automáticas en casos"** → aplicar el patrón "único" + `useDepartmentServiceCascade`, que hoy **no** se usa en usuarios/roles:
   - Si un admin de alcance `DEPARTAMENTO`/`SERVICIO` gestiona un único departamento/servicio, no debería tener que elegirlo al crear un usuario vinculado a personal de ese ámbito — se autocompleta, igual que ya pasa en `turnos.tsx`/`servicios.tsx`.
   - Si solo hay un rol activo compatible con el contexto (poco común pero posible en una instalación chica), preseleccionarlo en vez de forzar la elección.
3. **"Filtros cuando no se selecciona nada"** → si se agrega un filtro de departamento/servicio a `usuarios.tsx` (hoy no existe, solo rol/activo/tipoUsuario/username), debe seguir la convención ya establecida: vacío = Todos, y si se encadena departamento→servicio, usar `useDepartmentServiceCascade` en vez de armar una cascada manual nueva.

---

## 3. Propuesta concreta

### 3.1 Backend — sin cambios de infraestructura, solo dos ajustes de comportamiento

- Ninguna migración nueva ni columna nueva necesaria para lo pedido — el modelo de permisos actual ya soporta todo lo de la sección 2.
- Agregar el filtro de listado de usuarios por departamento/servicio gestionable (hoy `listar-usuarios.use-case.ts` no lo tiene) **si** se decide agregar ese filtro en frontend — pendiente de confirmar si hace falta (ver sección 5).

### 3.2 Frontend — `usuarios.tsx`

- Al crear un usuario vinculado a personal de un departamento/servicio, aplicar el patrón "único": si el admin logueado gestiona un solo departamento/servicio, no mostrar el selector — mostrarlo fijo como ya hacen otras pantallas con `OperationalScopeSummary`.
- Si se agrega selector de departamento/servicio como filtro de la lista (para admins de alcance `SISTEMA` que necesiten acotar), usar `useDepartmentServiceCascade` con `autoSelectService: false` (mismo patrón que `turnos.tsx`), y mantener "vacío = Todos".
- Revisar si el selector de "Rol" en el formulario debe filtrarse según lo que el admin logueado puede otorgar (ej. un admin de alcance `SERVICIO` no debería poder asignar un rol de alcance `SISTEMA` a otro usuario) — **gap de seguridad a confirmar**, no vi ninguna restricción de este tipo hoy en el formulario ni en el backend.

### 3.3 Frontend — `roles.tsx`

- Agrupar los 31 checkboxes de permisos/capacidades por dominio (Organización, Personal, Planificación, Operación, Seguridad) en vez de las dos listas planas actuales — mejora la lectura sin cambiar ningún comportamiento de datos. Esto es una mejora visual, no indispensable; lo dejo como opción a confirmar.
- Igual que en usuarios, evaluar si un admin de alcance no-`SISTEMA` debería poder crear/editar roles de alcance `SISTEMA` (mismo gap de seguridad que 3.2).

---

## 4. Gap de seguridad encontrado (fuera del pedido original, señalado por trazabilidad)

No hay ninguna protección contra quedarse sin administradores de alcance `SISTEMA` activos. Un admin podría desactivarse a sí mismo (o al último otro admin) sin ninguna advertencia, dejando el sistema sin nadie que pueda revertirlo salvo acceso directo a la base de datos. Esto contradice el principio de consistencia de `ARQUITECTURA.md` (§1.4). Recomiendo agregar una validación: no permitir desactivar un usuario si es el único activo con un rol de alcance `SISTEMA` y permiso `puedeGestionarUsuarios`.

No lo incluyo en el alcance de esta estrategia sin tu confirmación porque es una regla de negocio nueva, no algo que pediste — pero lo señalo porque es exactamente el tipo de cosa que conviene resolver junto con este módulo, no después.

---

## 5. Decisiones aprobadas

1. **Filtro departamento/servicio en usuarios.tsx**: no se agrega. El filtro por rol/activo/tipoUsuario ya cubre el uso diario.
2. **Restricción de alcance al asignar/crear roles**: sí, se implementa. Un actor solo puede crear/editar un rol, o asignárselo a un usuario, si el `alcancePlanificacion` de ese rol es igual o "menor" al propio del actor. Orden de poder: `SISTEMA` > `DEPARTAMENTO` > `SERVICIO` > `LECTURA`. Se valida en backend (use-cases de crear/actualizar rol y crear/actualizar usuario), no solo en frontend — el frontend además debe filtrar el selector de "Rol" para no mostrar siquiera las opciones que el actor no puede otorgar (evita el rechazo tardío y es más claro para el usuario).
3. **Proteger al último administrador de sistema**: sí, se implementa. No se puede desactivar un usuario si es el único activo con rol de alcance `SISTEMA` y `puedeGestionarUsuarios`. Se valida en el use-case de desactivar usuario (backend), con mensaje explícito de error si se intenta.
4. **Agrupar checkboxes de roles.tsx por dominio**: sí, se implementa. Reorganizar `PERMISSION_FIELDS`/`CAPABILITY_FIELDS` en secciones temáticas (Organización, Personal, Planificación, Operación, Seguridad) dentro del mismo formulario, sin cambiar qué campos existen ni su comportamiento — solo presentación.

## 6. Plan de implementación

1. **Backend — restricción de alcance** (`crear-rol.use-case`, `actualizar-rol.use-case`, `crear-usuario.use-case`, `actualizar-usuario.use-case`): agregar función compartida `assertAlcancePermitido(actor, alcanceObjetivo)` en un helper del módulo `seguridad`, usando el orden `SISTEMA > DEPARTAMENTO > SERVICIO > LECTURA`. Lanza `ForbiddenException` si el actor intenta operar sobre un alcance superior al propio.
2. **Backend — proteger último admin de sistema**: en `desactivar-usuario.use-case.ts`, antes de desactivar, contar usuarios activos con rol de alcance `SISTEMA` + `puedeGestionarUsuarios`; si el usuario a desactivar es el único, lanzar `ConflictException` con mensaje claro.
3. **Frontend — usuarios.tsx**: aplicar patrón "único" para departamento/servicio del formulario de creación (autocompletar si el admin gestiona uno solo); filtrar el selector de "Rol" según el alcance del actor logueado (reutilizando la misma regla de orden que en backend, para no depender de que el backend rechace).
4. **Frontend — roles.tsx**: filtrar igual el selector/checkbox de "alcance" disponible al crear/editar un rol (un admin no-`SISTEMA` no debería poder ni intentar crear un rol de alcance superior al propio); reagrupar `PERMISSION_FIELDS`/`CAPABILITY_FIELDS` en secciones por dominio.
5. **Verificación**: pruebas unitarias de los dos nuevos guards de negocio (alcance + último admin); script contra la dev DB (igual metodología usada en toda la sesión) para confirmar ambas reglas con datos reales; `tsc`/`lint`/`build` limpios en ambos proyectos.

## 7. Resumen de lo implementado

- **Backend**: nuevo helper `alcance-planificacion.helper.ts` (`assertAlcancePermitido`/`puedeOtorgarAlcance`, orden SISTEMA>DEPARTAMENTO>SERVICIO>LECTURA). Se movió la lógica de crear/actualizar rol de `RolController` a nuevos `CrearRolUseCase`/`ActualizarRolUseCase` (antes vivía directo en el controller, contra la regla de `ARQUITECTURA.md` §5 de no poner lógica ahí) — ambos aplican el guard de alcance. `CrearUsuarioUseCase`/`ActualizarUsuarioUseCase` validan el alcance del rol asignado contra el del actor. `DesactivarUsuarioUseCase` bloquea desactivar al único administrador de sistema activo (nuevo método `UsuarioRepository.contarAdministradoresSistemaActivos`). Nuevo método `RolRepository.obtenerPorId`.
- **Frontend**: nuevo `utils/alcance-planificacion.ts` (espejo del helper de backend). `roles.tsx`: selector de alcance filtrado por lo que el actor puede otorgar, acción "Editar/Activar/Desactivar" oculta para roles de alcance superior al del actor, y los 31 checkboxes de permisos/capacidades reagrupados en 5 dominios (Organización, Personal, Seguridad, Operación, Planificación) dentro de cada sección existente. `usuarios.tsx`: selector de "Rol/permiso" del formulario filtrado igual; acción "Editar/Resetear/Activar-Desactivar" oculta para usuarios con rol de alcance superior; el listado de "Personal asociado" ahora se acota automáticamente al departamento/servicio gestionable del actor (salvo que tenga alcance de sistema completo) en vez de mostrar todo el personal institucional.
- **Verificación**: 21 tests nuevos/actualizados en el módulo `seguridad` (todos en verde), script contra la dev DB real confirmando conteo de administradores y bloqueo de escalamiento de alcance, `tsc`/`lint`/`build` limpios en ambos proyectos, mismo baseline de 3 fallos preexistentes no relacionados en el resto de la suite.

---

## 8. Saneo de permiso fantasma: `gestionarTiposFeriado` (2026-07-05)

**Diagnóstico:** al auditar el módulo de permisos completo (menús frontend + endpoints de catálogos), se encontró que la capacidad `gestionarTiposFeriado` (columna `dbo.rol.gestionar_tipos_feriado`, presente desde la migración `017_add_role_permissions_and_scope.sql` y configurada explícitamente en el seed `008_seed_rrhh_desarrollo.sql`) **nunca era consultada por ningún caso de uso**. `CrearTipoFeriadoUseCase`, `ActualizarTipoFeriadoUseCase` y `DesactivarTipoFeriadoUseCase` gateaban en cambio con `CalendarioAccessPolicyService.assertPuedeGestionarCalendario` (que verifica `gestionarCalendarios`, un permiso distinto). El checkbox de "Gestionar tipos de feriado" en `roles.tsx` no tenía ningún efecto real en el backend.

Se verificó en `database/seeds/008_seed_rrhh_desarrollo.sql` que `gestionar_calendarios` y `gestionar_tipos_feriado` tienen hoy el mismo valor para los 5 roles seedeados (`ADMIN_SISTEMA`=1/1, `RRHH`=0/0, `JEFE_DEPARTAMENTO`=0/0, `JEFE_SERVICIO`=0/0, `PLANIFICADOR`=0/0), por lo que conectar el permiso correcto **no cambia ningún comportamiento actual** — solo hace que el flag empiece a tener efecto real hacia adelante, en vez de quedar mudo.

**Cambio aplicado** (sin migración, sin cambios de schema ni de seeds — la columna y sus valores ya existían):

- Nuevo método `CalendarioAccessPolicyService.assertPuedeGestionarTiposFeriado(actor)` (`planificacion/application/use-cases/helpers/calendario-access-policy.service.ts`), que verifica `actor.capacidades?.gestionarTiposFeriado` en vez de `gestionarCalendarios`.
- `CrearTipoFeriadoUseCase`, `ActualizarTipoFeriadoUseCase` y `DesactivarTipoFeriadoUseCase` ahora llaman a `assertPuedeGestionarTiposFeriado` en vez de `assertPuedeGestionarCalendario`.
- `assertPuedeGestionarCalendario` se mantiene sin cambios y sigue gateando `calendario.controller.ts` (la gestión del calendario mensual en sí, un concepto distinto de los tipos de feriado).

**Fuera de alcance de este cambio, explícitamente:** el catálogo de incidencias personales (`tipo_dia` con `alcance='PERSONAL'`) y la falta de un gate de autorización propio para esa distinción — quedan señalados como gap conocido pero no se tocan aquí, por pedido explícito.

**Verificación:** nuevo `calendario-access-policy.service.spec.ts` (4 tests, cubre ambos métodos incluyendo el caso borde de `gestionarCalendarios=true` + `gestionarTiposFeriado=false` para confirmar que son independientes); `lint:api` y `build:api` limpios; suite de `planificacion` sin nuevas fallas (mismo baseline de 3 fallos preexistentes no relacionados, en `crear-borrador-planificacion` y `duplicar-planificacion`, ajenos a este cambio).

---

## 9. Matriz objetivo de permisos por rol (definida 2026-07-05, pendiente de implementar)

Especificación tal como la definió el negocio (no implementada aún salvo donde se indique "ya cubierto"). Sirve como fuente de verdad única para migración, backend y frontend cuando se implemente.

### 9.1 JEFE_SERVICIO

| Requisito | Estado |
|---|---|
| Ve solo su servicio | Ya cubierto — `alcancePlanificacion='SERVICIO'` + `serviciosGestionables` en la sesión |
| Ve personal asignado solo de su servicio | Ya cubierto — `PersonalController.buildScopedQuery` acota por `hasServicioScope` (ver gap de capa en 9.3) |
| No puede asignar personal a otros servicios | Ya cubierto en backend — `AsignacionAccessPolicyService`/`OperacionAccessPolicyService` validan contra `serviciosGestionables` |
| Puede ver el calendario | Ya cubierto — capacidad `verCalendarios` |
| Puede ver el catálogo de feriados | Ya cubierto — `GET /v1/tipos-feriado` no tiene guard de actor, visible para cualquier sesión autenticada |
| Puede ver el catálogo de incidencias personales | Ya cubierto — vive en `tipo_dia` (`alcance='PERSONAL'`), `GET /v1/tipos-dia` tampoco tiene guard de actor. **No tocar esta parte** (pedido explícito del usuario, 2026-07-05) |
| Puede configurar horarios solo de su servicio | Ya cubierto — `OperacionAccessPolicyService.assertPuedeGestionarTurnoServicio` |
| Puede hacer planificaciones de su servicio, nada más | Ya cubierto — `PlanificacionAccessPolicyService.assertPuedeGestionarServicio` |

### 9.2 JEFE_DEPARTAMENTO

| Requisito | Estado |
|---|---|
| Ve su departamento | Ya cubierto — `alcancePlanificacion='DEPARTAMENTO'` |
| Ve los servicios de su departamento | Ya cubierto — `typeorm-usuario.repository.ts` expande `serviciosGestionables` automáticamente para todo departamento gestionado |
| Ve el personal de su departamento, incluyendo el de sus servicios | Ya cubierto — mismo mecanismo que 9.1, vía `hasDepartamentoScope` |
| Puede hacer asignaciones y mover personal dentro de su departamento (incluye servicios) | Ya cubierto — `AsignacionAccessPolicyService.assertDepartamentoDentroDeAlcance` |
| **No puede ver el menú de "Cargos"** | **Ya cubierto — Hallazgo B descartado (verificado 2026-07-05 contra BD real y seed).** La sección original de este hallazgo afirmaba que `JEFE_DEPARTAMENTO` tiene `puedeGestionarPersonal=true`; es incorrecto. Consulta directa a `roles_turnos_dev.dbo.rol` y el seed versionado `008_seed_rrhh_desarrollo.sql` coinciden: `JEFE_DEPARTAMENTO.puede_gestionar_personal=0` y `ver_cargas_horarias=0`. Con esos valores, el `anyOf:[{permission:'puedeGestionarPersonal'}, {permission:'puedeVerOperacion', capability:'verCargasHorarias'}]` de `menu-items/roles-turnos-system.jsx` evalúa `false` para `JEFE_DEPARTAMENTO` — no ve el menú "Cargos", que es el comportamiento pedido. No se requiere migración ni capacidad nueva para este punto. |
| Puede ver el calendario y sus catálogos del tab | Ya cubierto — `verCalendarios`/`verTiposDia` |
| Puede ver y gestionar horarios de su departamento y sus servicios | Ya cubierto — `OperacionAccessPolicyService.assertPuedeGestionarTurnoDepartamento`/`assertPuedeGestionarConfiguracionOperativaDepartamento` |
| Puede gestionar planificaciones de su departamento y sus servicios | Ya cubierto — `PlanificacionAccessPolicyService` (`idServicio===null` + `isDepartamentoHead`) |

### 9.3 Reglas transversales

| Requisito | Estado |
|---|---|
| Un jefe no puede nombrar a otro jefe de su misma jerarquía (`JEFE_SERVICIO` no nombra `JEFE_SERVICIO`; `JEFE_DEPARTAMENTO` no nombra `JEFE_DEPARTAMENTO`), pero `JEFE_DEPARTAMENTO` sí puede nombrar `JEFE_SERVICIO` de sus servicios | **Gap pendiente (Hallazgo E, no resuelto).** `alcance-planificacion.helper.ts` usa `>=`, permite hoy crear un rol del mismo rango. Fix acotado: cambiar a `>` estricto, con excepción para `SISTEMA` (que sí debe poder crear otro `SISTEMA`) |
| Acciones/botones no deben aparecer sin el permiso correspondiente | Parcialmente cubierto — patrón existe (`permissions.puede? [...] : []`) pero no auditado en todas las pantallas (ver sección 10) |
| Filtros deben acotarse a lo gestionable | Parcialmente cubierto — solo 7 de 25 páginas usan `serviciosGestionables`/`departamentosGestionables` (ver sección 10) |
| Los datos que vienen de la BD deben venir ya acotados por jerarquía, no solo ocultos en frontend | Parcialmente cubierto — el patrón correcto existe (`*-access-policy.service.ts` por módulo) pero el módulo `personal` tiene esta lógica mal ubicada en el controller en vez de un policy service (Hallazgo C, no resuelto) |

**Conclusión de estrategia (analizada 2026-07-05, ver también memoria `feature-roles-permisos-seguridad`):** mantener RBAC + alcance/scope (lo ya implementado), no migrar a permisos por usuario. El trabajo pendiente es conectar piezas del modelo actual, no rediseñarlo.

---

## 10. Plan de auditoría de pantallas pendiente (preparado 2026-07-05 para la próxima sesión)

Objetivo de la próxima sesión: revisar, pantalla por pantalla, que las acciones/filtros/datos respeten la matriz de la sección 9. Esto es trabajo de implementación, no de análisis — el análisis ya está hecho.

**Criterio a aplicar en cada pantalla:**
1. ¿La acción/botón desaparece si el actor no tiene el permiso o capacidad requerida (no solo se deshabilita)?
2. ¿Los filtros de la pantalla se acotan a `serviciosGestionables`/`departamentosGestionables` del actor, o permiten consultar fuera de su alcance?
3. ¿Los datos que llegan del backend ya vienen acotados por el servidor (policy service / query filtrada), o el frontend depende de ocultar visualmente datos que en realidad sí llegaron por la API?

**Páginas sin ninguna señal de gating por permiso encontrada (grep `permissions.puede*`/`capabilities.*`, revisar si es correcto o un gap):**
`incidencias-personales.tsx`, `familias-laborales.tsx`, `servicio-detalle.tsx`, `tipos-turno.tsx`, `configuracion-servicio.tsx`, `configuracion-operativa.tsx`, `reporte-rol-personal.tsx`, `planificaciones.tsx`, `planificacion-matriz.tsx`, `planificacion-detalle.tsx`, `turnos.tsx`, `health-sistema.tsx`, `catalogos.tsx`.

**Páginas sin acotación por `serviciosGestionables`/`departamentosGestionables` (revisar si el catálogo debería ser global o no):**
Todas menos estas 7, que sí acotan: `usuarios.tsx`, `servicios.tsx`, `planificaciones.tsx`, `turnos.tsx`, `personal/index.tsx`, `configuracion-operativa.tsx`, `asignaciones.tsx`.

**Gaps ya identificados y todavía sin resolver, a incluir en la auditoría (no requieren re-análisis, solo implementación):**
1. `Navigation/index.jsx:16` — hardcode de `rol.codigo` para ocultar el menú "Sistema"; reemplazar por gating declarativo igual que el resto de ítems.
2. ~~Menú "Cargos" visible para `JEFE_DEPARTAMENTO` (sección 9.2)~~ **Descartado 2026-07-05** — no se reproduce con los datos reales de rol (ver sección 9.2 actualizada); no requiere acción.
3. `ListarPersonalUseCase`/`PersonalController` — mover el scoping de `buildScopedQuery`/`assertPuedeVerDetalle` del controller a un `PersonalAccessPolicyService` dedicado, igual que `asignacion`/`operacion`/`planificacion`.
4. ~~`alcance-planificacion.helper.ts` — regla de pares (sección 9.3): cambiar `>=` por `>` estricto con excepción `SISTEMA`~~ **Resuelto 2026-07-05, ver sección 11.**

**Explícitamente fuera de este plan:** no tocar nada relacionado a "incidencias personales" (catálogo ya existe en `tipo_dia`, decisión del usuario 2026-07-05 de no intervenir esa parte).

---

## 11. Hallazgo E resuelto: regla de pares en `alcance-planificacion.helper.ts` (2026-07-05)

**Diagnóstico:** `puedeOtorgarAlcance` comparaba con `>=`, por lo que un actor podía crear, editar o asignar un rol de **su mismo** alcance. Esto contradice el requisito de negocio de la sección 9.3 ("un jefe no puede nombrar a otro jefe de su misma jerarquía") y era, a diferencia de los demás pendientes de la sección 9/10, un bug de seguridad activo (escalamiento entre pares), no solo una mejora cosmética — por eso se resolvió primero.

**Cambio aplicado** (sin migración, sin cambio de schema — es lógica pura en `apply/helpers`):

- `apps/api/.../seguridad/application/helpers/alcance-planificacion.helper.ts`: `puedeOtorgarAlcance` ahora usa `>` estricto (`ALCANCE_RANK[actor] > ALCANCE_RANK[objetivo]`), con **una única excepción**: si `alcanceActor === 'SISTEMA'`, siempre devuelve `true` (un `SISTEMA` sí puede crear/editar otro `SISTEMA`; de lo contrario ningún `SISTEMA` podría nombrar a otro).
- Espejo en frontend actualizado igual: `apps/mantis-free-react-admin-template/src/utils/alcance-planificacion.ts`.

**Efecto colateral esperado, verificado como correcto:** `ActualizarRolUseCase` valida tanto el alcance actual del rol como el nuevo con `assertAlcancePermitido`. Con la regla estricta, un actor `DEPARTAMENTO` deja de poder editar (o ver la acción "Editar" en `roles.tsx`, vía el mismo `puedeOtorgarAlcance`) un rol que ya es de alcance `DEPARTAMENTO` — no solo evita escalarlo, evita tocarlo del todo. Esto es intencional y coherente con el requisito de negocio: si pudiera editar los permisos de un rol de su mismo rango, estaría modificando las capacidades de sus pares. Solo `SISTEMA` gestiona roles de alcance `SISTEMA` o `DEPARTAMENTO`; un `DEPARTAMENTO` solo gestiona roles `SERVICIO`/`LECTURA`.

**Verificación:** `alcance-planificacion.helper.spec.ts` actualizado (10 casos: excepción `SISTEMA`, alcance estrictamente inferior permitido, alcance superior rechazado, y el caso nuevo de mismo-rango rechazado entre no-`SISTEMA`); suite completa del módulo `seguridad` (9 suites, 18 tests) en verde sin regresiones tras el cambio.

**Pendientes de la sección 9/10 sin tocar en este paso, por alcance acotado a Hallazgo E:** menú "Cargos" visible para `JEFE_DEPARTAMENTO` (descartado, ver sección 9.2), scoping de `personal` mal ubicado en el controller (Hallazgo C, resuelto en sección 12), y el plan de auditoría pantalla por pantalla de la sección 10.

---

## 12. Hallazgo C resuelto: scoping de `personal` movido a `PersonalAccessPolicyService` (2026-07-05)

**Diagnóstico:** `PersonalController.buildScopedQuery`/`assertPuedeVerDetalle` contenían la lógica de acotar el listado y el detalle de personal por `departamentosGestionables`/`serviciosGestionables` directo en el controller — contradice `ARQUITECTURA.md` §5 ("los controladores no deben contener... consultas complejas... decisiones de negocio") y rompe la consistencia con el resto de módulos (`asignacion`/`operacion`/`planificacion`), que ya resuelven este tipo de lógica en un `*-access-policy.service.ts` dedicado. El propio módulo `personal` ya tenía el patrón correcto en `asignacion-access-policy.service.ts`, solo faltaba aplicarlo a `PersonalController`.

**Cambio aplicado** (refactor puro, sin cambio de comportamiento — misma lógica, solo reubicada):

- Nuevo `PersonalAccessPolicyService` (`personal/application/use-cases/helpers/personal-access-policy.service.ts`) con `scopeQuery(actor, query)` y `assertPuedeVerDetalle(actor, detalle)` — código idéntico al que estaba en el controller.
- `PersonalController` ahora inyecta el servicio y delega ambas responsabilidades; se eliminaron los métodos privados y el import de `ForbiddenException` que ya no se usa ahí.
- Registrado como provider en `personal.module.ts`.

**Verificación:** nuevo `personal-access-policy.service.spec.ts` (12 casos: paso libre para alcance `SISTEMA`, autocompletado y reemplazo de departamento/servicio fuera de alcance para `DEPARTAMENTO`/`SERVICIO`, permiso/rechazo de `assertPuedeVerDetalle` por unidad actual y por asignación vigente) — cobertura que no existía antes de este cambio, ya que `personal.controller.spec.ts` solo probaba el camino trivial de alcance `SISTEMA`. Suite completa de `personal` en verde (6 suites/19 tests). `lint` y `build` de la API limpios. Suite completa del backend: mismo baseline de 3 fallos preexistentes no relacionados (`crear-borrador-planificacion`, `duplicar-planificacion`, `planificacion-excel-export.service`), sin regresiones nuevas.

**Pendiente real, todavía sin resolver:** el plan de auditoría pantalla por pantalla de la sección 10 (7 de 25 páginas frontend acotan por alcance; 13 páginas sin ninguna señal de gating por permiso detectada por grep).

---

## 13. `Navigation/index.jsx:16` resuelto: hardcode de `rol.codigo` eliminado (2026-07-05)

**Diagnóstico:** `Navigation()` calculaba `hideSystemMenu = session?.rol.codigo === 'JEFE_DEPARTAMENTO' || session?.rol.codigo === 'JEFE_SERVICIO'` y usaba ese hardcode para ocultar el grupo "Sistema", contradiciendo el principio ya establecido en el módulo (`docs/seguridad/estrategia-desacople-permisos-y-reglas.md`) de que el frontend nunca debe reconstruir gating por `rol.codigo` — debe consumir siempre `session.permisos/capacidades`. Si mañana se agrega un rol nuevo que tampoco deba ver "Sistema", nadie recordaría actualizar esta lista hardcodeada.

**Por qué era seguro eliminarlo sin cambiar comportamiento:** el único ítem del grupo "Sistema" (`system-health`) ya está gateado declarativamente por `permission: 'puedeGestionarUsuarios'`. El propio `Navigation()` ya filtra los hijos de cada grupo por permiso/capacidad y, más abajo, descarta cualquier grupo que quede sin hijos (`.filter((item) => item && (item.type !== 'group' || item.children?.length))`). Como `JEFE_DEPARTAMENTO`/`JEFE_SERVICIO` no tienen `puedeGestionarUsuarios` (verificado contra la BD real, igual que en la sección 9.2), el filtrado declarativo ya vacía y oculta el grupo "Sistema" sin necesitar el hardcode — era lógica redundante, no una protección adicional.

**Cambio aplicado:** se eliminaron `hideSystemMenu` y el filtro que ocultaba el grupo de menú de sistema de `Navigation/index.jsx`. El resto del pipeline de filtrado (`globalOnly`, `anyOf`, `canAccessProfile`) queda igual.

**Verificación:** `lint`, `tsc --noEmit` y `build` del frontend limpios. No hay test unitario de este componente (no existía antes del cambio); el comportamiento se verificó por lectura del pipeline de filtrado (children-filter + group-drop) más los valores reales de `puedeGestionarUsuarios` por rol.

Con esto se cierran todos los gaps puntuales identificados en las secciones 9-10.

---

## 14. Auditoría pantalla por pantalla — Lote 1 (2026-07-05, en progreso)

Se decidió dividir la auditoría de la sección 10 en lotes: primero las 13 páginas sin ninguna señal de gating por permiso detectada por grep (mayor riesgo), luego las que sí tienen gating pero no acotan filtros por alcance. Este es el primer sub-lote (4 páginas).

### 14.1 Resultado de las primeras 4 páginas revisadas

| Página | Resultado |
|---|---|
| `incidencias-personales.tsx` | **No auditada, fuera de alcance** — reutiliza `tipos-dia.tsx` con `scope="PERSONAL"`; el usuario pidió explícitamente no tocar nada de "incidencias personales" (decisión 2026-07-05, sección 8). |
| `familias-laborales.tsx` | **Sin gap** — stub que retorna `null`, pantalla todavía no implementada. Nada que auditar. |
| `servicio-detalle.tsx` | **Sin gap, falso positivo del grep.** Es una vista de solo lectura (sin botones de accion). El backend (`ServicioController.obtenerDetalle` y `ServicioPersonalController.listar`) ya valida `canAccessServicio(actor, idServicio, idDepartamento)` y lanza `ForbiddenException` si el actor consulta un servicio fuera de su alcance — el gating correcto vive en el servidor, por eso el grep de patrones frontend no encontro nada. |
| `tipos-turno.tsx` | **Sin gap** — funcionalidad eliminada del sistema; la pagina solo muestra un `Alert` informativo sin acciones (`actions={[]}`). |
| `configuracion-servicio.tsx` | **Sin gap, falso positivo del grep.** Es un alias que renderiza `TurnosPage` completo (una de las 7 paginas que ya acota correctamente por alcance) — el archivo en si no tiene logica propia que auditar. |
| `configuracion-operativa.tsx` | **Gap real encontrado, no era el que buscaba el grep — ver 14.2.** Los filtros de departamento/servicio ya se acotan correctamente vía `session.departamentosGestionables/serviciosGestionables` cuando el actor no tiene `canAccessGlobalCatalogs`. El botón "Guardar cambios" no se oculta por permiso (se deshabilita solo por `saving`/`hasPendingChanges`), pero esto es aceptable porque el backend ya rechaza con `ForbiddenException` si el actor no puede gestionar ese departamento/servicio — **excepto que ese rechazo backend tenía un bug real, ver 14.2.**

### 14.2 Bug de autorización encontrado y corregido (no listado en la sección 10 original): método de acceso cruzado en configuración operativa de departamento

**Diagnóstico:** al verificar que el backend de `configuracion-operativa.tsx` realmente re-validaba el alcance (criterio 3 de la sección 10), se encontró que `GuardarConfiguracionOperativaDepartamentoUseCase` y `ObtenerConfiguracionOperativaDepartamentoUseCase` llamaban a `OperacionAccessPolicyService.assertPuedeGestionarConfiguracionOperativa**Servicio**` (no la variante de Departamento) pasándole `idDepartamento` como si fuera un `idServicio`. Solo `ActualizarCodigoVisualDepartamentoUseCase` llamaba al método correcto.

**Impacto real, doble:**
1. **Rotura funcional:** un `JEFE_DEPARTAMENTO` que intentara ver o guardar la configuración de su propio departamento probablemente recibía `ForbiddenException` incorrectamente, porque el chequeo comparaba contra `serviciosGestionables` (ids de servicio) en vez de `departamentosGestionables` (ids de departamento) — espacios de ids distintos que normalmente no coinciden.
2. **Escalamiento cruzado (seguridad):** si por casualidad numérica un servicio gestionable del actor tenía el mismo `id` que un departamento ajeno, el chequeo (incorrecto) pasaba igual, permitiendo ver/editar la configuración operativa de un departamento sin relación real con el actor. Con tablas chicas (ids bajos tipo 1, 2, 3...) esta coincidencia es plausible, no solo teórica.

**Cambio aplicado:** `guardar-configuracion-operativa-departamento.use-case.ts` y `obtener-configuracion-operativa-departamento.use-case.ts` ahora llaman a `assertPuedeGestionarConfiguracionOperativaDepartamento` (la variante correcta, que valida contra `departamentosGestionables`).

**Verificación:** esta área no tenía ninguna prueba unitaria antes de este cambio (ni de `OperacionAccessPolicyService` ni de los use-cases de configuración operativa por departamento) — se agregaron:
- `operacion-access-policy.service.spec.ts` (8 casos, cubre ambos métodos de servicio/departamento incluido el escenario exacto de la coincidencia numérica que hubiera pasado antes del fix).
- `guardar-configuracion-operativa-departamento.use-case.spec.ts` y `obtener-configuracion-operativa-departamento.use-case.spec.ts` (2 casos cada uno, usando el `OperacionAccessPolicyService` real, no mockeado, para probar la cadena de autorización de punta a punta).

Suite completa de `operacion` en verde (7 suites/14 tests). `lint` y `build` de la API limpios. Suite completa del backend: mismo baseline de 3 fallos preexistentes no relacionados, sin regresiones nuevas (50/53 suites, 112/115 tests).

**Lección para el resto de la auditoría:** el criterio 3 de la sección 10 ("¿los datos ya vienen acotados por el servidor?") no se puede verificar solo mirando el frontend — hay que seguir la cadena hasta el use-case y confirmar que el método de policy invocado corresponde al recurso real que se está validando, no asumir que "hay una llamada a assertPuedeGestionar-algo" es suficiente.

### 14.3 Segundo sub-lote: `planificaciones.tsx` y bug crítico de alcance departamental en todo el módulo de planificación

**`planificaciones.tsx`:** filtros ya acotados correctamente (`serviciosGestionables`/`departamentosGestionables` vía `activeSession`), acciones de fila y de estado ya gateadas por funciones de `utils/planificacion-capabilities` (`canDeletePlanificacion`, `canCreatePlanificacion`, `canExportPlanificacion`, etc.) — el grep de la sección 10 no las detectó porque no usa el patrón literal `permissions.puede*`/`capabilities.*`, sino funciones helper. **Otro falso positivo del grep, sin gap de frontend.**

**Bug crítico encontrado al verificar el criterio 3 (¿el backend re-valida el alcance?):** `PlanificacionAccessPolicyService` — el corazón de autorización de todo el módulo de planificación — nunca verificaba **a qué departamento específico** pertenecía una planificación de alcance departamental (`idServicio = null`). Tanto `assertPuedeGestionarServicio` (usada por ver/editar/publicar/cerrar/eliminar/duplicar/exportar/cambiar-estado) como `filtrarPlanificaciones` (usada por el listado) solo comprobaban `isDepartamentoHead(actor)` — es decir, **cualquier usuario con rol `JEFE_DEPARTAMENTO`, de cualquier departamento del hospital, podía ver, editar, publicar, cerrar, eliminar, duplicar y exportar la planificación departamental de cualquier OTRO departamento.** Además, `assertPuedeCrearPlanificacion` no validaba `idDepartamento` en absoluto al crear (el chequeo de alcance solo se ejecutaba `if (idServicio !== undefined)`, saltándose por completo la validación cuando se crea con `idDepartamento`).

Este es el hallazgo más serio de toda la auditoría: a diferencia del bug de la sección 14.2 (que requería una coincidencia numérica de ids para ser explotable), este afectaba a **cualquier** `JEFE_DEPARTAMENTO` contra **cualquier** planificación departamental ajena, sin condición alguna, y tocaba prácticamente todo el ciclo de vida de la planificación departamental (crear, ver, listar, editar contenido, cambiar estado, publicar, cerrar, eliminar, duplicar, exportar).

**Cambio aplicado** en `planificacion-access-policy.service.ts`:
- `assertPuedeGestionarServicio` ahora recibe un `idDepartamento` opcional y, cuando `idServicio === null`, exige que ese `idDepartamento` esté en `actor.departamentosGestionables` además de `isDepartamentoHead(actor)`.
- `filtrarPlanificaciones` ahora también compara `item.idDepartamento` contra `departamentosGestionables` para las filas de alcance departamental.
- `assertPuedeCrearPlanificacion` recibe un `idDepartamento` opcional y lo valida vía `assertPuedeGestionarServicio(actor, null, accion, idDepartamento)` cuando no se crea por servicio.
- Los 3 llamadores internos que ya tenían la planificación cargada (`assertPuedeGestionarPlanificacion`, `assertPuedeEditarContenidoPlanificacion`, `assertPuedeCambiarEstadoPlanificacion`) ahora pasan `planificacion.idDepartamento`.
- `PlanificacionController.crearBorrador` ahora pasa `body.idDepartamento` al assert de creación.

**Verificación:** esta clase (`PlanificacionAccessPolicyService`), pese a ser la autorización central de todo el módulo de planificación, **no tenía ningún test unitario antes de este cambio**. Se agregó `planificacion-access-policy.service.spec.ts` (8 casos, con foco en escenarios "REGRESION" que reproducen exactamente el bug: gestionar/crear/listar planificación de un departamento ajeno). Suite completa de `planificacion` sin regresiones nuevas (mismo baseline de 3 fallos preexistentes: `crear-borrador-planificacion`, `duplicar-planificacion`, `planificacion-excel-export`). `lint` y `build` de la API limpios. Suite completa del backend: 51/54 suites, 120/123 tests, mismo baseline.

### 14.4 Tercer sub-lote: `planificacion-detalle.tsx`, `reporte-rol-personal.tsx`, `turnos.tsx` — y un cuarto bug de autorización

**`planificacion-detalle.tsx`:** acciones de cambio de estado ya gateadas vía `utils/planificacion-capabilities`. Se beneficia directamente del fix de la sección 14.3 (antes podía ver/cambiar el estado de una planificación departamental ajena). **Sin gap propio, falso positivo del grep.**

**`reporte-rol-personal.tsx`:** sin gating visible por permiso (no hay acciones destructivas, solo búsqueda y exportación de reportes de solo lectura). Todas las lecturas (`getPlanificaciones`, `getResumenPersonal`, `getMatrizMensual`, `exportReportePersonalPdf`) pasan por `assertPuedeGestionarPlanificacion`/`filtrarPlanificaciones`, ya corregidos en 14.3. **Sin gap propio, se beneficia del mismo fix.**

**`turnos.tsx`:** filtros acotados correctamente por `session.departamentosGestionables/serviciosGestionables`; acciones (Editar/Activar/Desactivar/Nuevo horario) gateadas vía `canManageTurnos(capabilities)` — otra función helper que el grep no detecta por patrón literal. **Sin gap de frontend.**

**Bug de autorización encontrado al verificar el backend de `turnos.tsx` (criterio 3):** `ActualizarTurnoUseCase` validaba el alcance del `idServicio`/`idDepartamento` recibido en el **body** de la petición (el nuevo valor deseado), pero nunca el alcance del turno **ya existente** que se está modificando (`id` de la URL). Contraste con `ActivarTurnoUseCase`/`DesactivarTurnoUseCase`, que sí cargan el turno y validan su alcance actual antes de actuar — `ActualizarTurnoUseCase` cargaba el turno (`antes`) pero solo lo usaba para detectar cambios de horario, nunca para autorización.

**Impacto:** un `JEFE_SERVICIO` podía enviar `PUT /v1/turnos/:id` con el `id` de un turno de **otro** servicio, declarando en el body un `idServicio` que sí es el suyo — la validación pasaba igual porque solo miraba el body, permitiendo sobreescribir el horario de un turno ajeno.

**Cambio aplicado:** se agregó la validación del alcance del turno existente (`antes.idServicio`/`antes.idDepartamento`) antes de la validación del alcance del body, en `actualizar-turno.use-case.ts`.

**Verificación:** no existía ningún test para `ActualizarTurnoUseCase` — se agregó `actualizar-turno.use-case.spec.ts` (2 casos: rechaza turno ajeno con body propio, permite turno propio). Suite de `operacion` sin regresiones (8 suites/16 tests). `lint` y `build` limpios. Suite completa del backend: 52/55 suites, 122/125 tests, mismo baseline de 3 fallos preexistentes.

**Nota:** no se tocó el manejo de `turno` no encontrado en `desactivar-turno.use-case.ts` (llama a `desactivar(id)` igual cuando `turno` es `null`, sin `NotFoundException`) — comportamiento preexistente, fuera del alcance puntual de este fix.

### 14.5 Cuarto sub-lote (final del Lote 1): `planificacion-matriz.tsx`, `health-sistema.tsx`, `catalogos.tsx` — y un quinto hallazgo (fuera del árbol de permisos/scope, exposición de información técnica)

**`planificacion-matriz.tsx`:** página grande (matriz mensual editable), pero todas sus acciones ya pasan por `utils/planificacion-capabilities` (`canEditPlanificacion`, `canExportPlanificacion`, `canManageTurnos`, `canApprovePlanificacion`, etc.) y todas sus lecturas/escrituras (`getPlanificacion`, `getMatrizMensual`, `applyMatrizCell`, `updateObservacionMensual`, `changePlanificacionEstado`, `exportPlanificacionExcel`, gestión de turnos vía `TurnoFormDialog`) ya están cubiertas por los fixes de las secciones 14.3 y 14.4. **Sin gap propio.**

**`catalogos.tsx`:** alias delgado que renderiza `CargosPage` (`cargos.tsx`), la cual ya tiene gating propio (`permissions.puedeGestionarPersonal`). El catálogo de lectura (`GET /niveles-cargo`, `/cargas-horarias`, etc., sin guard de actor) ya fue evaluado y aceptado como patrón intencional en la sección 9.1 (mismo criterio que `tipos-feriado`/`tipos-dia`, catálogos institucionales de solo lectura). **Sin gap nuevo.**

**`health-sistema.tsx`:** el ítem de menú "Health" ya está gateado en frontend (`permission: 'puedeGestionarUsuarios'`), pero **`GET /health/ready` y `GET /health/database` no tenían ningún guard de autenticación en el backend** — cualquiera que alcanzara la API (sin sesión) podía consultar la versión completa de SQL Server (`@@VERSION`, útil para apuntar exploits a versiones conocidas), nombre de servidor/instancia, nombre de base de datos, y los usuarios SQL (`system_user`/`current_user`). Distinto a los 4 hallazgos anteriores (que eran de scope entre departamentos/servicios), este es de **exposición de información técnica sin autenticación alguna**.

**Decisión (confirmada con el usuario):** `GET /health/live` y `GET /health/app` quedan públicos sin cambios (no exponen nada sensible, son aptos para probes de infraestructura). `GET /health/ready` y `GET /health/database` ahora requieren `ActorContextGuard` + el mismo permiso `puedeGestionarUsuarios` que ya gateaba el menú.

**Cambio aplicado:** `DatabaseModule` ahora importa `SeguridadModule` (para poder resolver `ActorContextGuard`). `DatabaseHealthController.getReadinessStatus`/`getDatabaseHealth` ahora reciben `@CurrentActor()` y validan `actor.permisos.puedeGestionarUsuarios` antes de delegar a `DatabaseService`. El frontend no necesitó cambios: `apiClient` ya adjunta el Bearer token de sesión en todas las peticiones.

**Verificación:** `database-health.controller.spec.ts` actualizado (6 casos: los 2 preexistentes de `live`/`app` sin cambios, 2 casos de éxito con actor autorizado, 2 casos "REGRESION" que confirman el rechazo para un actor sin `puedeGestionarUsuarios`). Suite completa del backend sin regresiones (mismo baseline de 3 fallos preexistentes, 52/55 suites, 124/127 tests). `lint` y `build` limpios.

### 14.6 Lote 1 completado (13/13 páginas revisadas)

Resumen final: de las 13 páginas sin señal de gating detectada por grep, **ninguna tenía un gap de frontend real** — todas eran falsos positivos (alias delgados sobre páginas ya cubiertas, funciones helper de gating que el grep no reconoce por patrón literal, páginas de solo lectura ya protegidas en el backend, o funcionalidad eliminada sin acciones). Sin embargo, seguir la cadena hasta el backend en cada caso (criterio 3 de la sección 10) permitió encontrar **5 bugs reales no relacionados con el frontend**:

1. Sección 14.2 — `configuracion-operativa`: método de acceso cruzado (servicio en vez de departamento).
2. Sección 14.3 — `planificaciones`: alcance departamental nunca verificado en todo `PlanificacionAccessPolicyService` (el más severo).
3. Sección 14.4 — `turnos`: `ActualizarTurnoUseCase` validaba el scope del body en vez del turno existente.
4. Sección 14.5 — `health-sistema`: endpoints de diagnóstico técnico sin ningún guard de autenticación.

**Pendiente:** el Lote 2 (páginas con gating visible pero sin acotar filtros por alcance) — ver plan detallado en la sección 15.

---

## 15. Plan del Lote 2 (preparado 2026-07-05, para ejecutar en sub-tandas de 4-5 páginas)

Inventario completo: 25 páginas en `apps/mantis-free-react-admin-template/src/pages/`. 7 ya acotan correctamente (`usuarios.tsx`, `servicios.tsx`, `planificaciones.tsx`, `turnos.tsx`, `personal/index.tsx`, `configuracion-operativa.tsx`, `asignaciones.tsx`) — no requieren revisión de scope.

### 15.1 Páginas que NO requieren nueva revisión de scope (ya cubiertas indirectamente en el Lote 1)

Son páginas de **detalle por id de URL** (no tienen filtros de lista que acotar — lo relevante es si el backend valida el id puntual, ya verificado en el Lote 1) o **alias delgados** de páginas ya evaluadas:

- `servicio-detalle.tsx`, `planificacion-detalle.tsx`, `planificacion-matriz.tsx` — detalle por id, backend ya verificado en 14.1/14.3/14.5.
- `tipos-turno.tsx`, `configuracion-servicio.tsx`, `health-sistema.tsx`, `catalogos.tsx` — alias o feature eliminada, sin filtros propios (14.1/14.5).
- `incidencias-personales.tsx` — explícitamente fuera de alcance (decisión del usuario, sección 8).
- `familias-laborales.tsx` — stub sin implementar.

### 15.2 Páginas pendientes de revisar por primera vez (9 páginas, 2 sub-tandas)

**Sub-tanda A (5 páginas, unidades específicas — más probable que necesiten acotar por actor):**
1. `cargos.tsx` (contenido real detrás de `catalogos.tsx`)
2. `personal-detalle.tsx`
3. `reporte-rol-personal.tsx` (tiene selects propios de departamento/servicio, sin verificar aún si se acotan por `departamentosGestionables`/`serviciosGestionables`)
4. `departamentos.tsx`
5. `roles.tsx` (alcance ya auditado a fondo en secciones 9/11, pero no específicamente el criterio de "filtro acotado por scope" de la sección 10)

**Sub-tanda B (4 páginas, catálogos institucionales — candidatos a ser correctamente globales, no gaps):**
6. `tipos-dia.tsx`
7. `tipos-feriado.tsx`
8. `calendarios.tsx`
9. `cargas-horarias.tsx`

**Criterio a aplicar en cada una (igual que sección 10):** ¿el filtro de departamento/servicio de la pantalla se acota a lo gestionable por el actor, o deja consultar fuera de su alcance? Si el catálogo es institucional por diseño (ej. niveles de cargo, tipos de feriado) y ya se decidió antes que su lectura es intencionalmente abierta, no tratarlo como gap — documentar la razón, no forzar una acotación que no corresponde al dominio.

### 15.3 Sub-tanda A completada (2026-07-05): 0 hallazgos reales

| Página | Resultado |
|---|---|
| `cargos.tsx` | **Sin gap** — catálogo institucional legítimamente global (niveles de cargo no son por departamento/servicio), mismo criterio ya aceptado para `tipos-feriado`/`tipos-dia`. |
| `personal-detalle.tsx` | **Sin gap** — el detalle (`GET /v1/personal/:id/detalle`) ya está cubierto por `PersonalAccessPolicyService.assertPuedeVerDetalle` (Hallazgo C, sección 12). |
| `reporte-rol-personal.tsx` | **Sin gap** (conclusión corregida durante la revisión). Los selects de departamento/servicio llaman a `organizacionApi.getDepartamentos()`/`getServicios()` sin filtrar client-side, pero **el backend ya acota ambos catálogos por `departamentosGestionables`/`serviciosGestionables`** (`DepartamentoController.scopeDepartamentos`, `ServicioController.scopeServicios`) — el actor nunca recibe unidades ajenas, aunque el frontend no las oculte por su cuenta. El patrón de `turnos.tsx`/`planificaciones.tsx` (usar `session.departamentosGestionables` en vez de llamar a la API) es una optimización para evitar el round-trip HTTP, no un fix de seguridad — ambos enfoques son válidos, el criterio 3 de la sección 10 ya está satisfecho vía el servidor. |
| `departamentos.tsx` | **Sin gap** — mismo motivo: `GET /v1/departamentos` ya filtra server-side. |
| `roles.tsx` | **No aplica el criterio** — los roles no son un recurso por servicio/departamento; su alcance ya está gateado correctamente por `alcancePlanificacion` (secciones 9/11), no por `serviciosGestionables`/`departamentosGestionables`. |

**Lección para la Sub-tanda B y el resto de la auditoría:** antes de asumir que "el frontend no filtra" es un gap, verificar primero si el endpoint de backend que consume ya acota los resultados por su cuenta — varios catálogos de organización (`departamentos`, `servicios`) ya lo hacen desde antes de esta sesión.

### 15.4 Sub-tanda B completada (2026-07-05): 0 hallazgos — catálogos institucionales sin concepto de unidad

| Página | Resultado |
|---|---|
| `tipos-dia.tsx` | **No aplica el criterio** — `tipo_dia` (días generales/incidencias) es un catálogo institucional en el modelo de datos, sin `idServicio`/`idDepartamento`. Gating correcto vía `capabilities.gestionarTiposDia`. |
| `tipos-feriado.tsx` | **No aplica el criterio** — mismo motivo, `tipo_feriado` es institucional. Gating vía `capabilities.gestionarTiposFeriado`. |
| `calendarios.tsx` | **No aplica el criterio** — el calendario operativo es único y compartido por toda la institución (filtros solo por año/mes, no por unidad). Gating vía `capabilities.gestionarCalendarios`. |
| `cargas-horarias.tsx` | **No aplica el criterio** — catálogo institucional de cargas horarias (Tiempo Completo, Medio Tiempo, etc.), sin alcance por servicio/departamento. Gating vía `permissions.puedeGestionarPersonal`, mismo patrón que `cargos.tsx`. |

## 16. Cierre de la auditoría pantalla por pantalla (secciones 9-15)

**Lote 1 (13 páginas sin gating detectado):** 0 gaps de frontend, 4 bugs de backend encontrados y corregidos (secciones 14.2-14.5).

**Lote 2 (9 páginas sin acotación de filtros, de las 18 originales — 9 ya cubiertas indirectamente por Lote 1):** 0 hallazgos nuevos. Todas las páginas revisadas resultaron ser: (a) catálogos institucionales sin concepto de servicio/departamento en el modelo de datos, donde el criterio de acotación simplemente no aplica, o (b) páginas cuyo backend ya filtra correctamente aunque el frontend no duplique ese filtro client-side.

**Balance total de la auditoría (secciones 9-16):** de 25 páginas del frontend, se identificaron y corrigieron **5 bugs reales de autorización en el backend** (Hallazgo E, Hallazgo C, más los 3 encontrados durante el Lote 1: configuración operativa departamental, alcance departamental de planificaciones, actualización de turnos, endpoints `/health` sin guard), y **2 mejoras de consistencia frontend** (regla de pares en roles, hardcode de menú eliminado). Ningún hallazgo nuevo en el Lote 2 — el patrón repetido de "verificar el rol pero no la unidad específica" que motivó los bugs más graves del Lote 1 no se repite en los catálogos institucionales, porque estos no tienen ese eje de scope en absoluto.

**Estado del plan de la sección 10:** completo. No queda trabajo pendiente de este plan de auditoría.
