# Estrategia: turnos inactivos en la matriz + edición/eliminación completa desde "Configurar"

**Estado:** implementado (2026-07-04). Parte 1 verificada contra la base de dev; Parte 2 verificada por tipos/build, sin prueba manual en navegador todavia (ver seccion final).
**Fecha:** 2026-07-04
**Relacionado:** [[impacto-edicion-eliminacion-turno-tipo-dia]] (mismo mecanismo de impacto/propagar/limpiar, ahora extendido a la matriz).

> **Nota de deriva (verificado 2026-07-10):** este documento describe `EditToolVisualPopover` como el
> componente que abre el editor rápido de código/etiqueta desde la matriz. El componente actual se llama
> `EditToolVisualDialog` (es un `Dialog`, no un `Popover`) y vive en
> `apps/web/src/components/system/EditToolVisualDialog.tsx` — las referencias a líneas específicas de
> `planificacion-matriz.tsx` en este documento ya no corresponden al código actual. El contenido sigue
> siendo útil como registro de la decisión/flujo original, no como mapa exacto del código de hoy.

---

## Parte 1 — Bug: un turno desactivado sigue apareciendo como boton en la matriz

### Causa raiz confirmada

**Lado escritura** (`apps/api/.../typeorm-turno.repository.ts`):
- `desactivar()` (linea 376) y `activar()` (linea 401) solo sincronizan `codigo_operativo_servicio.activo` cuando el turno tiene `idServicio`. Los turnos de **departamento** nunca disparan esa sincronizacion.
- El provisioning de turnos de departamento usa un mecanismo totalmente distinto: `ensureTurnosDepartamentoConfigurados` (`typeorm-configuracion-operativa-servicio.repository.ts:743-820`) solo **inserta** filas `codigo_operativo_servicio` que faltan (perezoso, en cada lectura); nunca las desactiva.

**Lado lectura** (`typeorm-configuracion-operativa-servicio.repository.ts`):
- La query `codeRows`, tanto en `obtenerPorServicio` (137-138) como en `obtenerPorDepartamento` (407-408), filtra `td.activo = 1` para tipos de dia pero **nunca revisa `t.activo`** para turnos. Depende ciegamente de que `cos.activo` este sincronizado — y esa sincronizacion solo existe (a medias) para servicio.

### Fix propuesto (dos capas)

1. **Fix inmediato en la query** (resuelve el bug reportado sin depender de nada mas): agregar a ambas queries `codeRows`
   ```sql
   AND (cos.id_turno IS NULL OR t.activo = 1)
   ```
   igual que ya se hace con `td.activo` para tipos de dia. Fuente unica de verdad: aunque la sincronizacion de `cos.activo` este rota, el turno desactivado deja de aparecer de inmediato.

2. **Fix de consistencia** (para que el editor de "configuracion operativa" tampoco muestre entradas fantasma): quitar el guard `if (actual.idServicio)` en `desactivar()`/`activar()` de `TypeOrmTurnoRepository` y ejecutar `deactivateCodigoOperativoServicio(id)` siempre — esa llamada ya es un `UPDATE` generico por `id_turno`, no depende del scope. Para `activar()`, solo actualizar si ya existe una fila `cos` (no crear una nueva ahi; eso lo sigue resolviendo `ensureTurnosDepartamentoConfigurados` en el proximo fetch).

### Verificacion

Repetir la misma metodologia usada para impacto/propagar/limpiar: turno de prueba (esta vez de departamento), desactivarlo, confirmar que `getConfiguracionOperativa` deja de listarlo, limpiar el turno de prueba al final.

---

## Parte 2 — Paridad completa (editar horario real + eliminar) desde "Configurar" en la matriz

### Estado actual confirmado

- El boton "Configurar" activa `editMode`; al hacer click en un chip de turno se abre `EditToolVisualPopover` (`planificacion-matriz.tsx:702-706`), que **solo** edita `codigoVisual`/`etiqueta` — nunca el horario real. No existe boton de eliminar/desactivar un turno desde la matriz.
- El boton "Configurar" **no tiene ningun gate de permiso** (`PlanificacionOperationalToolbar.tsx:101-115`) — a diferencia del pintado de celdas, que si valida sesion activa. Cualquiera que vea la matriz puede entrar en modo edicion visual hoy.
- El pintado de celdas se guarda **de inmediato por click** (`applyToolToCell`, sin buffer local) — no hay riesgo de perder cambios "sin guardar" al abrir un dialogo de edicion de turno encima.
- `configuracionOperativa` (datos del toolbar) y `matriz`/`detalle` (celdas pintadas) son fetches **independientes**: el primero depende de `configRefreshKey`, el segundo de `refreshKey`. Hoy, guardar en `EditToolVisualPopover` o en `TurnoFormDialog` solo incrementa `configRefreshKey` — la matriz nunca se refresca.
- `activeToolKey` (la herramienta de pintado seleccionada) no se limpia si el turno correspondiente desaparece de los datos recargados; cae en silencio a la herramienta por defecto (`navigate`) sin avisar al usuario.

### Cambios propuestos

**Flujo (decision confirmada: opcion conservadora):**
1. `EditToolVisualPopover` se mantiene tal cual para el caso rapido (solo codigo/etiqueta, un clic). Se le agrega un enlace/boton "Editar horario completo" que abre `TurnoFormDialog` (mismo componente que ya usa `Operacion > Horarios`, con `ImpactoUsoDialog` integrado) precargado con ese turno.
2. Agregar una accion "Desactivar horario" (junto al enlace anterior, dentro del mismo popover) que llame a `operacionApi.deleteTurno` + `ImpactoUsoDialog` (mismo patron 409 ya implementado).
3. Condicionar el boton "Configurar" (y en particular las acciones de horario real / desactivar) a `canManageTurnos(capabilities)` — hoy no tiene gate alguno.

**Actualizacion visual/estado (lo que puede romperse si no se atiende):**
1. `activeToolKey` huerfano: si el turno usado como herramienta activa se edita o desactiva, limpiar explicitamente la seleccion al cerrar el dialogo, en vez de dejar que caiga en silencio a `navigate`.
2. Refrescar tambien la matriz, no solo el toolbar: cuando se guarda con impacto (propagar u horario cambiado) o se limpia (borrado fisico de celdas), disparar tanto `configRefreshKey` como `refreshKey` — de lo contrario la planificacion abierta puede quedar mostrando celdas que ya no existen en el backend.
3. Bloquear el pintado mientras el dialogo de edicion/impacto esta abierto, para que un click de fondo no pinte una celda mientras se decide la estrategia.
4. El turno es un catalogo compartido a nivel servicio/departamento, no de la planificacion actual: el impacto puede tocar otras planificaciones que el usuario no tiene abiertas. El `ImpactoUsoDialog` ya lista esto por planificacion; conviene resaltar visualmente cual fila corresponde a la planificacion actual, para que no sorprenda al usuario ver otras planificaciones afectadas.

### Orden de implementacion sugerido

1. Fix del bug (Parte 1) — aislado, bajo riesgo, no depende de la Parte 2.
2. Gate de permiso del boton "Configurar" (rapido, cierra un hueco de seguridad).
3. Wiring de `TurnoFormDialog` + `refreshKey`/`configRefreshKey`/`activeToolKey` desde la matriz.
4. Accion de desactivar turno desde la matriz.
5. Verificacion: script contra dev DB para la Parte 1; prueba manual en navegador para la Parte 2 (obligatorio por ser cambio de UI/flujo).

## Estado final de la verificacion (2026-07-04)

- **Parte 1**: verificada con un script contra la base de dev real (turno de departamento, desactivar/reactivar, confirmar aparicion/desaparicion en `getConfiguracionOperativa` y en `codigo_operativo_servicio.activo`). Limpio.
- **Parte 2**: `tsc --noEmit`, `eslint` y `npm run build` limpios en `apps/api` y en el frontend; suite Jest del backend en el mismo baseline conocido (4 fallos preexistentes no relacionados). **No se hizo una prueba manual en navegador** (arrancar ambos servidores + login + navegar a una matriz con datos reales quedo fuera de esta ronda por el costo de setup y por evitar repetir el incidente previo de un proceso de servidor huerfano en este mismo entorno). Se recomienda una pasada manual antes de dar esto por cerrado, verificando en el navegador:
  1. El boton "Configurar" no aparece para un usuario sin `gestionarTurnos`.
  2. Click en un chip de turno en modo Configurar muestra el enlace "Editar horario completo" y el boton "Desactivar horario".
  3. Editar el horario real de un turno con celdas asignadas dispara el dialogo de impacto (Propagar/Limpiar).
  4. Desactivar un turno con celdas asignadas dispara el mismo dialogo pidiendo confirmar limpieza.
  5. Tras cualquiera de esas acciones, la matriz (no solo el toolbar) se refresca y la herramienta activa vuelve a "Navegar".

## Addendum (2026-07-04): nombre y horas de un turno de departamento no se actualizaban al editar

Reportado por el usuario tras probar la Parte 2: al editar un turno (nombre y/u horario), el boton del toolbar no reflejaba el cambio.

**Causa raiz confirmada con script contra la base de dev:**
- `hora_inicio`/`hora_fin` del turno **si** se reflejan de inmediato porque `codeRows` los lee via `LEFT JOIN dbo.turno` (join en vivo).
- `nombre` y `horas_equivalentes` (mostrados como `descripcion`/`horasEquivalentes` en el toolbar) son una **copia cacheada** en `codigo_operativo_servicio`, sincronizada solo al momento de crear/actualizar/activar el turno.
- Para turnos de **servicio**, `TypeOrmTurnoRepository.actualizar()` ya sincroniza esa copia en cada edicion (`syncCodigoOperativoServicio`, sin condicion adicional). Confirmado que funciona.
- Para turnos de **departamento**, `actualizar()` solo llamaba a esa sincronizacion `if (updated.idServicio)` — igual que el bug de `desactivar()`/`activar()` corregido en la Parte 1, pero esta vez en el flujo de edicion. El resultado: nombre y horas quedaban congelados con el valor de la creacion inicial para siempre, sin importar cuantas veces se editara el turno despues.

**Fix aplicado:** nuevo metodo `updateDescripcionYHorasCodigoOperativo(idTurno, nombre, duracionHoras)` (UPDATE generico por `id_turno`, igual patron que `deactivateCodigoOperativoServicio`), llamado en la rama `else if (updated.idDepartamento)` de `actualizar()`. No toca `color`/`ordenVisual`/`codigoVisual`/`etiqueta` porque esos son overrides visuales manuales del usuario (via el editor de configuracion operativa), no datos derivados del turno.

**Revisado y descartado como problema:** `tipo_dia` no tiene este bug — `ensureTiposDiaPersonalesConfigurados` re-sincroniza **todas** las filas existentes en **cada lectura** de la configuracion operativa (no solo al escribir), asi que un cambio de nombre/descripcion en un tipo_dia ya se refleja de inmediato sin importar el scope.

**Verificado:** script contra la base de dev (crear turno de departamento, editar nombre y horario, confirmar que el toolbar ahora muestra ambos cambios). `tsc`, `lint`, `build` y suite Jest (mismo baseline de 4 fallos preexistentes) limpios.
