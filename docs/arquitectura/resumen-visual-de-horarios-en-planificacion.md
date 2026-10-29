# Resumen Visual de Horarios en Planificación

## Objetivo

Documentar una estrategia futura para representar mejor en la matriz, la exportación Excel y la vista previa los casos donde una persona:

* repite un mismo horario en ciertos días de la semana
* o trabaja solo en fechas específicas del mes con horarios puntuales

Este documento no propone un cambio de modelo relacional base.

La intención es definir cómo debe resumirse visualmente la información que el sistema ya guarda día por día.

---

## 1. Problema actual

Hoy la planificación guarda correctamente por día:

* turno
* hora de inicio
* hora de fin
* horas programadas

Eso significa que el sistema sí soporta casos como:

* lunes a miércoles de `08:00` a `14:00`
* jueves a viernes de `14:00` a `20:00`

o también:

* día `5` de `16:00` a `20:00`
* día `20` de `08:00` a `11:00`

Sin embargo, la representación actual en la matriz tiene una limitación:

* en modo numérico la celda puede mostrar solo `6`, `4`, `3`, etc.
* la columna `Horario` hoy resume rangos usados, pero no siempre explica en qué días aplica cada uno

Consecuencia:

* el modelo soporta los datos
* la matriz no siempre comunica el patrón operativo real

---

## 2. Qué sí soporta hoy el sistema

El sistema ya soporta:

* diferentes horarios con la misma carga horaria
* distintos horarios dentro del mismo mes para una misma persona
* fechas específicas con horario puntual
* múltiples registros por día cuando el dominio lo requiere

Esto se debe a que cada `rol_turno` conserva:

* `id_turno`
* `hora_inicio`
* `hora_fin`
* `horas_programadas`
* `secuencia_dia`

Por tanto, el problema principal no es de persistencia.

Es un problema de:

* resumen visual
* legibilidad
* trazabilidad operativa en pantalla y exportación

---

## 3. Caso A: patrón repetitivo por días de semana

### Ejemplo

Una persona trabaja:

* lunes a miércoles de `08:00` a `14:00`
* jueves a viernes de `14:00` a `20:00`

### Diagnóstico

Si ambas franjas son de `6` horas:

* en la matriz numérica las celdas pueden verse iguales
* la columna `Horario` actual no siempre deja claro qué días corresponden a cada franja

### Estrategia visual recomendada

Cuando exista un patrón repetitivo reconocible, la columna `Horario` debe resumirlo agrupando por días de semana.

### Formato recomendado

Ejemplo:

* `L-M-X 08:00-14:00 / J-V 14:00-20:00`

### Ventajas

* expresa días y horas en una sola columna
* mantiene la matriz compacta
* evita llenar `Observaciones` con información estructural repetitiva

### Regla sugerida

Usar este formato cuando:

* el horario se repita de forma clara por grupo de días
* y no existan demasiadas excepciones puntuales

---

## 4. Caso B: fechas específicas con horarios puntuales

### Ejemplo

Una persona trabaja solo:

* día `5` de `16:00` a `20:00`
* día `20` de `08:00` a `11:00`

### Diagnóstico

En este caso no existe un patrón semanal estable.

Si la columna `Horario` solo muestra:

* `08:00-11:00 / 16:00-20:00`

la información sigue incompleta, porque no se sabe qué fecha corresponde a cada rango.

### Estrategia visual recomendada

Separar dos capas:

* `Horario`
  * muestra los rangos usados en el mes
* `Observaciones`
  * explica la correspondencia por fecha cuando no hay patrón regular

### Formato recomendado

Ejemplo:

* `Horario`: `08:00-11:00 / 16:00-20:00`
* `Observaciones`: `5: 16:00-20:00; 20: 08:00-11:00`

### Ventajas

* no ensucia la columna `Horario`
* aprovecha una columna ya existente
* deja las excepciones en el lugar correcto

### Regla sugerida

Usar este formato cuando:

* el patrón no pueda resumirse de forma clara por días de semana
* o la distribución sea esporádica y puntual

---

## 5. Caso mixto

También puede ocurrir un escenario mixto:

* existe una rutina principal repetitiva
* pero además hay fechas excepcionales

### Ejemplo

* patrón base:
  * `L-M-X 08:00-14:00`
* excepciones:
  * `20: 08:00-11:00`
  * `25: 16:00-20:00`

### Estrategia visual recomendada

* `Horario`
  * muestra el patrón principal
* `Observaciones`
  * registra solo las excepciones

### Formato recomendado

* `Horario`: `L-M-X 08:00-14:00`
* `Observaciones`: `20: 08:00-11:00; 25: 16:00-20:00`

---

## 6. Regla funcional propuesta

La lógica futura recomendada para construir visualmente `Horario` y `Observaciones` es:

### Regla 1

Si existe patrón semanal claro:

* resumir en `Horario` por grupos de días

### Regla 2

Si no existe patrón semanal claro:

* `Horario` muestra rangos únicos del mes
* `Observaciones` detalla fechas puntuales

### Regla 3

Si existe patrón principal con excepciones:

* `Horario` resume lo repetitivo
* `Observaciones` detalla lo excepcional

### Regla 4

Las celdas de la matriz no deben intentar cargar toda esta semántica por sí solas.

La celda diaria puede seguir mostrando:

* valor numérico
* o etiqueta visual

Pero el significado operativo completo debe apoyarse en:

* `Horario`
* `Observaciones`

---

## 7. Impacto esperado

### En matriz

* mejora la comprensión de jornadas repetitivas e irregulares
* evita ambigüedad en horarios con la misma carga horaria

### En exportación Excel

* la columna `Horario` gana valor operativo real
* `Observaciones` pasa a ser soporte de detalle, no texto libre arbitrario

### En vista previa

* se alinea mejor con lo que se espera del rol mensual impreso

---

## 8. Qué no se recomienda

No conviene:

* meter toda la explicación por fecha dentro de la columna `Horario`
* confiar solo en que el valor numérico de la celda explique el horario real
* usar `Observaciones` para repetir patrones regulares que pueden resumirse mejor

---

## 9. Conclusión

La estrategia recomendada a futuro es:

* usar `Horario` para resumir patrón repetitivo o rangos principales
* usar `Observaciones` para detallar fechas específicas o excepciones

Con esto el sistema puede explicar correctamente:

* horarios distintos con la misma carga horaria
* días específicos con horarios puntuales
* combinaciones regulares e irregulares dentro del mismo mes

sin cambiar el modelo base de planificación.
