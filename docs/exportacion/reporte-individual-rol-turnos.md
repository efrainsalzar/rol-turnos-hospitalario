# Reporte Individual de Rol de Turnos (por persona)

## Objetivo

El reporte por persona muestra el rol de turno mensual de un unico personal, en formato calendario vertical (un dia por fila), pensado para imprimir o entregar como documento individual — a diferencia del reporte por servicio/departamento (la matriz completa, personas en filas y dias en columnas), que ya existe y se mantiene sin cambios.

Este documento registra el rediseño aprobado en 2026-07-04, que reemplaza una version anterior con estilo de tarjetas KPI (numeros grandes de colores en grilla, similar a un dashboard), considerada poco profesional para un documento institucional serio.

## Alcance de este rediseño

Se tocan dos piezas, ambas consumiendo la misma fuente de datos (`ObtenerMatrizMensualPlanificacionUseCase`), pero cada una con su propia capa de presentacion:

1. **Backend — plantilla HTML/PDF** (`GenerarReportePersonalUseCase` + `ExportarReportePersonalPdfUseCase`): la plantilla HTML que se usa tanto para la vista embebida como para el PDF generado con Playwright.
2. **Frontend — pantalla de reportes** (`apps/mantis-free-react-admin-template/src/pages/reportes/reporte-rol-personal.tsx`): la pantalla ya usa el estandar operativo del proyecto (`OperationalPageTemplate`, `OperationalStats`, filtros y patrones ya establecidos) — eso NO cambia. Lo unico que se alinea es el bloque de resumen final dentro de la tarjeta de resultado, que hoy repite el mismo patron de tarjetas KPI que se elimino del PDF; se reemplaza por una tabla de resumen simple, consistente con el nuevo diseño del PDF.

## Decisiones de diseño (aprobadas por el usuario tras dos iteraciones de mockup)

* **Una sola familia tipografica**, sin cursivas en ningun lado (ni en el reporte HTML/PDF ni en la tabla web).
* **Todo el texto en negro.** El color institucional (azul marino, ya usado en el resto del sistema) solo se usa como fondo de bandas estructurales (encabezado de tabla, fila de total) — nunca como color de texto/etiqueta. Se eliminan los grises suaves para etiquetas y el color dorado que tenia el texto de dia feriado.
* **Nombre del personal dentro del panel de datos administrativos**, como primera linea destacada — no como titulo del documento. El titulo del documento queda simple: "Rol de Turnos · Reporte Individual", sin nombre ni fecha.
* **Sin seccion de firmas** (se descarto explicitamente "Elaborado por" / "Visto bueno").
* **Resumen final como tabla institucional**, no como tarjetas KPI: una tabla con la misma tipografia y bordes que el resto del documento, con una fila final de "Total de horas del periodo" destacada solo con fondo azul marino (no con numeros grandes de colores).
* **Sin salto de colores (zebra) en la tabla de detalle diario.** Antes alternaba un tono de fondo cada dos filas ademas de los resaltados de fin de semana/feriado, lo que generaba choques visuales. Ahora solo existen dos resaltados posibles por fila: fin de semana (gris azulado suave) y feriado (beige suave); ninguna otra fila lleva fondo alterno.
* **Formato carta (8.5" × 11"), orientacion vertical**, igual que hoy — sin cambios de tamaño de pagina.

## Bug corregido de paso

La plantilla HTML anterior (`generar-reporte-personal.use-case.ts`) tenia una `w` suelta justo antes de `</body>`, que se renderizaba literalmente al final de cada reporte generado. Se elimina en el rediseño.

## Estado

* **[RESUELTO 2026-07-04]** Backend: `buildHtml()` reescrito en `generar-reporte-personal.use-case.ts` con el layout aprobado (v2).
* **[RESUELTO 2026-07-04]** Frontend: grid de tarjetas KPI reemplazado por una tabla de resumen consistente con el PDF, en `reporte-rol-personal.tsx`. El resto de la pantalla no se modifico.

## Referencia visual

El diseño aprobado fue maquetado como artefacto HTML antes de tocar codigo (dos iteraciones: v1 con tarjetas KPI y colores mixtos, descartada; v2 con tabla de resumen y texto en negro uniforme, aprobada). La v2 es la base exacta para `buildHtml()`.

## Ajustes posteriores (2026-07-04, tras probar con datos reales)

Tras generar el HTML/PDF real contra una planificacion cerrada, el usuario pidio los siguientes ajustes:

1. **Nombre del personal**: se saca del bloque destacado y pasa a ser un campo mas del panel de datos (primera fila, antes de "Servicio"), sin negrita/tamaño especial.
2. **Encabezado de la tabla de detalle diario mostraba texto gris en vez de negro con negrilla.** Causa raiz encontrada: `ExportarReportePersonalPdfUseCase` tenia un hack legado (`applyBlackAndWhiteOverride()`) que forzaba `color: #000 !important` globalmente y luego un override especifico `thead th { background-color: #000 !important; color: #fff !important; }`, combinado con `printBackground: false` en las opciones de `page.pdf()` de Playwright. Como `printBackground: false` suprime **todos** los fondos en el PDF (ahorro de tinta), el fondo negro forzado nunca se pintaba, dejando texto blanco sobre fondo blanco (se veia como gris/lavado por el antialiasing). Se elimino el hack por completo y se cambio el encabezado de la tabla a fondo blanco con texto negro en negrilla (sin depender de ningun fondo de color); se habilito `printBackground: true` (alineado con `ExportarPlanificacionPdfUseCase`, que ya lo usaba asi) para que el fondo azul marino de la fila de "Total horas del periodo" en el resumen si se siga viendo correctamente.
3. **Columna "Codigo" mostraba el patron tecnico interno** (ej. "0800-1000", el codigo auto-generado del turno cuando nunca se le configuro un codigo visual corto) en vez de un guion. Se agrego la funcion `buildCodigo()` (backend) / `formatCodigo()` (frontend): un codigo real (M, T, VA, LI...) mide como maximo 4 caracteres (limite ya impuesto en el formulario de horarios); si el valor resuelto supera esa longitud, se asume que es el patron tecnico de respaldo y se muestra un guion.
4. **Nueva columna "Nombre / etiqueta"** entre Codigo y Horario, mostrando `registro.nombre` (el nombre del turno o tipo de dia). Si esta vacio, tambien se muestra un guion.
5. **Columna Horario para registros de tipo TIPO_DIA** (incidencias como vacacion/licencia) pasa a mostrar un guion en vez de repetir el nombre — ya que ahora ese nombre vive en su propia columna.
6. **Horario continuo vs. discontinuo**: ya funcionaba correctamente (tramos separados por " / "), no requirio cambios — se dejo como verificacion explicita.

Todo verificado generando el HTML y el PDF real (via Playwright, no el PDF de respaldo) contra la planificacion cerrada real del usuario.
