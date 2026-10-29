# Estandar Visual Operativo

## Objetivo

Dejar una base visual comun para las pantallas operativas del frontend sin pelear contra `Mantis Free`, sin rehacer rutas ni logica de negocio y sin volver a construir layouts pantalla por pantalla.

La base visual oficial del sistema ahora es:

- `Mantis Free` como shell institucional
- `Material UI` como libreria de componentes
- `OperationalPageTemplate` como plantilla de pagina operativa

## Plantilla oficial

La plantilla oficial para nuevas pantallas operativas es:

- `src/components/system/OperationalPageTemplate.tsx`

Responsabilidades:

- titulo
- descripcion breve
- contexto operativo
- filtros
- estadisticas compactas
- acciones
- resumen rapido
- area principal de contenido

Variantes soportadas:

- `list`
- `config`
- `detail`

## Componentes oficiales

Usar primero estos componentes antes de crear wrappers nuevos:

- `OperationalPageTemplate`
- `OperationalContextBar`
- `OperationalToolbar`
- `OperationalFiltersBar`
- `OperationalTableCard`
- `ActionButtonGroup`
- `OperationalScopeSummary`
- `OperationalStats`
- `StandardStatusChip`
- `StandardEmptyState`
- `PageBackButton`
- `FormDialog` (dialog de crear/editar; ver `docs/frontend/estandar-modales.md`)
- `ConfirmDialog` (dialog de confirmacion; ver `docs/frontend/estandar-modales.md`)

## Componentes base que se conservan

Se mantienen como infraestructura o compatibilidad:

- `MainCard`
- `CollectionTableCard`
- `OperationalPageLayout`

Uso recomendado:

- `MainCard`: bloque funcional puntual, no layout completo de pagina
- `CollectionTableCard`: infraestructura de tabla base
- `OperationalPageLayout`: compatibilidad legacy; las pantallas nuevas deben ir a `OperationalPageTemplate`

## Componentes legacy

Estos componentes quedan como legado y no deben ser la base de nuevas pantallas:

- `CollectionFiltersBar`

Motivo:

- fue util como wrapper intermedio
- no define por si solo jerarquia de acciones ni estructura de pagina
- el estandar actual debe pasar por `OperationalPageTemplate + OperationalFiltersBar`

## Estructura estandar de pantalla

Toda pagina operativa nueva debe seguir este orden:

### 1. Header

- titulo corto
- descripcion breve
- sin breadcrumbs manuales duplicados

### 2. Contexto operativo

Ejemplos:

- departamento actual
- servicio actual
- rol activo
- periodo actual

Debe ser compacto y leerse rapido.

### 3. Barra unica de operacion

Incluye:

- filtros
- busqueda
- acciones primarias y secundarias
- resumen rapido

No separar filtros y acciones en cards distintas salvo excepcion fuerte.

### 4. Contenido principal

- tabla
- lista
- configuracion
- ficha

La tabla debe ser la protagonista cuando la pantalla es de bandeja.

### 5. Paginacion

- dentro del bloque de tabla
- sin scroll interno gigante como sustituto de paginacion

## Reglas de filtros

- no usar `fullWidth` en desktop salvo justificacion fuerte
- mantener selects compactos
- la busqueda puede crecer mas que los selects
- `Limpiar filtros` y `Recargar` viven en la misma barra operativa
- evitar cards solo para filtros si el template ya tiene barra superior

Tamanos de referencia:

- select corto: `180px`
- select normal: `220px`
- select largo: `260px`
- busqueda: `min 280px`, flexible

Helpers:

- `src/utils/operational-ui.ts`
- `operationalFieldSx`
- `compactSelectMenuProps`

## Reglas de botones

Jerarquia oficial:

- accion principal: `contained`
- accion secundaria: `outlined`
- accion destructiva: `outlined` color `error`
- navegacion secundaria: `text`

Mapeo en componentes:

- `ActionButtonGroup tone="primary"`
- `ActionButtonGroup tone="secondary"`
- `ActionButtonGroup tone="danger"`
- `ActionButtonGroup tone="ghost"`

Ejemplos:

- `Nuevo`, `Crear`, `Preparar siguiente mes`: primaria
- `Recargar`, `Limpiar filtros`, `Configurar`: secundaria
- `Desactivar`, `Quitar asignacion`: peligro
- `Volver a horarios`, `Volver a planificaciones`: navegacion secundaria

## Reglas de cards

- no usar cards gigantes para resolver layout
- no encerrar cada bloque pequeno en un card independiente
- `MainCard` debe representar un bloque funcional
- el template ya resuelve header, contexto y barra operativa

## Como crear una nueva pantalla

### Caso base de bandeja

1. crear la pagina con `OperationalPageTemplate`
2. definir `title` y `description`
3. pasar `context` solo si aporta
4. pasar `filters`
5. pasar `actions`
6. pasar `stats`
7. renderizar `OperationalTableCard` como contenido principal

### Ejemplo minimo

```tsx
<OperationalPageTemplate
  title="Servicios"
  description="Consulta operativa de servicios."
  context={<OperationalScopeSummary label="Departamento actual" name={departamento.nombre} />}
  filters={<TextField label="Servicio" size="small" sx={operationalFieldSx.normal} />}
  actions={[{ label: 'Recargar', onClick: reload, tone: 'secondary' }]}
  stats={<OperationalStats items={[{ label: 'Visibles', value: total }]} />}
  summary={`${total} registros`}
>
  <Grid size={12}>
    <OperationalTableCard ... />
  </Grid>
</OperationalPageTemplate>
```

## Pantallas ya migradas al estandar

- `Servicios`
- `Asignaciones`
- `Calendarios`
- `Horarios del servicio`
- `Visualizacion operativa`
- `Planificaciones`
- `Personal`
- `Departamentos`

## Pantallas no incluidas en este estandar por ahora

- `planificacion-matriz.tsx`

Motivo:

- la matriz mensual tiene una semantica operativa distinta
- necesita su propia capa visual y de interaccion

## Migracion progresiva

Orden recomendado:

1. bandejas operativas
2. configuraciones operativas
3. fichas y detalles
4. modales y formularios secundarios
5. matriz mensual en una iteracion aparte

## Regla final

Si una pantalla nueva requiere:

- titulo
- contexto
- filtros
- acciones
- tabla o card principal

entonces debe partir de `OperationalPageTemplate`.
