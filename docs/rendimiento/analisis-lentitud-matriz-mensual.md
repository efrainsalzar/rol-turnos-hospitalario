# Análisis: lentitud y "cuelgues" en la matriz mensual de planificación

**Fecha:** 2026-07-07
**Origen:** reporte del usuario — la pantalla de matriz (`pages/planificacion/planificacion-matriz.tsx`) a veces tarda mucho y, cuando la consulta es lenta, la matriz directamente no aparece (se queda "colgada" sin mostrar error).
**Estado:** análisis completo, **sin cambios de código todavía**. Este documento es la base para decidir e implementar las correcciones en una sesión futura.
**Módulos afectados:** `apps/api/.../planificacion` (use case + repositorios de infraestructura), `apps/api/src/infrastructure` (config de TypeORM/mssql), `apps/web/src/services/apiClient.ts`, `apps/web/src/hooks/useApiRequest.ts`, `apps/web/src/pages/planificacion/planificacion-matriz.tsx`.

---

## 1. Alcance de este análisis

Se pidió revisar exclusivamente la pantalla de la matriz (no la exportación) desde dos ángulos:

1. Por qué a veces la carga es lenta (procesamiento/consultas).
2. Por qué a veces la matriz "se cuelga sin aparecer" cuando la consulta tarda — es decir, un problema de experiencia de usuario / manejo de estados de carga, no solo de velocidad de la consulta en sí.

No se tocó ningún archivo; todo lo que sigue son hallazgos de lectura de código, confirmados por una segunda pasada de auditoría independiente sobre los repositorios de persistencia.

---

## 2. Por qué "se cuelga sin aparecer" — la causa raíz

Es una combinación de tres capas, ninguna con protección de tiempo:

### 2.1 El frontend nunca corta la espera

`apps/web/src/services/apiClient.ts` (función `request()`, usada por **todas** las llamadas del `planificacionApi`, incluida `getMatrizMensual`) hace `fetch()` sin `AbortController` ni timeout de ningún tipo. Los navegadores no imponen un timeout por defecto a `fetch`.

`apps/web/src/hooks/useApiRequest.ts` tampoco agrega ninguno: hace `await requestRef.current()` y punto. Si la promesa nunca se resuelve, `loading` se queda en `true` para siempre — no hay error que mostrar porque nunca llega ni éxito ni rechazo.

### 2.2 El feedback visual es mínimo

En `planificacion-matriz.tsx` (línea ~617):

```tsx
{matriz.loading || detalle.loading ? <Typography variant="body2">Cargando matriz mensual...</Typography> : null}
```

Es texto plano, no un spinner ni una barra de progreso (a diferencia del diálogo de exportación, que sí usa `LinearProgress`). No hay escalada tipo "esto está tardando más de lo normal", ni botón de cancelar en ese momento — solo el botón genérico "Recargar" en el header, que el usuario debe saber usar.

### 2.3 El timeout de base de datos está confirmado, pero no cubre todos los casos

`apps/api/src/infrastructure/persistence/typeorm/typeorm-data-source.factory.ts` (líneas 50-51):

```ts
connectionTimeout: env.connectTimeoutMs,
requestTimeout: env.connectTimeoutMs,
```

`requestTimeout` (cuánto puede tardar una *consulta* antes de que el driver `mssql`/tedious la aborte) reutiliza la **misma** variable que `connectionTimeout` (cuánto tarda en *establecerse* la conexión). Son conceptos distintos que no deberían compartir variable.

Confirmado: `DB_CONNECT_TIMEOUT_MS=5000` está en **todos** los `.env` encontrados (`.env`, `.env.dev`, `.env.example`, `.env.lab` — perfiles de ese momento; desde el 2026-10-24 solo existen `demo` y `sql2008r2`, ver `docs/deployment/guia-perfiles-entorno.md`); `.env.production.example` no lo define, así que producción caería en el mismo default hardcodeado de `database-env.ts` (`getIntegerEnv('DB_CONNECT_TIMEOUT_MS', 5000)`).

**Esto implica que una consulta lenta debería fallar con error a los 5 segundos** (propagado por `HttpExceptionFilter` como 500), no colgarse indefinidamente. Pero `requestTimeout` en el driver `mssql` **solo aplica una vez que ya se adquirió una conexión del pool**. No se encontró ninguna configuración de `pool.acquireTimeoutMillis` ni de tamaño de pool en `typeorm-data-source.factory.ts`. Si hay carga concurrente y el pool se satura (varias requests lentas reteniendo conexión a la vez), una request nueva se queda **esperando a que se libere una conexión**, y esa espera no está sujeta a `requestTimeout`.

**Hipótesis más probable para el "cuelgue" intermitente:** ocurre específicamente bajo concurrencia (varios usuarios/pestañas pidiendo la matriz al mismo tiempo, o una request previa reteniendo la conexión), no con una sola consulta lenta aislada. Combinado con el punto 2.1 (fetch sin timeout), esa espera de pool sin límite se percibe como un cuelgue total sin mensaje de error.

**Pendiente de verificar:** tamaño real del pool de conexiones y si existe algún `acquireTimeoutMillis` configurado en otro lugar no revisado todavía.

---

## 3. Procesamiento backend — qué se puede optimizar

`ObtenerMatrizMensualPlanificacionUseCase.execute()` dispara 5 llamadas en verdadero `Promise.all` (paralelo, no secuencial — esto ya está bien hecho):

| Llamada | Archivo | Costo real |
|---|---|---|
| `calendarioRepository.listar({anio, mes})` | `typeorm-calendario.repository.ts:29-74` | 1 query, tabla chica (~365 filas/año) |
| `rolTurnoRepository.listarAsignacionesDisponiblesPorServicio/PorDepartamento` | `typeorm-rol-turno.repository.ts:277-403` / `462-581` | 1 query, 6 joins muchos-a-uno, sin fan-out |
| `rolTurnoRepository.listarPorPlanificacion` | `typeorm-rol-turno.repository.ts:44-97` | 2 queries (detalle + tramos batched) — ver 3.1 |
| `planificacionHistorialRepository.listarObservacionesDiariasHistorial` (o vacío si no está cerrada) | `typeorm-planificacion-historial.repository.ts:285-317` | 1 query |
| `configuracionOperativaServicioRepository.obtenerPorPlanificacion` | `typeorm-configuracion-operativa-servicio.repository.ts:37-70` | **Ver 3.2 — el hallazgo más importante** |

### 3.1 `listarPorPlanificacion`: batching de tramos correcto, pero el query principal es pesado

El fetch de tramos (`fetchTramosPorTurnos`, líneas 1409-1456) es **una sola query con `IN (...)`**, confirmado — no es N+1 por fila. Está bien resuelto.

El query principal (`createDetailQuery()`, líneas 1458-1565) sí es costoso: hace **9 joins** (`calendario`, `asignacionPersonal`, `personal`, `nivelCargo`, `rol_funcional`, `servicio`, `tipo_contrato`, `carga_horaria`, `turno`, `incidenciaPersonal`) más un **LEFT JOIN con subconsulta correlacionada** para traer la observación mensual:

```ts
.leftJoin(
  'observacion_mensual',
  'observacionMensual',
  `observacionMensual.id_planificacion = rolTurno.id_planificacion
   AND observacionMensual.id_asignacion_personal = rolTurno.id_asignacion_personal
   AND observacionMensual.id = (
      SELECT MAX(om2.id)
      FROM dbo.observacion_mensual om2
      WHERE om2.id_planificacion = rolTurno.id_planificacion
        AND om2.id_asignacion_personal = rolTurno.id_asignacion_personal
   )`,
)
```

`rol_turno` tiene una fila por persona **y por día** (hasta 31 por persona/mes). La observación mensual es la misma para los 31 días de una persona, pero esta subconsulta se re-evalúa por cada fila — hasta 31 veces por persona en vez de una sola. Está cubierta por el índice `ix_observacion_mensual_planificacion_asignacion (id_planificacion, id_asignacion_personal)`, así que cada evaluación individual debería ser barata (index seek), pero sigue siendo trabajo repetido innecesariamente.

### 3.2 `configuracionOperativaServicioRepository.obtenerPorPlanificacion` — el hallazgo más importante para la lentitud intermitente

Esta llamada **no es una sola consulta**. Internamente ejecuta `ensureTurnosConfigurados`/`ensureTurnosDepartamentoConfigurados` y `ensureIncidenciasPersonalesConfigurados`, que disparan **5 a 8 SELECT/INSERT/UPDATE adicionales en serie** para auto-provisionar códigos operativos faltantes — **en cada request, incluso cuando no falta nada por provisionar**. Esto corre dentro de uno de los cinco slots del `Promise.all`, así que puede ser el más lento de los cinco sin que tenga relación alguna con el tamaño del roster o del mes.

**Esto es un candidato fuerte para explicar por qué la lentitud es intermitente** (depende de cuántas veces se re-evalúa esa verificación en cada request, no de cuántos datos hay).

### 3.3 Camino de planificación CERRADA — confirmado limpio, no es el problema

`listarRegistrosHistorial` (`typeorm-planificacion-historial.repository.ts:190-283`): exactamente **2 queries totales**, sin N+1. Los tramos ni siquiera se re-consultan contra `turno_tramo` — vienen congelados como JSON (`tramos_json`) desde el momento del cierre. Todos los joins de historial están indexados (migración `036_create_planificacion_historial.sql`). Este camino es más barato y más seguro que el de planificación en vivo.

### 3.4 Sin caché ni paginación en ningún punto

Confirmado: las 5 fuentes se traen completas (mes entero × roster entero) siempre, sin `LIMIT`, sin carga perezosa por día o por fila, sin ninguna capa de caché (no hay `@nestjs/cache-manager` ni Redis en el proyecto). Toda la matriz se arma completa en memoria (`filasMap`, `diasMap` en `obtener-matriz-mensual-planificacion.use-case.ts`) sin importar cuántas filas resulten. No es un problema hoy con los volúmenes actuales, pero es una limitante de escalabilidad a futuro si el roster o el histórico crecen mucho.

---

## 4. Índices — confirmados, faltantes, y a verificar

**Presentes y correctos** (migración `007_create_indices.sql`):
- `rol_turno (id_planificacion, id_calendario)`, `rol_turno (id_asignacion_personal, id_calendario)`, `rol_turno (id_turno)`, `rol_turno (id_incidencia_personal)` (ex `id_tipo_dia`).
- `asignacion_personal (id_servicio, id_tipo_item→id_tipo_contrato, id_rol_funcional, activo)`, `asignacion_personal (id_departamento, id_rol_funcional, activo)`.
- `observacion_mensual (id_planificacion, id_asignacion_personal)`, `observacion (id_planificacion, id_asignacion_personal, id_calendario)`.
- Tablas de historial (migración `036`): todas indexadas por `id_planificacion_historial`.

**Faltante, pero de bajo riesgo:**
- `calendario (anio, mes)` — no existe índice; solo hay `UNIQUE(fecha)`. `calendarioRepository.listar({anio, mes})` fuerza un scan del clustered index. Como la tabla es chica (un registro por día calendario, acotada en el tiempo), el impacto real es bajo — se documenta para no repetir el análisis, no como acción urgente.

**A verificar (no confirmado en este análisis):**
- `ix_rol_turno_id_tipo_dia` — el nombre físico del índice sigue con el nombre viejo (`tipo_dia`) tras el renombre de la migración `042_rename_tipo_dia_and_rol.sql` a `id_incidencia_personal`. Es probable que sea solo cosmético (mismo patrón documentado en `docs/database/modelo-relacional-rol-turnos.md` para otros renombres de esa migración), pero no se confirmó explícitamente que el índice siga apuntando a la columna correcta y no haya quedado huérfano.
- Tamaño del pool de conexiones TypeORM/mssql y si existe algún `acquireTimeoutMillis` — no encontrado en `typeorm-data-source.factory.ts`, no se buscó en otro lugar todavía (ver punto 2.3).

---

## 5. Frontend — qué ya está bien y qué se puede mejorar

**Ya bien resuelto (no tocar sin necesidad):**
- Las actualizaciones de celda (`applyCellMutationToMatrix`) son inmutables y *targeted*: solo la fila afectada obtiene una nueva referencia; el resto conserva la misma referencia de objeto entre renders.
- `MatrixRowView` usa `React.memo` con comparador personalizado (`areMatrixRowPropsEqual`) que evita re-renderizar todas las filas cuando cambia la celda seleccionada — compara un booleano derivado ("¿mi fila contiene la celda seleccionada?"), no la clave cruda. Esto ya resuelve el problema clásico de este tipo de tablas grandes.
- `operationalColorMap` es un `Map` (lookup O(1)), no un array escaneado por celda.
- Los tres fetches de la pantalla (`detalle`, `matriz`, `configuracionOperativa`) ya corren en paralelo vía hooks independientes, no encadenados.

**Se puede mejorar:**
- Cada celda de día envuelve su contenido en un `<Tooltip>` de MUI. Para un roster grande (ej. 80 personas × 31 días ≈ 2500 celdas) son ~2500 tooltips montados de entrada. Secundario frente al problema de timeout, pero contribuye al costo de montaje inicial.
- No hay virtualización de filas — toda la tabla se monta de una vez. Aumenta el costo de montaje con rosters grandes, aunque no explica el "cuelgue" en sí (eso es 100% del lado de la espera de red/DB, no del render).

---

## 6. Prioridad recomendada (para cuando se decida implementar)

1. **Timeout + cancelación en el cliente HTTP del frontend** (`apiClient.ts`/`useApiRequest.ts`) — ataca directamente el síntoma más grave ("se cuelga sin aparecer"), cubre cualquier causa de fondo (DB, pool, red).
2. **Investigar y acotar el pool de conexiones de TypeORM** (tamaño + `acquireTimeoutMillis`) — para que agotar el pool produzca un error rápido, no una espera indefinida.
3. **Evitar que `obtenerPorPlanificacion` dispare las verificaciones de auto-provisión en cada request** — cachear el resultado de "ya está todo configurado" o mover esa verificación fuera del camino caliente de lectura de la matriz.
4. **Aplanar la subconsulta correlacionada de `observacion_mensual`** en `createDetailQuery()` — resolverla una vez por planificación+asignación, no repetida por cada fila de día.
5. **Separar `DB_CONNECT_TIMEOUT_MS` en dos variables** (una para conexión, otra para ejecución de consulta) para que ajustar una no desactive silenciosamente la otra.
6. Mejorar el indicador de carga de la matriz (spinner real + mensaje que escala si tarda más de N segundos) — barato, alto impacto en percepción, complementa el punto 1.

---

## 7. Archivos de referencia rápida

- `apps/api/src/modules/planificacion/application/use-cases/obtener-matriz-mensual-planificacion.use-case.ts` — orquestador de las 5 llamadas paralelas.
- `apps/api/src/modules/planificacion/infrastructure/persistence/typeorm-rol-turno.repository.ts` — `listarPorPlanificacion` (líneas 44-97), `createDetailQuery` (1458-1565), `fetchTramosPorTurnos` (1409-1456), `listarAsignacionesDisponiblesPorServicio/PorDepartamento` (277-403 / 462-581).
- `apps/api/src/modules/planificacion/infrastructure/persistence/typeorm-configuracion-operativa-servicio.repository.ts` — `obtenerPorPlanificacion` y las funciones `ensure*Configurados`.
- `apps/api/src/modules/planificacion/infrastructure/persistence/typeorm-planificacion-historial.repository.ts` — camino de planificación CERRADA (líneas 190-317), confirmado limpio.
- `apps/api/src/infrastructure/persistence/typeorm/typeorm-data-source.factory.ts` — configuración de timeouts del driver `mssql`.
- `apps/api/src/infrastructure/config/database-env.ts` — default de `DB_CONNECT_TIMEOUT_MS`.
- `apps/api/src/main.ts` — confirmado: sin timeout global de request a nivel NestJS.
- `apps/web/src/services/apiClient.ts` — `request()`, sin `AbortController` ni timeout.
- `apps/web/src/hooks/useApiRequest.ts` — sin timeout ni reintento.
- `apps/web/src/pages/planificacion/planificacion-matriz.tsx` — UI de carga (línea ~617), `MatrixRowView`/`areMatrixRowPropsEqual` (líneas ~1299-1460), `applyCellMutationToMatrix` (línea ~900).
- `database/migrations/007_create_indices.sql` — índices confirmados.
- `database/migrations/036_create_planificacion_historial.sql` — índices del historial.
