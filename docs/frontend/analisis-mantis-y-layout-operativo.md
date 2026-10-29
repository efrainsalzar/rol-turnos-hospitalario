# Análisis Mantis y Layout Operativo

## A. Diagnóstico del frontend actual

El frontend actual ya es funcional y tiene una base técnica sana:

- usa `React + MUI + Vite + TypeScript`
- tiene shell institucional activo sobre `Mantis Free`
- consume la API real por servicios y hooks
- ya existen componentes compartidos operativos
- la navegación y permisos están razonablemente centralizados

El problema ya no está en “tener pantallas”, sino en que **la estructura visual de página todavía no es una convención obligatoria**.

Hoy conviven tres capas visuales:

1. `Mantis Free` como shell:
   - drawer
   - header
   - spacing general
   - breadcrumb global
   - `MainCard`

2. wrappers propios reutilizables:
   - `OperationalPageLayout`
   - `OperationalToolbar`
   - `OperationalFiltersBar`
   - `OperationalTableCard`
   - `ActionButtonGroup`
   - `OperationalScopeSummary`
   - componentes de planificación

3. composición ad hoc en cada pantalla:
   - `MainCard` usados directamente
   - `Stack` manuales para headers
   - botones definidos por pantalla
   - filtros con tamaños distintos
   - subtítulos construidos de maneras diferentes
   - tablas protagonistas en algunas vistas, secundarias en otras

Resultado:

- las pantallas funcionan
- el sistema ya se siente más estable que antes
- pero todavía no se percibe como una sola plataforma institucional

El patrón real actual es:

```text
shell consistente
+
páginas semiestandarizadas
+
detalles y variaciones locales por pantalla
```

## B. Qué ofrece Mantis Free y cómo deberíamos aprovecharlo

### 1. Patrón de layout original de Mantis Free

`Mantis Free` ya trae una convención fuerte a nivel shell:

- `DashboardLayout`
  - header
  - drawer
  - contenedor `main`
  - padding global
  - breadcrumb automático
  - footer

Archivo clave:

- `src/layout/Dashboard/index.jsx`

Ese layout ya define:

- área útil
- ancho y padding base
- ritmo vertical general
- comportamiento responsive del contenedor principal

### 2. Componentes Mantis útiles

Los componentes que sí conviene conservar como base son:

- `MainCard`
- `Breadcrumbs`
- `Loadable`
- estructura del `DashboardLayout`
- `Drawer/Header/Footer`
- `AnalyticEcommerce` y otros cards estadísticos solo para dashboards o resúmenes

### 3. Qué no ofrece Mantis Free para este proyecto

Mantis no trae, de fábrica, una plantilla de página pensada para operación hospitalaria intensiva.

No trae una convención específica para:

- bandejas operativas con filtros compactos
- matrices tipo Excel
- toolbar operativa de edición rápida
- contexto por servicio/departamento
- jerarquía institucional de acciones por rol

Mantis resuelve bien:

- el shell
- la navegación
- la base de cards y tablas

Pero no resuelve bien por sí solo:

- el **tipo de pantalla hospitalaria**
- la **semántica operativa**
- la **consistencia entre dominios**

## C. Qué estamos haciendo mal actualmente

### 1. Duplicamos la semántica del header de página

`DashboardLayout` ya renderiza `Breadcrumbs` globales automáticos a partir del menú.

Pero las páginas operativas además renderizan:

- breadcrumb propio
- título propio
- descripción propia

Eso no es grave, pero genera dos problemas:

- semántica duplicada
- sensación de “shell Mantis + página paralela”

### 2. Confundimos componente con plantilla

Se construyeron varios componentes útiles, pero todavía no existe una **plantilla de página realmente obligatoria por tipo**.

Hoy una pantalla puede usar:

- `OperationalPageLayout`
- o `MainCard` directo
- o `PlanificacionPageHeader`
- o header manual con `Stack + Typography`

Entonces el problema no es solo de componentes.  
Es de **estructura de composición**.

### 3. `CollectionFiltersBar` nació como wrapper, no como sistema

`CollectionFiltersBar` mejora alineación y wrapping, pero no define:

- jerarquía de acciones
- contexto de página
- relación entre filtros y tabla
- cuándo usar card, cuándo no
- cómo convive con acciones primarias

Por eso ayuda, pero no estandariza por completo.

### 4. Mezclamos componentes transversales y específicos de dominio

En `components/system` hoy conviven:

- piezas verdaderamente transversales
- piezas específicas de planificación
- wrappers genéricos
- componentes “provisorios” convertidos en estructura base

Ejemplos:

- `OperationalPageLayout` es transversal
- `PlanificacionOperationalToolbar` es específico de matriz
- `CollectionFiltersBar` y `OperationalFiltersBar` compiten parcialmente
- `StatusChip`, `PlanificacionStatusChip` y `StandardStatusChip` se solapan semánticamente

### 5. Algunas pantallas siguen usando `MainCard` como layout, no como bloque

`MainCard` debería ser un bloque visual.

Pero en varias pantallas todavía cumple funciones de:

- header
- contenedor de filtros
- contenedor de tabla
- módulo de contexto

Eso genera distinta “respiración” visual según cómo cada página lo arma.

## D. Componentes propios detectados

### Transversales actuales

- `OperationalPageLayout`
- `OperationalToolbar`
- `OperationalFiltersBar`
- `OperationalTableCard`
- `ActionButtonGroup`
- `OperationalScopeSummary`
- `PageBackButton`
- `CollectionTableCard`
- `CollectionFiltersBar`
- `StatusChip`
- `StandardStatusChip`
- `StandardEmptyState`

### Específicos de planificación

- `PlanificacionExportDialog`
- `PlanificacionOperationalLegend`
- `PlanificacionOperationalToolbar`
- `PlanificacionPageHeader`
- `PlanificacionStateActions`
- `PlanificacionStatusChip`
- `PlanificacionSummaryCard`

### Infraestructura de permisos/navegación

- `RequireAuth`
- `RequirePermission`

## E. Componentes duplicados o inconsistentes

### 1. `CollectionFiltersBar` vs `OperationalFiltersBar`

Ambos resuelven casi la misma franja.

Situación actual:

- `CollectionFiltersBar` fue un paso intermedio útil
- `OperationalFiltersBar` es más cercano al sistema visual deseado

Recomendación:

- conservar solo uno como base de futuro
- dejar `CollectionFiltersBar` como legado temporal
- migrar todo hacia `OperationalFiltersBar`

### 2. `CollectionTableCard` vs `OperationalTableCard`

Aquí no hay conflicto real:

- `CollectionTableCard` puede quedar como base estructural
- `OperationalTableCard` debe ser su wrapper operativo

Recomendación:

- conservar ambos
- dejar claro que `CollectionTableCard` es infraestructura visual
- `OperationalTableCard` es contrato operativo

### 3. `StatusChip` vs `StandardStatusChip` vs `PlanificacionStatusChip`

Hoy hay tres niveles:

- `StatusChip`: booleano activo/inactivo
- `StandardStatusChip`: estados genéricos
- `PlanificacionStatusChip`: estados de planificación

Esto puede convivir, pero solo si se documenta bien:

- `StatusChip` para booleanos
- `StandardStatusChip` para estados comunes institucionales
- `PlanificacionStatusChip` si planificación necesita semántica especial

### 4. `OperationalPageLayout` vs `PlanificacionPageHeader`

Hoy `PlanificacionPageHeader` cubre una parte que debería absorber una plantilla estándar.

Recomendación:

- evitar seguir expandiendo `PlanificacionPageHeader` como patrón general
- usarlo solo como transición o como bloque específico si la matriz lo necesita

## F. Pantallas con problemas de layout

### 1. `Planificaciones`

Problemas:

- mezcla una bandeja operativa con un panel lateral de creación
- la tabla compite con `Nueva planificación`
- parte del flujo está arriba y parte a la izquierda

Conclusión:

- es una bandeja operativa, pero hoy está mezclada con un formulario incrustado

### 2. `Visualizacion operativa`

Problemas:

- usa la nueva banda superior, pero el contenido principal sigue siendo muy “manual”
- todavía depende de `MainCard + Table + Stack` sin secciones explícitas

### 3. `Asignaciones`

Mejoró bastante, pero aún mezcla:

- chip de sesión
- filtros
- tabla
- modal

sin una noción clara de “contexto operativo fijo” como barra reutilizable.

### 4. `Matriz mensual`

Es un caso especial y no debe intentar parecer una bandeja.

Su estructura es distinta:

- header específico
- bloque de resumen
- toolbar de edición
- grilla Excel-like
- leyenda
- exportación

No debe forzarse al mismo patrón de tabla simple.

### 5. `Personal`, `Turnos`, `Calendarios`, `Servicios`

Estas ya están parcialmente alineadas, pero aún muestran rastros de migración incremental:

- distintas densidades de subtítulo
- acciones superiores resueltas de forma ligeramente distinta
- modales aún con layouts heterogéneos

## G. Propuesta de sistema visual operacional

La estrategia correcta no es “crear más componentes sueltos”.

La estrategia correcta es:

```text
MANTIS = shell
SYSTEM = plantilla operativa
PANTALLA = composición sobre plantilla
```

Es decir:

1. `Mantis Free` conserva:
   - layout global
   - header
   - drawer
   - breadcrumb global
   - card base

2. Nuestro sistema operativo define:
   - tipos de página
   - barra de contexto
   - toolbar
   - filtros
   - tabla
   - acciones
   - stats

3. Las pantallas solo configuran:
   - contenido
   - funcionalidad
   - contexto
   - permisos

## H. Tipos de páginas estándar recomendadas

No hacen falta infinitos tipos. Hacen falta pocos y claros.

### 1. Bandeja operativa

Ejemplos:

- `Servicios`
- `Asignaciones`
- `Calendarios`
- `Turnos`
- `Personal`
- `Planificaciones`

### 2. Configuración operativa

Ejemplos:

- `Visualizacion operativa`
- `Catalogo de feriados`
- `Incidencias personales`
- `Cargas horarias`

### 3. Matriz mensual

Ejemplo:

- `Planificacion / Matriz`

Es un tipo aparte. No debe tratarse como bandeja.

### 4. Detalle / Ficha

Ejemplos:

- `Servicio detalle`
- `Personal detalle`

### 5. Dashboard / Resumen

Ejemplos:

- `Dashboard`
- `Health`
- futuros resúmenes departamentales

## I. Propuesta de componentes base

### 1. `OperationalPageTemplate`

Sí, conviene crearlo.

Debería reemplazar evolutivamente a `OperationalPageLayout`.

Responsabilidades:

- recibir `pageType`
- componer:
  - título
  - descripción
  - contexto
  - toolbar
  - feedback
  - contenido principal
- no repetir la lógica de espaciado en cada pantalla

Prop recomendadas:

- `title`
- `description`
- `context`
- `actions`
- `filters`
- `stats`
- `feedback`
- `children`
- `mode: 'list' | 'detail' | 'matrix' | 'config' | 'dashboard'`

### 2. `OperationalToolbar`

Debe quedarse.

Pero debe simplificarse como contenedor obligatorio de:

- acciones primarias
- acciones secundarias
- filtros rápidos
- resumen pequeño

### 3. `OperationalFilters`

Conviene que sea el nombre final del patrón.  
`OperationalFiltersBar` puede seguir existiendo, pero debería estabilizarse como el estándar y desplazar a `CollectionFiltersBar`.

### 4. `OperationalTableSection`

Conviene crearlo como evolución semántica de `OperationalTableCard`.

Responsabilidad:

- título de sección
- resumen corto
- tabla
- empty/error/loading
- paginación

`OperationalTableCard` puede seguir siendo wrapper actual, pero el nombre `Section` describe mejor el rol.

### 5. `OperationalActions`

Debe agrupar:

- primary
- secondary
- danger
- icon-only opcional

`ActionButtonGroup` ya es la base.

### 6. `OperationalStats`

Falta una pieza liviana para:

- totales rápidos
- cantidad visible
- personas activas
- horas resumidas

No un dashboard.  
Sí una fila compacta de métricas.

### 7. `OperationalContextBar`

Falta una barra clara y reutilizable para:

- departamento actual
- servicio actual
- período actual
- sesión actual

Hoy eso está repartido entre:

- `OperationalScopeSummary`
- chips
- alerts
- textos sueltos

## J. Reglas concretas de diseño

### 1. Anchos

- no usar `fullWidth` en desktop salvo:
  - textarea
  - modal muy angosto
  - único control de fila
- selects/filter inputs:
  - `minWidth` entre `180` y `260`
- filtros nunca deben estirarse arbitrariamente

### 2. Spacing

- spacing vertical de página:
  - `rowSpacing={3}`
- spacing interno de toolbar/filtros:
  - `1` a `1.25`
- spacing de botones en grupos:
  - `1`

### 3. Botones

Estándar:

- primario:
  - `contained`
  - una sola acción principal por bloque
- secundario:
  - `outlined`
- peligro:
  - `outlined` rojo o `contained` rojo solo si la acción es verdaderamente destructiva

No mezclar:

- `text`
- `outlined`
- `contained`

sin jerarquía explícita.

### 4. Filtros

- una sola franja de filtros por página
- acciones de limpiar/recargar dentro de la misma banda
- contexto único reemplaza filtro si el alcance es único
- no repetir un card adicional de “filtros” si ya hay toolbar

### 5. Cards

Uso recomendado:

- `MainCard` como bloque funcional
- no como layout completo de página
- una página no debería necesitar muchos `MainCard` si en realidad solo tiene:
  - contexto
  - filtros
  - tabla

### 6. Tablas

- la tabla debe ser protagonista
- encabezado compacto
- summary arriba
- paginación consistente
- fila de acciones compacta y con misma jerarquía en todo el sistema

### 7. Responsive

- móvil:
  - filtros en columna
  - botones agrupados en wrap o columna
- desktop:
  - filtros compactos
  - acciones a la derecha
  - tabla como bloque dominante

## K. Estrategia de migración progresiva

### Etapa 1. Congelar la base

No seguir creando wrappers nuevos sin decidir la plantilla final.

Primero estabilizar:

- `OperationalPageLayout`
- `OperationalToolbar`
- `OperationalFiltersBar`
- `OperationalTableCard`
- `ActionButtonGroup`

### Etapa 2. Declarar tipos de página

Formalizar:

- `list`
- `config`
- `detail`
- `matrix`
- `dashboard`

### Etapa 3. Crear la plantilla

Implementar `OperationalPageTemplate` sobre Mantis, no contra Mantis.

Debe apoyarse en:

- `MainCard`
- grid spacing actual
- breadcrumb global existente

### Etapa 4. Migrar por familias

Orden recomendado:

1. bandejas operativas
2. configuración operativa
3. detalles/fichas
4. matriz mensual
5. dashboards/resúmenes

### Etapa 5. Dejar legado claro

Marcar como legado:

- `CollectionFiltersBar`
- headers manuales con `Stack + Typography`
- botones por fila sin `ActionButtonGroup`

## L. Qué pantalla migrar primero

La siguiente pantalla a estabilizar primero debería ser:

### `Planificaciones`

Porque hoy concentra los problemas más estructurales:

- bandeja + formulario lateral
- acciones de flujo
- exportación
- estado
- filtros

Resolver `Planificaciones` como patrón de **bandeja operativa compleja** desbloquea el resto.

Segundo paso:

- `Visualizacion operativa`

Tercer paso:

- `Personal`

## M. Riesgos

### 1. Pelear contra Mantis

Si intentamos reemplazar el shell de Mantis, vamos a perder tiempo.

No hace falta.

### 2. Crear demasiados wrappers

Si cada problema genera un componente nuevo, vamos a volver a fragmentar el frontend.

### 3. Sobrecargar la plantilla

La plantilla debe ser operativa, no abstracta en exceso.

### 4. Romper la matriz por querer unificar todo

La matriz mensual es una categoría distinta.  
No debe forzarse al mismo layout que una bandeja simple.

### 5. Mantener breadcrumbs duplicados

Mientras `DashboardLayout` ya renderiza breadcrumb global y las páginas vuelven a renderizar breadcrumb manual, seguirá habiendo una sensación de doble estructura.

Esto debe decidirse explícitamente en la siguiente iteración.

## N. Próximo prompt recomendado para implementar

```text
Actúa como arquitecto frontend senior especializado en React, MUI, Mantis Free y sistemas operativos hospitalarios.

Proyecto:
roles-turnos

Objetivo:
Implementar la primera consolidación real del layout operativo sin tocar backend ni lógica de negocio.

Debes usar como base el documento:
docs/frontend/analisis-mantis-y-layout-operativo.md

Tareas:

1. Crear `OperationalPageTemplate` como evolución controlada de `OperationalPageLayout`
2. Definir variantes:
   - list
   - config
   - detail
   - matrix
3. Mantener compatibilidad con Mantis:
   - usar `DashboardLayout`
   - reutilizar `MainCard`
   - no romper breadcrumb global todavía
4. Consolidar:
   - `OperationalToolbar`
   - `OperationalFiltersBar`
   - `OperationalTableCard`
   - `ActionButtonGroup`
5. Marcar `CollectionFiltersBar` como legado y dejar de usarlo en pantallas nuevas
6. Migrar solo estas pantallas:
   - Planificaciones
   - Visualizacion operativa
   - Personal
7. No tocar rutas ni backend
8. Ejecutar typecheck del frontend

Salida esperada:
- refactor controlado
- plantilla operativa reutilizable
- menos layout ad hoc por pantalla
- documentación actualizada
```

## Respuestas directas a las preguntas clave

### 1. ¿Qué patrón de layout usa Mantis Free originalmente?

Usa:

- `DashboardLayout`
- breadcrumb global automático
- `MainCard`
- grids de página con encabezado simple

### 2. ¿Estamos usando correctamente sus componentes?

Parcialmente sí.

- bien: shell, drawer, header, `MainCard`
- mal: páginas siguen montando estructuras paralelas encima

### 3. ¿Qué componentes propios existen hoy?

Existen dos familias:

- operativos transversales
- específicos de planificación

Listados arriba en secciones D y E.

### 4. ¿Cuáles deberían conservarse?

Conservar:

- `OperationalPageLayout` como base transitoria
- `OperationalToolbar`
- `OperationalFiltersBar`
- `OperationalTableCard`
- `ActionButtonGroup`
- `OperationalScopeSummary`
- `PageBackButton`
- `CollectionTableCard`

### 5. ¿Cuáles deberían reemplazarse?

Reemplazar progresivamente:

- `CollectionFiltersBar`
- headers manuales por pantalla
- grupos de botones por fila hechos con `Stack + Button`

### 6. ¿Por qué `CollectionFiltersBar` no resuelve la consistencia completa?

Porque resuelve el renglón de filtros, pero no la plantilla completa:

- no define contexto
- no define acciones primarias
- no define relación con la tabla
- no unifica layout de página

### 7. ¿Qué falta: componentes o una plantilla de página?

Falta principalmente una **plantilla de página**.

### 8. ¿Conviene crear `OperationalPageTemplate`?

Sí.

Es el siguiente paso correcto.

### 9. ¿Cuántos tipos reales de pantalla necesitamos?

Cinco:

- bandeja operativa
- configuración operativa
- matriz mensual
- detalle/ficha
- dashboard/resumen

### 10. ¿Qué estructura estándar debe tener cada tipo?

Ver secciones H e I.

### 11. ¿Cómo organizar título, breadcrumb, descripción, contexto, filtros, estadísticas, acciones, tabla y paginación?

La regla debería ser:

1. shell Mantis
2. `OperationalPageTemplate`
3. contexto / toolbar / stats
4. tabla o contenido principal
5. paginación dentro de la sección de tabla

### 12. ¿Cómo evitar `fullWidth` y tamaños arbitrarios?

Con reglas explícitas:

- filtros compactos
- `minWidth` estandarizados
- no usar `fullWidth` en desktop salvo excepción documentada

### 13. ¿Cómo unificar botones?

Con `ActionButtonGroup` como estándar único de jerarquía:

- primary
- secondary
- danger

### 14. ¿Cómo unificar filtros?

Usando una sola familia:

- `OperationalFiltersBar`

y retirando progresivamente `CollectionFiltersBar`.

### 15. ¿Cómo migrar sin romper pantallas?

De forma progresiva por tipo de página, no por pantalla aislada.

El orden recomendado está en la sección K.
