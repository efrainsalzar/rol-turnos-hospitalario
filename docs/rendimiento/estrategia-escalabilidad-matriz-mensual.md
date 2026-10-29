# Estrategia: escalabilidad de la matriz mensual bajo uso concurrente intensivo

**Estado:** propuesta, lista para ejecutar por tandas.
**Fecha:** 2026-07-10
**Relación con `docs/rendimiento/analisis-lentitud-matriz-mensual.md`:** ese análisis (y su ejecución, `docs/database/decisiones-tecnicas.md §§67-69`) resolvió por qué una carga individual de la matriz era lenta o se colgaba sin error. Este documento es la continuación lógica: asume que una sola lectura/escritura ya es rápida y confiable, y ataca un problema distinto — **qué pasa cuando muchas personas usan la matriz al mismo tiempo, cada una asignando muchas celdas seguidas**, y cómo asegurar que el sistema no se degrade, corte ni deje de responder bajo esa carga.

---

## 1. Punto de partida real (no supuesto)

Verificado en el código, no estimado:

* **La API corre como un solo proceso Node** (`apps/api/src/main.ts`): `NestFactory.create` + `app.listen` una sola vez, sin `cluster`, sin PM2 en modo cluster, sin múltiples workers. Todos los usuarios concurrentes comparten el mismo event loop y el mismo pool de conexiones a la base.
* **El pool de conexiones ya tiene límite** (trabajo de esta misma sesión, `decisiones-tecnicas.md §68`): `DB_POOL_MAX=10`, `DB_POOL_ACQUIRE_TIMEOUT_MS=10000`. Es un valor razonable por defecto, **no un valor medido** contra carga real — este documento lo trata como punto de partida a validar, no como resuelto.
* **Cada celda pintada en la matriz no es una consulta, son entre 5 y 7** (`AplicarCeldaMatrizPlanificacionUseCase.execute` + `aplicarCeldaMatrizRapida`):
  1. `obtenerPorId(idPlanificacion)` — 1 SELECT
  2. `cerrarSiVencida(...)` — 1 chequeo (a veces escribe si la planificación venció)
  3. `obtenerEstadoCeldaMatriz(...)` — 1 SELECT (valida asignación + calendario)
  4. `resolverCodigoOperativoPlanificacion(...)` — 1 SELECT (si no es "limpiar")
  5. `obtenerTurnoValidacion`/`obtenerIncidenciaPersonalValidacion` — 1 SELECT más
  6. Dentro de una transacción propia (`aplicarCeldaMatrizRapida`): 1 SELECT de filas existentes + 1 INSERT/UPDATE + 0-1 DELETE de sobrantes

  Los primeros 5 pasos corren **fuera** de cualquier transacción, cada uno es su propio viaje a la base.
* **No hay agrupamiento en el frontend**: pintar una celda con clic o arrastrar el mouse sobre varias dispara **una request HTTP independiente por celda** (`handleCellMouseEnter` → `applyToolToCell` en `planificacion-matriz.tsx`). No hay debounce, no hay cola, no hay envío por lote.

**Matemática del multiplicador real:** un usuario que arrastra el mouse sobre 30 celdas en pocos segundos genera ~30 requests HTTP, cada una con 5-7 viajes a la base → **150-210 operaciones de base de datos en una ráfaga de segundos, de un solo usuario.** Con 5 usuarios haciendo lo mismo a la vez (varios jefes de servicio armando su rol el mismo día, escenario realista en un hospital), son 750-1050 operaciones compitiendo por un pool de 10 conexiones.

Esto no significa que el sistema se vaya a romper — significa que **el pool es el cuello de botella real**, y hoy su tamaño (10) es una suposición razonable, no un número validado contra este escenario.

---

## 2. Qué NO hace falta (para no sobre-diseñar)

Antes de proponer cambios, vale decir explícitamente qué no se necesita todavía, dado el volumen real del proyecto (un sistema hospitalario interno, no una plataforma pública de miles de usuarios simultáneos):

* **Clustering de Node / múltiples instancias del backend**: el cuello de botella hoy es el pool de conexiones a la base, no CPU del proceso Node (las operaciones son I/O, no cómputo pesado). Agregar instancias sin resolver el multiplicador de consultas por celda solo movería el problema al servidor de base de datos.
* **Caché (Redis u otro)**: la matriz se escribe constantemente durante la sesión de planificación; cachear lecturas no ayuda al problema de escritura concurrente, que es el que importa acá.
* **Microservicios o colas de mensajería (RabbitMQ/Kafka)**: el volumen real (decenas de usuarios concurrentes, no miles) no justifica esa complejidad operativa — coincide con `ARQUITECTURA.md` §2.3 (monolito modular mientras el dominio se estabiliza).
* **Rehacer el modelo de datos**: el esquema y los índices ya están confirmados sanos (auditoría previa, `decisiones-tecnicas.md`). El problema es de *cuántas veces* se llama a la base por acción del usuario, no de cómo está modelada.

---

## 3. Estrategia, en capas, de la más segura/barata a la más grande

### Capa 1 — Reducir el multiplicador por celda (fundamento de todo lo demás)

Fusionar las 5 consultas de validación previas a la transacción en menos viajes — idealmente dentro de la misma transacción que ya abre `aplicarCeldaMatrizRapida`, o combinando validaciones relacionadas en una sola consulta con joins (ej. `obtenerEstadoCeldaMatriz` + `resolverCodigoOperativoPlanificacion` + `obtenerTurnoValidacion`/`obtenerIncidenciaPersonalValidacion` pueden resolverse con una sola consulta que traiga todo lo necesario, en vez de 3-4 separadas).

**Por qué primero:** reduce el multiplicador para *todos* los escenarios por igual (un usuario pintando mucho, o muchos usuarios pintando poco) sin cambiar ningún contrato de API ni tocar el frontend. Es la base sobre la que se apoyan las capas siguientes — sin esto, cualquier otra optimización sigue multiplicada por 5-7.

### Capa 2 — Endpoint de lote para el gesto de arrastre

En vez de que cada celda tocada durante un arrastre dispare su propio request, acumular las celdas del gesto (desde `mousedown` hasta `mouseup`) y mandarlas en **una sola llamada** al backend, que las procese en **una sola transacción** con un `INSERT`/`UPDATE` de múltiples filas en vez de N transacciones separadas.

**Impacto:** un arrastre de 30 celdas pasa de ~30 requests (150-210 operaciones de base) a **1 request, 1 transacción, ~3-5 operaciones de base total** — no importa cuántas celdas abarque el gesto. Este es el cambio de mayor impacto para el escenario que describís ("asignar a diestra y siniestra").

**Costo:** requiere un endpoint nuevo (ej. `PUT /v1/planificaciones/:id/matriz/celdas/lote`) y cambiar `planificacion-matriz.tsx` para acumular celdas tocadas en vez de disparar por celda — el cambio de mayor tamaño de esta estrategia, pero el único que realmente saca el problema de la ecuación en vez de solo tolerarlo mejor.

### Capa 3 — Dimensionar el pool con datos reales, no con un valor por defecto

`DB_POOL_MAX=10` fue un valor de partida razonable, no medido. Antes de confiar en él bajo concurrencia real:

1. **Prueba de carga dirigida** (recomendado: `autocannon` o `k6`, ninguno instalado hoy) simulando N usuarios concurrentes pintando celdas contra un entorno de desarrollo/lab — no contra producción.
2. Medir: latencia p50/p95/p99 de `PUT /matriz/celdas`, tasa de fallos por `acquireTimeoutMillis` agotado, y CPU/memoria del proceso Node bajo esa carga.
3. Ajustar `DB_POOL_MAX` y `DB_POOL_ACQUIRE_TIMEOUT_MS` según lo medido, no según intuición — y dejar el resultado de la prueba documentado en `decisiones-tecnicas.md` para que el próximo ajuste tenga una base real de comparación.

**Por qué no hacer esto primero:** medir contra el sistema actual (sin las capas 1 y 2) daría un número artificialmente pesimista — el multiplicador de consultas por celda distorsionaría cualquier conclusión sobre el tamaño correcto del pool.

### Capa 4 — Degradar con gracia en vez de romper, cuando igual se satura

Aunque las capas 1-3 corran, siempre puede haber una ráfaga que supere la capacidad (ej. muchos usuarios cerrando planificaciones el mismo día de fin de mes). Para esos picos:

* **Backpressure explícito**: si el pool está saturado, que la request espere hasta `acquireTimeoutMillis` y falle con un mensaje claro (`503`, "el sistema está ocupado, reintentá en un momento") — ya parcialmente cubierto por el trabajo de esta sesión, falta solo pulir el mensaje que llega al frontend para que no se vea como un error genérico.
* **Reintento automático acotado en el frontend** para el caso específico de "pool saturado" (status 503 o el mensaje de timeout de adquisición), con backoff corto (1-2 reintentos, no un bucle infinito) — evita que el usuario tenga que notar el fallo y volver a pintar la celda a mano.

### Capa 5 — Observabilidad mínima

Sin esto, "¿está aguantando bien?" sigue siendo una pregunta sin respuesta hasta que un usuario se queja. Alinea con el estándar de logging y observabilidad del proyecto:

* Loguear (no solo en debug) cuándo el pool llega a su máximo y cuánto tarda en liberarse una conexión — da visibilidad temprana de que el límite está cerca antes de que empiece a fallar.
* Loguear la duración de `PUT /matriz/celdas` (y del futuro endpoint de lote) para poder ver percentiles reales en producción, no solo en la prueba de carga puntual.

---

## 4. Orden de ejecución propuesto

1. **Capa 1** (reducir consultas por celda) — bajo riesgo, sin cambio de contrato, beneficia todo lo demás.
2. **Capa 2** (endpoint de lote para arrastre) — el cambio de mayor impacto real para "un usuario pintando mucho".
3. **Capa 3** (prueba de carga + ajuste de pool con datos) — recién tiene sentido medir después de 1 y 2, para no medir un sistema que ya sabemos que va a cambiar.
4. **Capa 4** (backpressure/reintento) — pulido de experiencia para los picos que igual pasen.
5. **Capa 5** (observabilidad) — puede ir en paralelo con cualquiera de las anteriores, es barata y de bajo riesgo.

El ícono de estado de guardado (nube/pendientes) que se dejó de lado en esta conversación encaja naturalmente **después de la Capa 2** — recién ahí existe una "cola" real de cambios en vuelo que tenga sentido visualizar; hoy cada celda es una operación aislada e inmediata.
