# Leyenda de exportación: feriados del calendario no aparecían como entrada propia

**Estado:** implementado.
**Fecha:** 2026-07-04
**Modulo:** `planificacion` (exportación de rol de turnos: Excel y HTML/PDF).

---

## 1. Diagnóstico

`TurnoExportCodeMapper.buildLegend()` (`apps/api/src/modules/planificacion/application/services/export/turno-export-code.mapper.ts:135-189`) arma la leyenda ("código → descripción") recorriendo **únicamente** `matriz.filas[].dias[].registros` / `valorVisual` — es decir, códigos que quedaron efectivamente asignados a una persona en una celda.

El calendario mensual (`matriz.dias[]`) tiene su propio marcador de feriado, independiente de cualquier asignación personal:

```ts
{ esFeriado: boolean; codigoFeriado: string | null; nombreFeriado: string | null }
```

Si un día es feriado pero nadie tiene una celda con ese código asignado ese día (situación común: el feriado se marca en el calendario del servicio sin que necesariamente alguien tenga una celda "FN"), ese código de feriado **nunca entra en la leyenda**, aunque sí exista como catálogo válido (`tipo_dia` con `codigo_exportacion_etiqueta = 'FN'`, definido en `database/migrations/011_add_export_codes_operacion.sql`).

Esto se confirmó con el test existente `turno-export-code.mapper.spec.ts` ("omits M/T/N from numeric legend and keeps only special-day references"), que arma un calendario con un día feriado (`codigoFeriado: 'FN'`) sin ninguna celda personal que use ese código, y esperaba `['FN', 'V']` en la leyenda pero solo obtenía `['V']`.

## 2. Por qué no es un duplicado del aviso existente

Los 3 consumidores de `buildLegend()` (`rol-turnos-template-2026.ts`, `rol-turnos-template-default.ts`, `planificacion-matriz-export.service.ts`) ya muestran, cuando `matriz.dias.some(d => d.esFeriado)` es verdadero, una nota genérica fija:

> "F/FN/FR/FI en la cabecera indica que el día es feriado. La asignación de turnos depende de cada servicio."

Esa nota es un **disclaimer genérico** sobre la convención visual del encabezado (cualquiera de esos 4 códigos posibles puede aparecer ahí), no dice **cuál** de esos códigos aplicó realmente ese mes ni qué significa cada uno en detalle. Una fila de leyenda por el código de feriado realmente presente (p. ej. "FN — Feriado Nacional") es información complementaria, no redundante: le dice al lector exactamente qué feriado hubo, igual que ya hace con M/T/N/VAC/LIC/etc.

## 3. Fix

Agregar en `buildLegend()` un recorrido de `matriz.dias[]` (antes del recorrido de `filas`) que registre el código de feriado de cada día marcado como feriado:

```ts
matriz.dias.forEach((dia) => {
  if (dia.esFeriado && dia.codigoFeriado) {
    addDetectedCode(dia.codigoFeriado);
  }
});
```

Reutiliza `addDetectedCode`/`resolveEntry` ya existentes — si el código no está en el catálogo (`codeIndex`), se ignora igual que hoy con cualquier código desconocido. No cambia el filtro por `modo` (los feriados son `origen: 'TIPO_DIA'`, ya pasan el filtro de modo `numerico` igual que VAC/LIC).

## 4. Dónde impacta y qué se revisó

- **`rol-turnos-template-2026.ts`** y **`rol-turnos-template-default.ts`** (Excel): la posición de la nota de feriados y de cualquier contenido posterior ya se calcula dinámicamente a partir de `legendEntries.length` (`startRow + legendEntries.length + ...`) — agregar una fila más no rompe el layout, solo lo corre una fila hacia abajo, tal como ya ocurre al agregar cualquier otro código nuevo al catálogo.
- **`planificacion-matriz-export.service.ts`** (HTML/PDF): la leyenda se renderiza como una tabla (`legendItems.map(...)`), sin posiciones fijas — una fila más no afecta nada estructuralmente.
- **`turno-export-code.mapper.spec.ts`**: el test que motivó esta corrección pasa a estar en verde; es el único test en ese archivo que usa `matriz.dias` con feriados, no hay otros casos en el mismo archivo que puedan romperse.
- **`planificacion-excel-export.service.spec.ts`** (uno de los 4 fallos preexistentes, fuera de alcance de esta corrección): su fixture también marca un día como feriado con código `'FN'` presente en su catálogo de prueba. Tras este fix, el Excel generado en ese test **también** gana una fila de leyenda nueva, lo cual correrá una fila más el resto del contenido debajo de la leyenda. Ese test ya estaba fallando por otra razón (el título de la institución no coincide con la celda `G1` esperada); no se toca ahora, pero queda anotado aquí para quien lo corrija después: al recalcular posiciones de celda en ese test, debe contar con esta fila adicional de leyenda.
- No se encontraron otros consumidores de `buildLegend` ni otros specs que construyan `matriz.dias` con `esFeriado` y dependan de que la leyenda NO incluya el código de feriado.

## 5. Verificación

- Test unitario `turno-export-code.mapper.spec.ts` en verde.
- Resto de la suite del módulo `planificacion` sin nuevas regresiones (mismo baseline conocido de fallos preexistentes, ahora en 3 en vez de 4).
- `tsc`, `lint` y `build` limpios en `apps/api`.
