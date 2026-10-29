# Estandar de Modales (Dialogs)

## Objetivo

Dejar un patron unico para los dialogs del frontend, igual que ya existe para pantallas completas
(`OperationalPageTemplate`, ver `docs/frontend/estandar-visual-operativo.md`). Hoy cada pantalla
resuelve sus dialogs por su cuenta: hay 4 variantes estructurales distintas conviviendo, sin wrapper
compartido formal, y con inconsistencias visibles (ancho, boton de guardar, manejo de errores).

Este documento es tambien la hoja de seguimiento: cada dialog tiene un estado que se va actualizando
a medida que se migra.

**Estado general: migracion completa (2026-07-10).** Los 14 dialogs relevados (Grupos A-D) estan
migrados o confirmados como correctos sin cambios. Ver la hoja de seguimiento mas abajo para el detalle
y los bugs reales encontrados/corregidos en el camino. (El 2026-07-08 se habia marcado completa por
error: `EditToolVisualDialog`/D4 solo tenia el `git mv`, no la migracion de contenido — cerrado recien
el 2026-07-10, ver D4 y "Avance de esta ronda".)

## Estado actual (relevamiento 2026-07-08)

23 paginas reales revisadas (`src/pages/{organizacion,personal,seguridad,operacion,planificacion,
sistema,reportes}`). 14 dialogs encontrados, repartidos en 4 variantes:

### Variante 1 — "par CRUD de referencia"

Un `dialogMode` (`create`/`edit`, a veces mas un confirm de baja aparte), primitivas MUI crudas en la
pagina. Es lo mas parecido a un estandar de facto hoy.

### Variante 2 — "mega-dialog multi-modo"

Un solo `Dialog` cuyo titulo/cuerpo/boton bifurcan segun `dialogMode` (3 o mas modos). Son los casos
mas grandes y menos estandarizados.

### Variante 3 — "componente extraido y reusado"

Dialog propio en `components/system/`, controlado por props, usado en 2+ paginas. Patron correcto
cuando el dialog es complejo o compartido — no necesita migrarse, es la meta para los casos grandes.

### Variante 4 — "dialog angosto no-formulario"

Confirmaciones de baja, texto libre, o interacciones puntuales sin formulario complejo.

## Inconsistencias detectadas (motivo del estandar)

- `maxWidth` varia sin regla documentada (`xs`/`sm`/`md`/`xl`) entre dialogs de complejidad similar.
- El estado "guardando" se muestra de 3 formas distintas: solo texto, texto + `CircularProgress`, o
  nada.
- El boton Cancelar es `variant="outlined"` en todos lados excepto uno (boton de texto plano).
- `useFormValidation` (patron oficial segun el estándar de formularios del frontend) solo esta en 7 de 14 dialogs; los
  que faltan son justo los mas grandes/complejos.
- Un componente en `components/system/` esta mal nombrado: se llama `EditToolVisualPopover` pero
  renderiza un `Dialog`, no un `Popover`.
- `planificaciones.tsx` importa `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` sin usarlos
  nunca (imports muertos).
- La lista "pendiente de migrar a `useFormValidation`" de el estándar de formularios del frontend esta desactualizada:
  nombra 3 archivos que ya no tienen dialog propio o ya estan migrados.

## Patron oficial

Dos wrappers en `components/system/`, siguiendo el mismo criterio que `OperationalPageTemplate`: no
reinventar layout pantalla por pantalla / dialog por dialog. **Ya existen** (creados 2026-07-08,
validados en A1/A2 — `departamentos.tsx`), no hay que recrearlos en cada migracion.

### `FormDialog` — `src/components/system/FormDialog.tsx`

Para todo dialog de creacion/edicion con campos obligatorios. Estandariza:

- `maxWidth` configurable por prop (default `"sm"`; usar `"md"` solo cuando el contenido lo justifique,
  ej. `roles.tsx` con su matriz de permisos)
- Cancelar (`variant="outlined"`) / Guardar (`variant="contained"`), mismo texto de estado
  ("Guardando...") sin spinner, para no tener 3 variantes
- el formulario interno debe usar `useFormValidation` como unico canal de error de campo (convencion,
  no forzado por tipos — no usar un `Alert` paralelo para errores de campo)
- el contenido del modal debe mantener una grilla estable: si un campo aparece o desaparece por estado,
  no debe "romper" la composicion visual de toda la ventana
- `extraAction?: ReactNode` (agregado 2026-07-10, ver D4 mas abajo): accion secundaria del footer,
  alineada a la izquierda separada de Cancelar/Guardar (ej. "Desactivar"). Prop opcional, no afecta a
  ningun dialog que no la use — reservar para casos que genuinamente necesiten una tercera accion, no
  usar como atajo para lo que ya resuelve Cancelar/Guardar

### `ConfirmDialog` — `src/components/system/ConfirmDialog.tsx`

Para los confirm-de-baja que hoy son copy-paste (`departamentos.tsx`, `servicios.tsx` y cualquier
pantalla futura).

### Los mega-dialogs no son solo "envolver"

**Decision confirmada 2026-07-08:** `usuarios.tsx`, `personal/index.tsx` y `personal/asignaciones.tsx`
se parten en un componente de dialog por modo (crear/editar/dar-de-alta/etc.), cada uno usando
`FormDialog` limpio, en vez de mantener un solo componente con `dialogMode` bifurcando internamente.
Cada dialog nuevo va en `components/system/` cuando tenga sentido reusarlo, o queda local a la pagina si
es especifico de ese flujo.

## Estrategia para modales con campos condicionales

Cuando un `Switch`, `Checkbox` o selector cambia si aparece un input extra, seguir este criterio:

- no insertar y quitar el campo condicional en medio de una fila pensada para dos columnas si eso altera
  toda la geometria del modal
- ubicar la decision en una fila propia y el campo dependiente en otra fila propia, idealmente a ancho
  completo
- si el campo depende de una condicion momentanea y no debe salirse del layout, usar un contenedor
  animado tipo `Collapse` o reservar el espacio de forma consistente
- preferir `Grid size={12}` para bloques que aparecen y desaparecen, y dejar las columnas de datos
  estables abajo
- si el cambio de estado explica por que falta un campo, resolverlo con texto corto junto al control,
  no con otro bloque visual grande

Objetivo visual:

- que el usuario lea "decision" y luego "detalle"
- que el modal no cambie de altura o de ancho de forma brusca
- que no parezca que el formulario se rompio al activar una opcion

## Alerts y validaciones

Reglas comunes para todo modal:

- usar `Alert` solo para contexto, advertencia o bloqueo de negocio
- usar `useFormValidation` para faltantes de campos obligatorios
- evitar duplicar en un `Alert` lo mismo que ya dice el `helperText` del campo
- evitar alerts estaticas si no dependen de estado real del formulario
- si hay varios mensajes posibles, mostrar solo los necesarios para la decision actual

Estilo de mensajes:

- cortos
- concretos
- en voz operativa
- sin explicar mas de lo necesario

Ejemplos de tono recomendado:

- `Seleccione un departamento.`
- `El servicio es obligatorio.`
- `Sin servicios en este departamento.`
- `Ya existe un jefe activo en esta unidad.`
- `Primero cierre la asignacion actual.`

Ejemplos de tono a evitar:

- explicaciones largas que repiten la misma idea en tres frases
- mensajes tecnicos de backend en la UI cuando hay una version operativa mas clara
- alerts que narran el formulario completo en lugar de ayudar a completar un paso

Regla practica:

- si el mensaje corrige un campo, va en el campo
- si el mensaje condiciona el flujo, va en `Alert`
- si el mensaje solo repite, se elimina

## Metodo de revision dialog por dialog

Vamos a revisar los modales uno por uno, con este orden:

1. estabilidad del layout
2. campos condicionales
3. alerts
4. validaciones
5. textos finales

Checklist por cada modal:

- la grilla no salta al activar el `Switch`
- el bloque condicional entra con jerarquia visual clara
- los `Alert` no repiten `helperText`
- los errores de campo aparecen por `useFormValidation`
- los mensajes son cortos y coherentes con el contexto
- el footer del modal se mantiene estable

## Avance de esta ronda

Dialogs ya ajustados en esta sesion:

- `AsignacionAddSecondaryDialog`
- `PersonalAltaDialog`
- `AsignacionEditDialog`
- `AsignacionCloseDialog`
- `PersonalFormDialog`
- `UsuarioFormDialog`
- `UsuarioResetPasswordDialog`
- `TurnoFormDialog`
- `PlanificacionExportDialog`
- `ImpactoUsoDialog`

Resumen del criterio aplicado:

- se separaron decisiones y campos dependientes con `Collapse` cuando el cambio de estado afectaba la
  grilla
- se acortaron `Alert` y `helperText` para evitar repeticion
- se simplificaron mensajes de bloqueo y validacion
- se mantuvo `useFormValidation` como canal para errores de campo

**Cerrado (2026-07-10):** `EditToolVisualDialog` era el unico dialog de `components/system/` que solo
habia recibido el rename y nunca la migracion real de contenido — ya migrado a `FormDialog` (ver D4).

Se verifico ademas, buscando directamente `import ... from '@mui/material/Dialog'` fuera de
`FormDialog.tsx`/`ConfirmDialog.tsx`, que no quedan dialogs crudos sin registrar en este documento. Los
3 usos encontrados ya estaban decididos:

- `planificacion-matriz.tsx` (observacion mensual) — C2, texto libre sin validacion, decision explicita
  de dejarlo tal cual
- `ImpactoUsoDialog.tsx` — D2, confirmacion con tabla de detalle de impacto, forma distinta a un
  formulario o un confirm simple, ya simplificado
- `EditToolVisualDialog.tsx` — D4, ya migrado (ver arriba)

No hay pendientes abiertos de este documento.

## Hoja de seguimiento — dialog por dialog

Estado: `pendiente` / `en progreso` / `hecho`. Actualizar esta tabla en cada sesion que se toque un
dialog.

### Grupo A — CRUD de referencia (variante 1, migracion mas simple)

| # | Dialog | Ubicacion | `useFormValidation` | Accion propuesta | Estado |
|---|---|---|---|---|---|
| A1 | Departamento (crear/editar) | `src/pages/organizacion/departamentos.tsx` | si | Migrado a `FormDialog` | **hecho** |
| A2 | Departamento (confirmar baja) | `src/pages/organizacion/departamentos.tsx` | n/a | Migrado a `ConfirmDialog` | **hecho** |
| A3 | Servicio (crear/editar) | `src/pages/organizacion/servicios.tsx` | si | Migrado a `FormDialog` | **hecho** |
| A4 | Servicio (confirmar baja) | `src/pages/organizacion/servicios.tsx` | n/a | Migrado a `ConfirmDialog` | **hecho** |
| A5 | RolSeguridad (crear/editar) | `src/pages/seguridad/roles.tsx` | si | Migrado a `FormDialog` (`maxWidth="md"`) | **hecho** |
| A6 | Cargo (crear/editar) | `src/pages/personal/cargos.tsx` | si (agregado) | Bug real corregido: no habia ninguna validacion de campo, un codigo/nombre vacio llegaba crudo al backend y solo mostraba el error tecnico por toast. Se agrego `useFormValidation` + migrado a `FormDialog` | **hecho** |
| A7 | Tipo de feriado (crear/editar) | `src/pages/operacion/tipos-feriado.tsx` | si | Migrado a `FormDialog`; perdio el `CircularProgress` del boton Guardar (esperado, `FormDialog` estandariza a solo texto) | **hecho** |
| A8 | Incidencia/dia general (crear/editar) | `src/pages/operacion/incidencia-personal-base.tsx` | si | **Bug de datos corregido**: `handleSave` pisaba siempre `esLaborable`/`generaHorasTrabajadas`/`computaParaMetaHoras`/`requiereRespaldo` a `false` al guardar, incluso al editar — resetea en silencio esos flags (afectan calculo de horas de la matriz) cada vez que se edita una incidencia que los tenia en `true`. Corregido para preservar el valor cargado en edicion y usar `false` solo como default en creacion. Migrado a `FormDialog` | **hecho** |
| A9 | Carga horaria (crear/editar) | `src/pages/operacion/cargas-horarias.tsx` | si | Migrado a `FormDialog`. Nota menor sin corregir: "Horas base por dia" no valida, un campo vacio se envia como `0` — pero el backend permite `0` explicitamente (`@Min(0)`), asi que podria ser intencional (no confirmado como bug) | **hecho** |

### Grupo B — mega-dialogs multi-modo (variante 2, requiere decision de diseno primero)

| # | Dialog | Ubicacion | Modos | `useFormValidation` | Problema principal | Estado |
|---|---|---|---|---|---|---|
| B1 | Usuario (crear/editar/resetear password) | `src/pages/seguridad/usuarios.tsx` | 3 → partido en 2 componentes | si | **Bug corregido**: `resetPassword` heredaba las validaciones de rol/personal de crear/editar (`saveBlockedReason` exigia `idRolSeguridad`), bloqueando el reseteo de password para usuarios sin rol asignado, aunque esos campos ni se muestran en ese modo. **Segundo bug corregido**: en editar, la confirmacion de password nueva no se validaba (`requiresPassword` era `false`), asi que un typo en la confirmacion se guardaba sin avisar. Partido en `UsuarioFormDialog` (crear+editar, `components/system/`) y `UsuarioResetPasswordDialog` (aparte, minimo, sin campos de rol/personal) | **hecho** |
| B2 | Personal (crear/editar/dar de alta) | `src/pages/personal/index.tsx` | 3 → partido en 2 componentes | no → si (agregado) | **Bug corregido**: `buildPersonalPayload`/`buildInitialAsignacionPayload` no validaban nada en frontend — nombres/apellido/CI/cargo vacios (o los campos de la asignacion inicial) llegaban crudos al backend, que si valida (`CrearPersonalDto`), mostrando solo un error tecnico generico por toast. Se agrego `useFormValidation` completo. Partido en `PersonalFormDialog` (crear+editar, incluye el bloque opcional de "asignacion inicial" del modo crear) y `PersonalAltaDialog` (aparte — "Dar de alta en Asignaciones" es una accion distinta sobre personal existente, con su propia logica de deteccion de jefatura activa) | **hecho** |
| B2-fix | Personal — hallazgos de la revision post-migracion (2026-07-08) | `PersonalFormDialog.tsx`, `PersonalAltaDialog.tsx` | — | — | **3 problemas reales corregidos**: (1) checkbox "Crear asignacion inicial" ahora arranca **desmarcado** (antes `true` por defecto); (2) `MenuItem value={item.id}` (numero) en 5 selects de `PersonalFormDialog` en vez de `value={String(item.id)}` — esto era inofensivo antes (sin validacion), pero al agregar `useFormValidation` hacia que `isBlank()` tratara un campo recien seleccionado como "vacio" (`isBlank` exige `typeof value === 'string'`), causando falsos bloqueos de envio; corregido en los 5 selects; (3) faltaban marcadores visuales `required` en varios campos condicionalmente obligatorios (Departamento operativo, Fuente/item, RolSeguridad funcional, Servicio) en ambos dialogs — agregados. Se agrego cobertura de test backend nueva (`crear-personal.dto.spec.ts`, `crear-asignacion.dto.spec.ts`) confirmando que el contrato de payload que arma el frontend es exactamente el que el backend exige, y que campos vacios si son rechazados (11 tests nuevos, suite completa en 271 tests) | **hecho** |
| B3 | Asignaciones (editar/jefatura/cerrar/secundaria) | `src/pages/personal/asignaciones.tsx` | 4 → partido en 3 componentes | no → si (agregado, conservador) | **Bug de integridad de datos corregido**: `jefeActualEnUnidad` (deteccion de "esta unidad ya tiene un jefe activo") buscaba en `asignaciones.data.data`, que desde una sesion anterior pagina en SQL real — si el jefe activo de la unidad no estaba en la pagina cargada, la deteccion lo pasaba por alto en silencio y permitia una jefatura duplicada. Corregido usando el endpoint dedicado `personalApi.getJefaturaActiva()` (mismo patron ya usado en `PersonalAltaDialog`, B2). **Cascada duplicada corregida**: el modo "add-secondary" reimplementaba manualmente el filtrado departamento→servicio en vez de usar `useDepartmentServiceCascade` (el archivo ya importaba el hook para el filtro de pagina, pero no lo reusaba aqui) — ahora lo usa correctamente. **Servicios mal escalados corregidos**: el dialog de editar/jefatura usaba la lista de servicios ya acotada por el *filtro de la tabla*, no por el departamento elegido dentro del dialog — mover a alguien a un departamento distinto al filtrado dejaba la lista vacia; ahora tiene su propia consulta escalada por su propia seleccion (igual patron que B2). Canal de error `dialogFeedback` eliminado (toast + `useFormValidation` inline, igual que el resto). Boton Cancelar ahora usa `variant="outlined"` (heredado de `FormDialog`). Partido en `AsignacionEditDialog` (editar+jefatura combinados, ~90% de logica compartida, mismo criterio que B1/B2), `AsignacionCloseDialog` y `AsignacionAddSecondaryDialog` (ambos aparte — acciones genuinamente distintas). `useFormValidation` agregado de forma conservadora (solo campos donde ya habia un `throw` manual explicito o eran inequivocamente obligatorios) para no inventar reglas de negocio nuevas en un flujo ya intrincado | **hecho — Grupo B completo** |
| B3-fix | `AsignacionEditDialog` (modo jefatura) — limpieza post-rediseno del flujo de jefatura (2026-07-10) | `AsignacionEditDialog.tsx` | — | — | **Ruido de `Alert` corregido**: el modo "Gestionar jefatura" llego a acumular hasta 8 `Alert` distintos; 2 eran estaticos (no dependian de ningun estado: el intro generico y uno explicando el modelo de permisos en prosa), 2 duplicaban texto a texto el `helperText` que ya tenia el campo "Servicio destino", y 2 repetian la misma informacion ("jefe actual: X") en dos alerts seguidos — se elimino lo estatico/duplicado, fusionando el par redundante en uno solo. **Falta de validacion visual corregida**: "Servicio destino" no pasaba por `useFormValidation`, asi que enviar el formulario sin elegirlo solo mostraba un toast, sin borde rojo ni foco automatico como si tienen `idRolFuncional`/`idCargaHoraria` en el mismo dialog — se agrego la regla `idServicio` (obligatoria solo cuando el rol elegido la exige) y se cambio el `helperText` manual del campo por `validation.fieldProps('idServicio', ...)`, mismo patron que el resto | **hecho** |

### Grupo C — dialogs angostos no-formulario (variante 4)

| # | Dialog | Ubicacion | Patron actual | Accion propuesta | Estado |
|---|---|---|---|---|---|
| C1 | Feriado (marcar/quitar) | `src/pages/planificacion/calendarios.tsx` | Migrado a `FormDialog`; los 2 botones toggle se unificaron en un `Switch` estandar | Migrado, sin bugs encontrados | **hecho** |
| C2 | Observacion mensual (texto libre) | `src/pages/planificacion/planificacion-matriz.tsx:757-782` | Correcto tal cual (sin campos obligatorios, no necesita `useFormValidation`) | Ninguna — dejar como esta | n/a |

### Grupo D — componentes ya extraidos (variante 3, patron correcto)

| # | Componente | Ubicacion | Reusado por | Accion propuesta | Estado |
|---|---|---|---|---|---|
| D1 | `TurnoFormDialog` | `src/components/system/TurnoFormDialog.tsx` | `operacion/turnos.tsx`, `planificacion/planificacion-matriz.tsx` | Estandarizado con `FormDialog`, selector de ambito estable y bloques de horario consistentes | **hecho** |
| D2 | `ImpactoUsoDialog` | `src/components/system/ImpactoUsoDialog.tsx` | `operacion/turnos.tsx`, `operacion/incidencia-personal-base.tsx`, `components/system/TurnoFormDialog.tsx`, `planificacion/planificacion-matriz.tsx` | Mensajes y acciones simplificados; mantiene el flujo de confirmacion con detalle de impacto | **hecho** |
| D3 | `PlanificacionExportDialog` | `src/components/system/PlanificacionExportDialog.tsx` | `planificacion/planificaciones.tsx`, `planificacion/planificacion-matriz.tsx` | Estandarizado con `FormDialog`, acciones y vista previa ordenadas en un solo flujo | **hecho** |
| D4 | `EditToolVisualDialog` (renombrado; era `EditToolVisualPopover`) | `src/components/system/EditToolVisualDialog.tsx` | Solo `planificacion/planificacion-matriz.tsx` (uso unico hoy) | Renombrado archivo/import/JSX via `git mv` (2026-07-08). **Migracion real (2026-07-10):** tenia dos acciones que `FormDialog` no soportaba (boton secundario en el cuerpo "Editar horario completo", boton de peligro "Desactivar horario" alineado a la izquierda del footer) — se agrego el prop opcional `extraAction` a `FormDialog` (footer) en vez de dejarlo como excepcion permanente; "Editar horario completo" no necesito cambios de API, ya era `children` normal. De paso se elimino el `CircularProgress` del boton Guardar (la ultima instancia de esa variante que el estandar buscaba eliminar) | **hecho** |

### Aseo suelto (bajo riesgo, independiente de la migracion)

| # | Item | Ubicacion | Estado |
|---|---|---|---|
| L1 | Imports muertos de `Dialog`/`DialogTitle`/`DialogContent`/`DialogActions` | `src/pages/planificacion/planificaciones.tsx` | **hecho** |
| L2 | Lista "pendiente de migrar a `useFormValidation`" desactualizada (nombra `configuracion-operativa.tsx`/`configuracion-servicio.tsx`/`incidencias-personales.tsx`, que ya no tienen dialog propio o ya estan migrados) | el estándar de formularios del frontend | **hecho** — reemplazada por una nota de migracion completa apuntando a este documento |

## Como usar este documento

1. Antes de tocar un dialog, ubicarlo en la tabla correspondiente (A/B/C/D) y leer su fila.
2. Al terminar una migracion, actualizar el `Estado` de esa fila (`pendiente` → `en progreso` →
   `hecho`) en el mismo cambio.
3. Los `ConfirmDialog`/`FormDialog` se crean una sola vez (primer dialog del Grupo A que se migre) y
   despues se reusan — no recrear el wrapper en cada pantalla.
4. Grupo B no se debe tocar sin antes decidir la estrategia (dialog por modo vs. dialog condicional
   migrado) — ver seccion "Los mega-dialogs no son solo envolver" arriba.
