# Impacto de editar o eliminar un turno / tipo_dia ya usado en la matriz

**Estado:** implementado y verificado contra la base de dev (2026-07-04).
**Fecha:** 2026-07-04
**Módulos afectados:** `operacion` (catálogo `turno` / `tipo_dia`), `planificacion` (`rol_turno`).

> **Nota de deriva (verificado 2026-07-10):** `tipo_dia` se renombró a `incidencia_personal` en la
> migración `042` (2026-07-06) — la tabla, las rutas (`/v1/tipos-dia` → `/v1/incidencias-personales`), los
> casos de uso (`DesactivarTipoDiaUseCase` → equivalente sobre incidencias) y la página de frontend
> (`tipo-dia.tsx` → `incidencia-personal-base.tsx`) cambiaron de nombre. El mecanismo y las reglas que
> describe este documento (impacto/propagar/limpiar) siguen vigentes conceptualmente; los nombres
> literales de archivos, rutas y clases que aparecen abajo no se actualizaron uno por uno.

## Resumen de la implementación

- `GET /v1/turnos/:id/impacto` y `GET /v1/tipos-dia/:id/impacto` — dry-run del impacto.
- `PUT /v1/turnos/:id` acepta `estrategiaCeldasExistentes: 'PROPAGAR' | 'LIMPIAR'`; responde `409` con el impacto si el horario cambia y hay celdas afectadas sin estrategia elegida.
- `DELETE /v1/turnos/:id` y `DELETE /v1/tipos-dia/:id` aceptan `?confirmar_limpieza=true`; responden `409` con el impacto si hay celdas afectadas sin confirmar.
- Frontend: `ImpactoUsoDialog` (componente compartido) se muestra en `TurnoFormDialog` (edición) y en `turnos.tsx` / `tipos-dia.tsx` (eliminación) cuando la API responde `409` con `impacto`.
- `apiClient.ts` se extendió para propagar el `body` completo del error (no solo `message`), necesario para leer `impacto` en el frontend.
- Verificado con un turno de prueba real (creado y limpiado en la misma corrida) contra la base de dev: impacto, propagar (recalcula `horas_programadas`) y limpiar (`DELETE` físico de las celdas) funcionan como se diseñó.

---

## 1. Problema

El toolbar de la matriz (`PlanificacionOperationalToolbar.tsx`) construye sus botones a partir del catálogo real `turno` y `tipo_dia`. Hoy, editar o desactivar (`DesactivarTurnoUseCase` / `DesactivarTipoDiaUseCase`) uno de estos catálogos **no valida si ya tiene celdas asignadas** en `rol_turno`:

- `crear-rol-turno-planificacion.use-case.ts:132-148` y `actualizar-rol-turno-planificacion.use-case.ts:151-166` sí exigen `activo = true` al escribir una celda, pero **nada** revisa `rol_turno` antes de desactivar el catálogo.
- Las lecturas de la matriz usan `LEFT JOIN` sobre `turno`/`tipo_dia` (`typeorm-rol-turno.repository.ts:1409,1937`) y muestran campos en vivo (`turno.codigo`, `turno.nombre`, `hora_inicio`, `hora_fin`), no snapshot. Editar el horario de un turno cambia retroactivamente cómo se ve en **toda planificación no CERRADA** que lo use, incluidas las ya `PUBLICADA`.
- `rol_turno.horas_programadas` sí es snapshot (no se recalcula solo), por lo que un cambio de horario sin recalcular deja el horario mostrado desincronizado del total de horas ya contado.
- El check constraint `ck_rol_turno_exclusion_turno_tipo_dia` (`005_create_operacion.sql:123-128`) exige que **exactamente uno** de `id_turno` / `id_tipo_dia` sea NOT NULL. No se puede "vaciar" una celda dejando ambos en NULL: la única forma de vaciar una celda es **eliminar físicamente la fila** de `rol_turno` — así es como ya funciona hoy el botón "Limpiar" de una celda individual (`aplicar-celda-matriz-planificacion.use-case.ts` → `typeorm-rol-turno.repository.ts:1192-1225`, `DELETE FROM rol_turno WHERE ...`).

## 2. Reglas de negocio aprobadas

| Decisión | Resultado |
|---|---|
| Alcance por estado de planificación | Igual tratamiento en `BORRADOR` y `PUBLICADA`. Solo `CERRADA` queda protegida (vive en `rol_turno_historial`, sin FK viva, inmutable). |
| Alcance por catálogo | La misma regla aplica a `turno` **y** a `tipo_dia` (ambos referenciados desde `rol_turno.id_turno` / `id_tipo_dia`). |
| Motivo de texto libre | No obligatorio. Basta con mostrar el conteo de celdas/planificaciones afectadas y pedir confirmación explícita. Queda trazado en logs de aplicación (actor, catálogo, estrategia, conteo), sin campo de texto adicional. |

## 3. Flujo funcional

### 3.1 Editar horario de un turno con celdas asignadas

Solo dispara este flujo si cambian campos que afectan el horario/horas: `hora_inicio`, `hora_fin`, `cruza_medianoche`, `duracion_horas`. Cambios puramente cosméticos (`codigo`, `nombre`) no requieren elegir estrategia — se propagan siempre, igual que hoy (comportamiento ya esperado de un catálogo compartido).

Si hay celdas afectadas (`rol_turno` en planificaciones `BORRADOR`/`PUBLICADA` referenciando ese `id_turno`), el usuario debe elegir una de dos estrategias antes de confirmar:

- **Propagar**: se actualiza el turno y además se recalculan las celdas existentes afectadas (`rol_turno.horas_programadas` pasa al nuevo `duracion_horas`), para que el horario mostrado y el total de horas queden consistentes.
- **Limpiar**: se actualiza el turno, pero las celdas existentes que lo referenciaban se eliminan (mismo mecanismo físico que "Limpiar" celda individual), quedando esos días sin asignación — a la espera de que alguien las vuelva a planificar con el nuevo horario.

### 3.2 Eliminar (desactivar) un turno o tipo_dia con celdas asignadas

No hay opción "propagar" al eliminar — solo tiene sentido **limpiar**. El flujo es:

1. El usuario intenta desactivar un turno/tipo_dia.
2. Si tiene celdas afectadas, el sistema advierte cuántas celdas y en cuántas planificaciones (`BORRADOR`/`PUBLICADA`) se van a limpiar.
3. Si el usuario confirma, se ejecuta en una sola transacción: `DELETE` de esas filas de `rol_turno` + `activo = 0` sobre el turno/tipo_dia.
4. Si no confirma, no se desactiva nada.

## 4. Diseño backend propuesto

### 4.1 Endpoint de impacto (dry-run)

Nuevo endpoint de solo lectura, reutilizable para editar y para eliminar:

```
GET /v1/turnos/:id/impacto
GET /v1/tipos-dia/:id/impacto
```

Respuesta:

```json
{
  "totalCeldas": 42,
  "totalPlanificaciones": 3,
  "planificaciones": [
    { "id": 12, "periodo": "2026-07", "estado": "PUBLICADA", "totalCeldas": 30 },
    { "id": 13, "periodo": "2026-08", "estado": "BORRADOR", "totalCeldas": 12 }
  ]
}
```

Consulta base: `rol_turno` INNER JOIN `planificacion` WHERE `id_turno = :id` (o `id_tipo_dia`) AND `planificacion.estado <> 'CERRADA'`, agrupado por planificación. `rol_turno_historial` nunca se consulta aquí porque no participa (inmutable).

### 4.2 Editar turno

`PUT /v1/turnos/:id` acepta un campo opcional:

```ts
estrategiaCeldasExistentes?: 'PROPAGAR' | 'LIMPIAR';
```

- Si el payload no cambia campos de horario → se ignora, comportamiento actual sin cambios.
- Si cambia horario y hay celdas afectadas pero no viene `estrategiaCeldasExistentes` → responder `409 Conflict` con el mismo cuerpo del endpoint de impacto, para que el frontend muestre el modal de elección antes de reintentar.
- Si viene la estrategia → ejecutar update del turno + la operación masiva correspondiente (recalcular horas o eliminar filas) dentro de una transacción única.

### 4.3 Eliminar turno / tipo_dia

`DELETE /v1/turnos/:id` y `DELETE /v1/tipos-dia/:id` aceptan un flag:

```ts
confirmarLimpieza?: boolean;
```

- Si hay celdas afectadas y `confirmarLimpieza` no es `true` → `409 Conflict` con el resumen de impacto (mismo contrato que 4.1).
- Si `confirmarLimpieza: true` → transacción única: `DELETE` de las filas de `rol_turno` afectadas + `activo = 0`.

### 4.4 Trazabilidad

Cada operación con impacto (propagar, limpiar al editar, limpiar al eliminar) debe loguear: actor, id de turno/tipo_dia, estrategia aplicada, cantidad de celdas afectadas y planificaciones afectadas — siguiendo el patrón de logging ya usado en el resto del módulo `planificacion` (estándar de logging del proyecto).

## 5. Diseño frontend propuesto

- Al editar un turno con cambios de horario: si el backend responde `409` con el resumen de impacto, mostrar un modal con el conteo (celdas/planificaciones) y dos botones: "Propagar a celdas existentes" / "Limpiar celdas existentes". Reenviar el PUT con la estrategia elegida.
- Al eliminar un turno/tipo_dia: si el backend responde `409` con impacto, mostrar un modal de advertencia con el conteo y un solo botón de confirmación ("Sí, limpiar y desactivar"). Reenviar el DELETE con `confirmarLimpieza: true`.
- Sin impacto (0 celdas afectadas): comportamiento actual, sin modal.

## 6. Pendiente de resolver antes o durante la implementación

- **Reglas de cobertura** (`regla_cobertura` / consulta en `typeorm-rol-turno.repository.ts:1628`, `innerJoin(TurnoOrmEntity, 'turno', 'turno.id = cobertura.id_turno')`): no se confirmó si excluyen turnos inactivos. Si una regla de cobertura sigue apuntando a un turno desactivado, puede seguir evaluando de forma silenciosa. Revisar antes de habilitar eliminación libre desde el toolbar.
- **Reactivación de tipo_dia**: hoy solo `turno` tiene `POST /turnos/:id/activar`; `tipo_dia` no tiene endpoint equivalente. Si se va a permitir desactivar tipo_dia con más frecuencia (por el flujo de "limpiar"), conviene agregar el endpoint simétrico de reactivación.
- **Recalcular horas en "Propagar"**: al recalcular `horas_programadas` de celdas existentes, definir si también dispara una revalidación de reglas de horas/cobertura para esas planificaciones (podría requerir reconciliar totales ya mostrados en reportes/resúmenes de horas).
- **Auditoría de "quién limpió qué"**: aunque no se exige motivo de texto, evaluar si conviene dejar un registro (además del log de aplicación) en alguna tabla de auditoría existente, dado que "limpiar" borra físicamente asignaciones que el personal ya podía ver en una planificación `PUBLICADA`.
