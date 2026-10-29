# Estrategia: resiliencia de red en el frontend (timeout, cancelacion, reintento)

## Objetivo

Que ninguna pantalla del frontend pueda quedar en un estado de carga infinito sin salida cuando el
backend tarda o no responde. Hoy eso puede pasar, y la unica salida es recargar la pagina entera a
mano. Este documento fija el patron unico para resolverlo, igual que ya existe uno para pantallas
(`OperationalPageTemplate`, `docs/frontend/estandar-visual-operativo.md`) y para dialogs
(`docs/frontend/estandar-modales.md`): no reinventar la solucion pantalla por pantalla.

**Estado: implementado (2026-07-10).** Ver "Que se implemento realmente" mas abajo para el detalle final
(incluye una desviacion consciente respecto del plan original en `useApiRequest`).

## Motivacion

Reportado por el usuario probando en un equipo con procesamiento limitado: una consulta lenta (por
ejemplo, al crear o abrir una planificacion) deja la pantalla en un estado roto — sin error visible,
sin forma de reintentar, con botones o listas que nunca terminan de poblarse — hasta que se recarga la
pagina manualmente. El caso reportado (creacion de planificacion) es una instancia puntual de un
problema estructural presente en las 20 pantallas del proyecto que usan `useApiRequest`
(`grep -rl "useApiRequest" src/pages` = 20 archivos).

## Diagnostico (relevamiento 2026-07-10)

### 1. Ninguna peticion HTTP tiene timeout ni cancelacion

`services/apiClient.ts` usa `fetch` crudo en sus 4 metodos (`request`, `requestBlob`,
`requestBlobWithBody`, `requestText`), sin `AbortController`, sin `signal`, sin ninguna variable de
entorno de timeout. Si el backend tarda — por una consulta lenta, por CPU limitada en el cliente, por
lo que sea — la promesa de `fetch` no resuelve nunca. No existe ningun mecanismo que la corte.

### 2. `useApiRequest` hereda el problema tal cual

`hooks/useApiRequest.ts` usa una bandera `active` que solo evita pisar el estado si el componente se
desmonto o cambiaron las dependencias — **no cancela la peticion real**, solo ignora su resultado. Si
esa peticion nunca resuelve, `loading` queda en `true` para siempre: no hay caso de error, no hay caso
de exito, solo el estado de carga (si la pantalla lo muestra) indefinidamente.

### 3. El patron "Recargar" existente empeora el problema en vez de resolverlo

Todo boton de "Recargar" en el proyecto (`calendarios.tsx`, `planificacion-detalle.tsx`,
`planificacion-matriz.tsx`) hace `setRefreshKey((value) => value + 1)`, que dispara una peticion nueva
**sin cancelar la anterior**. Los navegadores limitan a ~6 conexiones simultaneas por origen
(HTTP/1.1); cada peticion colgada que se acumula ocupa una conexion que nunca se libera. Reintentar
varias veces agota el pool de conexiones al backend — a partir de ahi, **cualquier otra peticion de esa
pantalla u otra pestaña de la misma pantalla queda en cola esperando un socket libre que nunca aparece**.
Esto explica el sintoma de "algunos botones o listas no cargan mientras otros si": no es un bug puntual
de renderizado en un boton, es su peticion esperando en cola detras de peticiones zombies. Solo un
reload fuerza al navegador a cerrar todas las conexiones y arrancar de cero.

### 4. No existe un "Reintentar" real

Solo existe "Recargar" (ver punto 3), que no cancela nada. No hay ningun boton de reintento asociado al
mensaje de error mismo.

### 5. El `RouteErrorBoundary` no cubre este caso

Existe `components/system/RouteErrorBoundary.jsx`, registrado como `errorElement` de las rutas
principales (`routes/index.jsx`). Captura excepciones de renderizado (ej. `undefined.algo`), pero un
estado de "cargando para siempre sin error" no lanza ninguna excepcion, asi que el boundary no actua.

### Por que un indicador de carga por si solo no alcanza

Un spinner comunica "estoy esperando", pero no resuelve el problema de fondo: sin un limite de tiempo,
"esperar" y "colgado para siempre" son indistinguibles tanto para el usuario como para el codigo. El
spinner es la capa de comunicacion; falta la capa de garantia — algo que le diga al navegador "si esto
no respondio en X segundos, cortalo y avisame". Sin esa garantia, cualquier mejora visual es cosmetica.

### Que NO resuelve esta estrategia

Esto no acelera ninguna consulta lenta del backend. Si una consulta real tarda 40 segundos, seguira
tardando 40 segundos — lo que cambia es que la UI deja de quedar en un estado irrecuperable cuando eso
pasa, devolviendo el control al usuario (ver el error, reintentar, seguir usando el resto de la
aplicacion) en vez de forzar una recarga completa. La optimizacion de consultas lentas puntuales (por
ejemplo, la carga inicial de una planificacion nueva o de la matriz mensual) es un trabajo aparte, de
backend, que se aborda por separado.

## Patron oficial

Dos cambios centralizados en los dos archivos que ya comparten las 20 pantallas — el punto de
apalancamiento es exactamente ese: arreglar ahi arregla todas las pantallas a la vez, sin tocar cada
una.

### `services/apiClient.ts` — timeout real por peticion

Cada metodo (`get`, `post`, `put`, `patch`, `delete`, `getBlob`, `postBlob`, `getText`) arma un
`AbortController` propio y lo combina con cualquier `signal` externo que reciba (ver mas abajo). Un
`setTimeout` interno llama a `controller.abort()` si la peticion no resolvio dentro del limite. Al
abortar, `fetch` lanza `AbortError`, que se traduce a un `ApiClientError` con mensaje explicito:
"La solicitud tardo demasiado. Verifica tu conexion e intenta de nuevo." — nunca un mensaje generico de
"Algo salio mal" (ARQUITECTURA.md §9).

Limites propuestos, ajustables por endpoint si hace falta:

- **20 segundos** para lecturas normales (`GET`, `POST`/`PUT`/`PATCH`/`DELETE` de escritura chica).
- **45 segundos** para `getBlob`/`postBlob` (exports de Excel/PDF, que ya son operaciones pesadas por
  naturaleza y no deben cortarse con el mismo criterio que una lectura simple).

### `hooks/useApiRequest.ts` — `slow` + `refetch()`

- El hook expone `refetch()` ademas de `data`/`error`/`loading`, para que cada pantalla tenga un unico
  mecanismo de reintento real, en vez de que cada pantalla reinvente su propio `refreshKey`. Internamente
  usa un contador (`retryTick`) sumado a las `deps` del efecto — mismo mecanismo que ya usaba cada pantalla
  a mano, centralizado en el hook.
- Expone `slow: boolean`, encendido por un `setTimeout` de `SLOW_THRESHOLD_MS` (7s) si la carga sigue en
  curso a esa altura; se apaga solo al resolver, sin afectar `loading`/`error`/`data`.
- La bandera `active` (evita pisar el estado si el efecto ya no es el vigente) se mantiene igual que antes.

### Feedback visual en dos etapas (capa de comunicacion, sobre la garantia de arriba)

- Carga normal: el indicador de carga que cada pantalla ya usa (`CircularProgress` dentro de
  `CollectionTableCard`, etc.), sin cambios.
- Pasados ~6-8 segundos de carga continua, un mensaje adicional ("Esto esta tardando mas de lo
  normal...") para que el usuario sepa que sigue en curso, no congelado, mientras se acerca al timeout
  duro. Esto se implementa como un `setTimeout` local dentro de `useApiRequest` que solo cambia un flag
  de presentacion (`slow: boolean`), sin afectar `loading`/`error`/`data`.
- Al vencer el timeout duro: mensaje de error explicito + boton "Reintentar" (nuevo, usando `refetch()`)
  junto al mensaje, no un boton generico de "Recargar" separado en el toolbar.

### Alternativa descartada: migrar a TanStack Query

TanStack Query resuelve todo esto de fabrica (timeout via `AbortSignal`, cancelacion automatica al
desmontar/refetch, `refetch()`, reintento con backoff). el estándar del frontend ya deja anotado
"si el frontend crece mucho, evaluar TanStack Query despues" — se mantiene como camino futuro, no se
adopta ahora: una migracion de las 20 pantallas es una reescritura mucho mas grande que parchear los dos
archivos compartidos que ya existen, y el problema real (peticiones sin limite) se resuelve igual de
bien con el patron de arriba sin ese costo. Revisar esta decision si el numero de pantallas o la
complejidad de sus necesidades de cache/sincronizacion crece significativamente.

## Que se implemento realmente

1. `services/apiClient.ts`: `fetchConTimeout` centraliza el `AbortController` + `setTimeout` de los 4
   metodos (`request`, `requestBlob`, `requestBlobWithBody`, `requestText`); 20s para lecturas/escrituras
   normales, 45s para blobs. Un `AbortError` se traduce a `ApiClientError` con mensaje explicito ("La
   solicitud tardo demasiado..."); cualquier otro fallo de red (offline, DNS) tambien se normaliza a un
   mensaje en español en vez de propagar el `TypeError` crudo de `fetch`.
2. `hooks/useApiRequest.ts`: agrega `slow` y `refetch()` al estado devuelto (ver seccion de arriba).
3. `components/system/CollectionTableCard.tsx` (y su wrapper `OperationalTableCard.tsx`): dos props
   opcionales nuevas, `slow?: boolean` y `onRetry?: () => void`. Sin `onRetry`, el `Alert` de error se ve
   igual que antes (compatible con cualquier pantalla no actualizada); con el, agrega un boton
   "Reintentar". Con `slow`, agrega el texto de "esto esta tardando mas de lo normal" bajo el spinner.
4. **Las 14 pantallas que usan `OperationalTableCard`** quedaron conectadas a `slow`/`onRetry={response.
   refetch}` de su propio `useApiRequest`: `calendarios` (sus 2 tablas), `tipos-feriado`, `asignaciones`,
   `turnos`, `servicio-detalle`, `servicios`, `cargas-horarias`, `cargos`, `roles`, `departamentos`,
   `incidencia-personal-base`, `planificaciones`, `personal/index`, `usuarios`. En las pantallas con mas
   de un `useApiRequest` combinado por `||` (`turnos`, `servicios`), `onRetry` reintenta todos a la vez.
5. **Los dos casos puntuales del bug reportado** (crear/abrir una planificacion):
   - `planificacion-detalle.tsx` — antes no leia `detalle.loading` en ningun lado (la pantalla se
     renderizaba con campos vacios sin ningun indicador); ahora tiene `CircularProgress` + texto + aviso
     de tardanza, y el `Alert` de error tiene "Reintentar". Se aprovecho el cambio para eliminar el
     `refreshKey` local (ya redundante con `refetch()`).
   - `planificacion-matriz.tsx` — el loading paso de ser solo texto a `CircularProgress` + texto + aviso
     de tardanza; el error paso de mirar solo `matriz.error` a considerar tambien `detalle.error` y
     `configuracionOperativa.error` (el hueco real que dejaba pantallas en blanco sin ningun mensaje); el
     boton "Reintentar" reintenta los 3 `useApiRequest` de la pantalla a la vez. El boton de recarga
     existente (icono, `refreshKey`) se dejo intacto — no es lo que fallaba.
6. **Grupo B (2026-07-10, tanda separada, mismo dia):**
   - `personal-detalle.tsx` — loading de texto plano a `CircularProgress` + aviso de tardanza; error de
     `Typography` suelto a `Alert` con "Reintentar"; `window.alert` en `handleTogglePersonal` reemplazado
     por `useAppToast` (patron ya establecido, `window.alert` no se usaba en ningun otro lado del proyecto).
   - `health-sistema.tsx` — agrega aviso de tardanza y "Reintentar" a los dos chequeos (`ready`,
     `database`); el `Chip` de estado (ya usaba color/label segun `loading`/`error`) se dejo igual.
   - `configuracion-operativa.tsx` — el caso mas critico: `configuracionServicioResponse.error`/
     `configuracionDepartamentoResponse.error` **nunca se leian**, la pantalla quedaba muda ante un fallo
     (sin loading, sin error, como si no se hubiera seleccionado nada). Se agrego `CircularProgress`,
     `Alert` con "Reintentar" para la config, y de paso se agrego lo mismo para los catalogos de
     departamentos/servicios (`departamentosResponse.error`/`serviciosResponse.error`, tambien silenciados
     antes).
   - `reporte-rol-personal.tsx` — el flujo de busqueda principal (`handleBuscarPorAmbito`,
     `handleSeleccionarPlanificacionPersona`) ya tenia try/catch/finally correcto con `searchError`
     visible en un `Alert` dismissible; no se toco (el "reintentar" natural ahi es re-hacer la busqueda,
     ya visible en pantalla). Se agrego error visible para las 3 consultas silenciosas que si lo
     necesitaban: busqueda de personal (`personasEncontradas`), y los catalogos `departamentos`/
     `serviciosData` (estos dos con "Reintentar", igual que en las demas pantallas). De paso se confirmo y
     elimino `getReportePersonalHtml` de `planificacionApi.ts` — cero llamadores en todo `apps/web/src`,
     codigo muerto sin relacion con este cambio.
   - Ninguna de las 4 forma parte del caso reportado originalmente (crear/abrir planificacion); se hicieron
     porque el usuario pidio explicitamente cerrar el mismo tipo de problema en el resto de pantallas.

## Exportacion y vista previa: ya estaban bien resueltas, no requirieron cambios

El usuario pregunto explicitamente si exportacion/vista previa de planificaciones tenian el mismo problema
(historicamente si lo tuvieron). Relevamiento antes de tocar nada: `PlanificacionExportDialog.tsx` (usado
por `planificacion-matriz.tsx` y `planificaciones.tsx`) ya tiene loading visible (`LinearProgress`), botón
deshabilitado durante la operacion (evita doble submit), y try/catch/finally completo con mensaje de error
visible (`exportPreviewError`/`feedback`). `reporte-rol-personal.tsx` (`handleDescargarPdf`) tiene el mismo
patron. Todos usan `apiClient.getBlob`/`postBlob`/`getText`, que ya heredan el timeout de 45s (blobs) o 20s
(`getText`) agregado en el punto 1 — sin cambios adicionales necesarios. Unico hallazgo: `getReportePersonalHtml`
(vista previa HTML del reporte individual, distinta del PDF) no tenia ningun llamador — eliminada en el
punto 6.

### Desviacion consciente respecto del plan original: sin `AbortController` real en `useApiRequest`

El plan original proponia que `useApiRequest` cancelara la peticion en curso (via `AbortController` +
`signal`) al desmontar o cambiar deps, para liberar la conexion del navegador de inmediato. Implementarlo
de verdad requiere que el `signal` viaje desde el hook hasta `fetch`, lo que implica agregar un parametro
`signal` a **cada metodo de `apiClient` y a cada funcion de cada servicio** (`planificacionApi`,
`operacionApi`, etc. — decenas de metodos) para que cada pantalla lo pase en su callback de
`useApiRequest`. Es una refactorizacion mucho mas grande que el resto de este cambio, sin beneficio
adicional real: con el timeout de `apiClient.ts` ya en su lugar (punto 1), ninguna peticion queda colgada
mas alla de 20s/45s — el peor caso pasa de "para siempre" a "acotado", que es lo que rompia la pantalla.
Se descarta por ahora; revisar si en la practica el agotamiento del pool de conexiones (diagnostico seccion
3 mas arriba) sigue siendo un problema real dentro de esa ventana de 20-45s.

## Verificacion

`npm run typecheck` y `npm run build` limpios en `apps/web` despues de cada tanda de cambios (core,
`CollectionTableCard` + 14 pantallas, `planificacion-detalle`/`planificacion-matriz`). No hay
infraestructura de test automatizado en `apps/web` todavia (`docs/testing/estrategia-cobertura-
automatizada.md` §1.3/6.1); verificacion manual pendiente por el usuario (throttling de red en devtools
para confirmar que el timeout corta y que "Reintentar" funciona).

## Pendiente

- El estándar del frontend ya apunta a este documento (actualizado el mismo dia).
- Nada pendiente de este documento: Grupo A, Grupo B y exportacion/vista previa quedaron cubiertos el
  mismo dia (2026-07-10).
