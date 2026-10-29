# Mini Design System Operativo Frontend

## Objetivo

Unificar la experiencia visual de las pantallas operativas sin rehacer la logica de negocio ni duplicar vistas por servicio.

El foco del sistema visual es:

- tablas protagonistas
- filtros compactos
- acciones claras
- espaciado estable
- comportamiento consistente entre jefaturas, RRHH y administracion

## Componentes base

### `OperationalPageLayout`

Responsable de:

- breadcrumb corto
- titulo principal
- descripcion operativa
- bloque de toolbar superior
- bloque de feedback
- espaciado vertical uniforme

Uso recomendado:

- pantallas de bandeja
- catalogos operativos
- vistas de consulta con tabla principal

### `OperationalToolbar`

Responsable de:

- contener filtros y acciones en una sola banda superior
- evitar que cada pantalla arme su propio layout suelto

Uso recomendado:

- acciones superiores de la pagina
- mensajes operativos cortos
- chips de sesion o alcance

### `OperationalFiltersBar`

Reemplaza el uso manual de stacks dispersos para filtros.

Reglas aplicadas:

- nunca forzar `fullWidth` en desktop
- wrapping controlado
- espaciado uniforme
- resumen alineado al extremo derecho cuando hay espacio
- compatible con `TextField`, `Select`, busqueda y contexto fijo

### `OperationalTableCard`

Extiende el uso de `CollectionTableCard` como tabla protagonista.

Responsable de:

- mantener encabezado compacto
- mostrar subtitulo operativo
- respetar paginacion consistente
- reducir la necesidad de layouts ad hoc por pantalla

### `ActionButtonGroup`

Responsable de:

- unificar jerarquia visual de botones
- `primary` = accion principal
- `secondary` = accion secundaria
- `danger` = accion destructiva o de retiro

### `StandardStatusChip`

Responsable de:

- mapear estados frecuentes del sistema a un chip consistente

Estados contemplados inicialmente:

- `BORRADOR`
- `REVISION`
- `APROBADA`
- `CERRADA`
- `ACTIVO`
- `INACTIVO`
- `SIN ASIGNACION`

### `StandardEmptyState`

Responsable de:

- dar un patron unico para estados vacios

## Componentes previos reutilizados

No se eliminaron componentes existentes que ya resolvian parte del problema.

Se mantiene y reaprovecha:

- `CollectionTableCard`
- `StatusChip`
- `PlanificacionStatusChip`
- `OperationalScopeSummary`
- `PageBackButton`

## Que componente reemplaza a cual

- encabezados manuales con `Grid + Typography + Stack`:
  reemplazados por `OperationalPageLayout`
- barras de filtros hechas a mano:
  reemplazadas por `OperationalFiltersBar`
- tablas con subtitulo y resumen construidos manualmente:
  reemplazadas por `OperationalTableCard`
- grupos sueltos de botones en toolbar:
  reemplazables por `ActionButtonGroup`

## Pantallas migradas

### `Planificaciones`

Migrada a:

- `OperationalPageLayout`
- `OperationalFiltersBar`
- `OperationalTableCard`

Se mantuvo la logica de:

- crear planificacion
- preparar siguiente mes
- exportacion
- cambio de estado

### `Asignaciones`

Migrada a:

- `OperationalPageLayout`
- `OperationalFiltersBar`
- `OperationalTableCard`

Se mantuvo la logica de:

- mover personal
- quitar del servicio
- mostrar personal sin asignacion

### `Horarios del servicio`

Migrada a:

- `OperationalPageLayout`
- `OperationalFiltersBar`
- `OperationalTableCard`

Se mantuvo la logica de:

- crear horario
- editar horario
- activar/desactivar
- acceso a visualizacion operativa

### `Calendarios`

Migrada a:

- `OperationalPageLayout`
- `OperationalFiltersBar`
- `OperationalTableCard`

Se mantuvo la logica de:

- generar anio
- generar mes
- marcar feriados

### `Servicios`

Migrada a:

- `OperationalPageLayout`
- `OperationalToolbar`
- `OperationalFiltersBar`
- `OperationalTableCard`
- `ActionButtonGroup`

Se mantuvo la logica de:

- ver detalle
- ver personal
- ver asignaciones
- contexto fijo por departamento cuando aplica

### `Departamentos`

Migrada a:

- `OperationalPageLayout`
- `OperationalTableCard`
- `ActionButtonGroup`

Se mantuvo la logica de:

- ver servicios
- ver personal

### `Visualizacion operativa`

Migrada a:

- `OperationalPageLayout`
- `OperationalToolbar`
- `OperationalFiltersBar`
- `ActionButtonGroup`

Se mantuvo la logica de:

- seleccionar servicio
- recargar configuracion
- guardar cambios
- volver a horarios del servicio

### `Detalle de servicio`

Migrada a:

- `OperationalPageLayout`
- `OperationalTableCard`
- `PageBackButton`

Se mantuvo la logica de:

- ver datos del servicio
- ver jefatura
- ver horarios
- ver personal asignado

### `Personal`

Migrada a:

- `OperationalPageLayout`
- `OperationalToolbar`
- `OperationalFiltersBar`
- `OperationalTableCard`
- `ActionButtonGroup`

Se mantuvo la logica de:

- alta
- edicion
- baja
- detalle
- paginacion real

## Como migrar nuevas pantallas

Orden recomendado:

1. envolver la pagina con `OperationalPageLayout`
2. mover filtros y acciones superiores a `OperationalFiltersBar`
3. pasar la tabla principal a `OperationalTableCard`
4. usar `OperationalScopeSummary` si el usuario tiene un unico servicio o departamento
5. reemplazar grupos de botones manuales por `ActionButtonGroup` cuando aplique
6. usar `StandardStatusChip` cuando el estado no requiera un chip especializado

## Ejemplo minimo

```tsx
<OperationalPageLayout
  breadcrumb="Operacion / Ejemplo"
  title="Pantalla operativa"
  description="Vista compacta y consistente."
  feedback={feedback ? <Alert severity={feedback.type}>{feedback.message}</Alert> : null}
>
  <Grid size={12}>
    <OperationalFiltersBar
      filters={<TextField label="Servicio" size="small" />}
      actions={[{ label: 'Recargar', onClick: reload, tone: 'secondary' }]}
      summary="25 registros"
    />
  </Grid>

  <Grid size={12}>
    <OperationalTableCard
      title="Tabla principal"
      subtitle={<Typography variant="body2">Resumen corto</Typography>}
      rows={rows}
      columns={columns}
      loading={loading}
      error={error}
      emptyMessage="Sin datos."
    />
  </Grid>
</OperationalPageLayout>
```

## Pendientes recomendados

- seguir migrando pantallas administrativas menores al mismo layout
- unificar mas grupos de acciones por fila con `ActionButtonGroup`
- ampliar `StandardStatusChip` con estados especificos del dominio
- compactar modales heredados que todavia usan formularios visualmente mas sueltos

## Criterio de diseño

El sistema no busca verse como dashboard generico.

Busca verse como plataforma operativa hospitalaria:

- lectura rapida
- bajo ruido visual
- jerarquia clara
- acciones cercanas al trabajo real
- filtros compactos
- tabla central como principal area de trabajo
