# Modos de Exportación del Rol de Turnos

## Objetivo

Definir cómo se presenta la matriz mensual al exportar sin cambiar la lógica operativa del rol.

La exportación actual del sistema se centra en:

* vista previa HTML
* Excel institucional

El flujo PDF ya no forma parte del recorrido operativo principal del frontend.

---

## 1. Modos de contenido

La exportación soporta dos modos de representación:

### `modo=etiquetas`

Mantiene la visualización operativa del sistema:

* turnos con su código visible por servicio
* incidencias personales con etiqueta corta
* feriados en cabecera con código institucional

Ejemplos:

* `M`
* `T`
* `N`
* `LI`
* `VA`
* `FN`

### `modo=numerico`

Usa la representación cuantitativa o administrativa:

* turnos según `rol_turno.horas_programadas`
* incidencias personales con su código corto visible
* feriados en cabecera con código institucional

Ejemplos:

* un turno de `6` horas puede verse como `6`
* un turno de `12` horas puede verse como `12`
* `LI`, `VA`, `BM`, `PE`, `FA`, `CO`, `DE` siguen visibles como incidencias

Regla:

* `modo=numerico` no crea turnos nuevos
* solo cambia la representación de salida

---

## 2. Estilo visual de salida

La exportación también soporta dos estilos:

### `estilo=color`

Mantiene colores institucionales cuando existen:

* cabeceras
* feriados
* códigos operativos
* apoyos visuales del servicio

### `estilo=texto`

Quita fondos y color de apoyo.

Mantiene:

* texto
* bordes
* estructura de celdas
* leyenda dinámica

Este estilo está pensado para:

* impresión sobria
* fotocopia
* impresión monocromática

---

## 3. Endpoints activos

### Vista previa HTML

* `GET /v1/planificaciones/:id/export/preview?modo=etiquetas&estilo=color`
* `GET /v1/planificaciones/:id/export/preview?modo=numerico&estilo=texto`

### Excel

* `GET /v1/planificaciones/:id/export/excel?modo=etiquetas&estilo=color`
* `GET /v1/planificaciones/:id/export/excel?modo=numerico&estilo=texto`

### Excel por lote

* `POST /v1/planificaciones/export/excel-lote`

Body esperado:

```json
{
  "idsPlanificacion": [1, 2, 3],
  "modo": "numerico",
  "estilo": "texto",
  "formato": "una-fila"
}
```

## 3.1 Formato de matriz (`formato`)

Ademas de `modo` y `estilo`, la vista previa y el Excel (individual y por lote) aceptan `formato`:

* `formato=una-fila` (default): cada persona ocupa una sola fila del mes, igual que siempre.
* `formato=multi-horario`: una persona con un solo turno en el mes se mantiene en una fila; una persona con **turnos distintos** (por `id_turno`) en el mes ocupa un bloque de N filas, una por turno. Las columnas que no varian por horario (identidad de la persona, `TOTAL HRS MES`, `OBSERVACIONES`) y los dias de incidencia personal (sin turno, ej. vacacion/licencia) se fusionan verticalmente para aparecer una sola vez por persona; solo las celdas de los dias de cada turno y la columna `HORARIO` cambian por fila.

Este parametro es exclusivo del flujo de exportacion (vista previa + Excel). La matriz operativa de la web (`GET /v1/planificaciones/:id/matriz-mensual`) no se ve afectada por `formato`: siempre devuelve una fila por persona, que es la fuente que tanto la vista web como ambos formatos de exportacion consumen.

---

## 4. PDF

El backend todavía conserva endpoints PDF por compatibilidad técnica.

Pero el criterio documental actual es este:

* PDF no forma parte del flujo operativo principal
* PDF no se ofrece como salida activa en el frontend actual
* la salida institucional vigente es `preview + Excel`

Por eso, cualquier uso de PDF debe considerarse:

* legado técnico
* no prioritario para la operación actual

---

## 5. Fuente real de los códigos

La exportación ya no debe depender de listas estáticas.

Fuente de verdad actual:

* `turno`
* `configuracion_operativa_servicio`
* `codigo_operativo_servicio`
* `tipo_dia`
* `tipo_feriado`
* `calendario.codigo_feriado`
* `rol_turno.horas_programadas`

Reglas:

* los feriados de cabecera salen desde `calendario.codigo_feriado`
* las incidencias personales salen desde `tipo_dia`
* los horarios del servicio salen desde `turno` y la configuración operativa asociada
* la verdad cuantitativa sigue siendo `rol_turno.horas_programadas`

---

## 6. Leyenda dinámica

La exportación debe mostrar solo códigos realmente presentes en la matriz.

Debe incluir dinámicamente:

* incidencias personales usadas
* feriados de cabecera usados:
  * `F`
  * `FN`
  * `FR`
  * `FI`

No debe listar códigos ausentes.

---

## 7. Frontend actual

El modal `Vista previa / Exportar` del frontend actual:

* permite elegir `modo`
* permite elegir `estilo`
* permite elegir `formato` (una fila por persona / una fila por horario distinto)
* permite abrir vista previa HTML
* permite descargar Excel (individual y por lote)

No expone descarga PDF en la operación actual.
