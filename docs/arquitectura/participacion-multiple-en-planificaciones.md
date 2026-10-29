# Participación Múltiple en Planificaciones

## Objetivo

Documentar una ampliación futura del modelo para permitir que una persona aparezca en una o más planificaciones distintas sin duplicar su identidad ni romper su asignación laboral principal.

Caso típico:

* un médico pertenece laboralmente a `Especialidades`
* pero también debe aparecer algunas horas en la planificación de `Consulta Externa`

---

## 1. Problema actual

Hoy la entrada a una planificación se define por:

* `planificacion.id_servicio`
* `asignacion_personal.id_servicio`

La matriz se llena con las asignaciones vigentes del servicio de la planificación.

Eso significa que hoy la regla real es:

> servicio de la planificación = servicio de la asignación vigente

Consecuencia:

* una persona normalmente aparece solo en la planificación de su servicio asignado
* no existe todavía una capa formal para habilitar su aparición en otras planificaciones

---

## 2. Qué no debe hacerse

Para resolver este caso, no conviene:

* duplicar la persona
* crear varias asignaciones principales activas al mismo nivel
* mover manualmente a la persona de un servicio a otro cada mes
* usar `familia_laboral` como sustituto de participación operativa

Eso genera:

* inconsistencia laboral
* duplicación de histórico
* ambigüedad de servicio principal
* problemas de cobertura y de exportación

---

## 3. Separación correcta

La solución correcta es separar dos conceptos:

### 3.1 Pertenencia laboral

La sigue definiendo:

* `asignacion_personal`

Eso responde:

* dónde pertenece la persona
* cuál es su servicio principal
* qué tipo de ítem tiene
* qué contrato tiene
* cuál es su carga horaria base
* cuál es su rol funcional

### 3.2 Participación planificable

Debe definirse con una capa nueva.

Eso responde:

* en qué otras planificaciones puede aparecer la persona
* por qué motivo
* desde cuándo
* hasta cuándo
* con qué límite operativo si hace falta

---

## 4. Modelo recomendado

Se recomienda crear una tabla nueva:

* `participacion_planificacion_personal`

Nombre alternativo aceptable:

* `habilitacion_planificacion_personal`
* `participacion_operativa_servicio`

Pero el nombre recomendado es:

* `participacion_planificacion_personal`

Porque expresa mejor que no reemplaza la asignación base.

---

## 5. Campos mínimos recomendados

La tabla futura debería contener al menos:

* `id`
* `id_asignacion_personal_base`
* `id_servicio_planificacion`
* `tipo_participacion`
* `fecha_inicio`
* `fecha_fin`
* `horas_maximas_mes` opcional
* `activo`
* `created_at`
* `updated_at`

### Significado

* `id_asignacion_personal_base`
  * referencia a la asignación laboral principal o base
* `id_servicio_planificacion`
  * servicio adicional donde puede aparecer en planificación
* `tipo_participacion`
  * naturaleza operativa de esa aparición

---

## 6. Tipos de participación sugeridos

Valores iniciales recomendados:

* `PRINCIPAL`
* `APOYO`
* `CONSULTA`
* `GUARDIA`
* `ROTACION`

No deben asumirse como definitivos todavía.

Lo correcto sería tratarlos como:

* catálogo futuro
* o enum inicial de backend

---

## 7. Cómo funcionaría el caso de uso

Ejemplo:

* persona: médico
* asignación principal: `Especialidades`
* participación adicional: `Consulta Externa`
* tipo: `CONSULTA`
* vigencia: `2026-06-01` a `2026-06-30`

Resultado esperado:

* sigue perteneciendo laboralmente a `Especialidades`
* puede aparecer en la planificación de `Consulta Externa`
* no se altera su asignación principal
* no se duplica la persona

---

## 8. Cambios requeridos en backend

### 8.1 Consulta de entrada a matriz

Hoy la matriz usa un criterio tipo:

* asignaciones disponibles del servicio

En el futuro deberá usar:

* asignaciones vigentes del servicio
* más participaciones activas en ese servicio para el período evaluado

### 8.2 Evitar duplicados

Si una persona:

* ya pertenece al servicio por asignación principal
* y además tiene participación explícita en el mismo servicio

debe entrar una sola vez a la matriz.

### 8.3 Validar vigencia

Debe considerarse:

* fecha de inicio
* fecha de fin
* estado activo

de la participación.

### 8.4 Futuro control de carga

Más adelante podría validarse:

* tope de horas mensuales entre varias planificaciones
* solapamiento de horarios en el mismo día

Eso no es requisito para la primera versión del modelo.

---

## 9. Cambios requeridos en frontend

### 9.1 Módulo de asignaciones

Debe agregarse una acción futura como:

* `Agregar participación de planificación`
* `Habilitar en otro servicio`

Campos mínimos del formulario:

* servicio adicional
* tipo de participación
* vigencia
* límite de horas opcional

### 9.2 Matriz

En una primera versión, la matriz no necesita cambiar mucho.

Solo podría requerir:

* mostrar el servicio base o tipo de participación cuando no coincida con el servicio principal

Eso es mejora visual, no condición estructural.

---

## 10. Reglas de negocio recomendadas

### Regla 1

Una persona puede tener:

* `1` asignación principal laboral activa
* `0..n` participaciones activas de planificación

### Regla 2

Una participación de planificación:

* no reemplaza la asignación principal
* no cambia el servicio laboral base
* solo habilita aparición en otra planificación

### Regla 3

No deben existir participaciones duplicadas con la misma combinación:

* asignación base
* servicio de planificación
* vigencia solapada
* tipo de participación

### Regla 4

Si una participación vence o se desactiva:

* la persona deja de aparecer en esa planificación adicional
* pero mantiene su asignación laboral principal

---

## 11. Relación con familia laboral

**Nota (2026-07-10):** `familia_laboral` ya no existe en el modelo (eliminada por completo en la
migración `028`, 2026-07-03, ver `docs/database/decisiones-tecnicas.md`) — el punto de abajo queda como
registro de por qué no se optó por esa vía cuando todavía existía, no como advertencia sobre algo
disponible hoy.

`familia_laboral` no debe usarse para resolver este caso.

La familia laboral puede servir para:

* clasificar
* filtrar
* agrupar visualmente

Pero no expresa por sí sola:

* en qué planificación aparece la persona
* ni en qué otro servicio puede operar

---

## 12. Conclusión

La forma correcta de soportar que una persona aparezca en una o más planificaciones es:

1. mantener `asignacion_personal` como pertenencia laboral
2. agregar `participacion_planificacion_personal` como habilitación operativa adicional
3. ajustar la consulta que arma la matriz
4. agregar UI futura para gestionar esas participaciones

Con esto se logra:

* escalabilidad
* trazabilidad
* soporte para médicos, consulta externa, apoyo y rotaciones
* sin romper el modelo actual de asignación principal
