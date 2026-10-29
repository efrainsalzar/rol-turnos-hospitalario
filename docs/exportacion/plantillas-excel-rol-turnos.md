# Plantillas Excel de Rol de Turnos

## Objetivo

La exportacion Excel del rol mensual ya no depende de un unico metodo rigido.

Ahora usa un sistema de plantillas versionadas para poder:

* adaptar el formato institucional por gestion
* mantener compatibilidad con reportes historicos
* evolucionar estilos y encabezados sin romper el endpoint actual
* reutilizar la misma matriz mensual como fuente de datos

## Estructura actual

```text
apps/api/src/modules/planificacion/application/services/export/
  planificacion-excel-export.service.ts
  templates/
    rol-turnos-template.interface.ts
    rol-turnos-template.registry.ts
    rol-turnos-template-2026.ts
    rol-turnos-template-default.ts
  styles/
    excel-style.helpers.ts
    excel-border.helpers.ts
    excel-layout.helpers.ts
```

## Como funciona

1. `GET /v1/planificaciones/:id/export/excel` obtiene la matriz mensual.
2. `PlanificacionExcelExportService` crea el `Workbook`.
3. `RolTurnosTemplateRegistry` resuelve la plantilla por `anio`.
4. La plantilla construye la hoja, encabezado, tabla, leyenda y configuracion de impresion.
5. El modo de exportacion (`etiquetas` o `numerico`) se aplica sin duplicar la plantilla.

## Plantilla vigente

### Anio 2026

Usa:

* `RolTurnosTemplate2026`

Formato:

* encabezado institucional (configurable via `EXPORT_INSTITUTION_NAME` /
  `EXPORT_INSTITUTION_HEADER_LINES`, ver `apps/api/src/infrastructure/config/institution-env.ts`;
  sin configurar usa un texto generico, no el de ninguna institucion real -- 2026-07-24)
* servicio y periodo
* columnas administrativas completas
* dias `1..31`
* total horas
* horario
* observaciones
* leyenda inferior
* configuracion para impresion horizontal legal

### Fallback

Si el anio no tiene plantilla especifica:

* `RolTurnosTemplateDefault`

## Datos que consume

La plantilla consume exclusivamente la salida de:

* `GET /v1/planificaciones/:id/matriz-mensual`

Campos principales:

* `planificacion.anio`
* `planificacion.mes`
* `planificacion.nombreServicio`
* `dias`
* `filas.numeroFila`
* `filas.nroItem`
* `filas.cargaHorariaCodigo`
* `filas.ci`
* `filas.tipoItemCodigo`
* `filas.codigoFuenteItem`
* `filas.apellidoPaterno`
* `filas.apellidoMaterno`
* `filas.nombres`
* `filas.cargoActual`
* `filas.dias.valorVisual`
* `filas.totalHorasMes`
* `filas.horarioResumen`
* `filas.observacionMensual`

## Modos de exportacion

La misma plantilla puede renderizar:

* `modo=etiquetas`
* `modo=numerico`

La transformacion de codigos se resuelve en:

* `turno-export-code.mapper.ts`
* `turno-export-code-catalog.service.ts`

Las equivalencias se leen desde base:

* `dbo.incidencia_personal.codigo_exportacion_etiqueta` (ex `tipo_dia`, renombrada en la migracion `042`)
* `dbo.incidencia_personal.codigo_exportacion_numerico`
* `dbo.codigo_operativo_servicio` (via `configuracion_operativa_servicio`, resuelto por planificación con `TurnoExportCodeCatalogService.buildMapper`): reemplaza el catálogo global de `tipo_turno`, que se eliminó en la migración `033_remove_tipo_turno.sql` (2026-07-03) — el código/etiqueta visual de un turno hoy se define por servicio o departamento, no por un catálogo conceptual único
* `rol_turno.horas_programadas` expuesto en la matriz mensual para el modo numerico de turnos

Referencia:

* [docs/exportacion/modos-exportacion-rol-turnos.md](/docs/exportacion/modos-exportacion-rol-turnos.md)
* [docs/exportacion/colores-operativos-matriz-y-excel.md](/docs/exportacion/colores-operativos-matriz-y-excel.md)

## Como agregar una plantilla 2027

1. crear `rol-turnos-template-2027.ts`
2. implementar `supports(anio)` devolviendo `anio === 2027`
3. implementar `build(workbook, matriz)`
4. registrar la nueva clase en `PlanificacionModule`
5. inyectarla en `RolTurnosTemplateRegistry`
6. agregar pruebas unitarias de seleccion y construccion

## Limitaciones actuales

* el PDF sigue usando el flujo HTML actual; el Excel institucional es la salida principal de impresion
* en `modo=numerico` la leyenda omite las horas de turnos y deja solo referencias administrativas de dias especiales
* la plantilla 2026 no intenta reproducir cada fusion visual exacta del archivo historico, pero si su estructura institucional y operativa
* el nombre del departamento en el encabezado se aproxima desde el servicio actual; si en el futuro se necesita encabezado multi-departamento, debe enriquecerse desde la matriz o desde un DTO especifico de exportacion
