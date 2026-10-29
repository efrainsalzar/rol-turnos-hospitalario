# Subservicios Operativos y Ubicaciones Funcionales

## Objetivo

Documentar para una fase futura cómo tratar casos detectados en Enfermería donde el rol mensual muestra:

* subáreas internas del servicio
* subservicios operativos
* personal volante o de apoyo
* ubicaciones funcionales que no coinciden exactamente con el servicio base

Esta fase no debe mezclarse con la primera carga real en `lab`.

---

## 1. Casos detectados en el dataset preliminar

Durante la carga manual inicial aparecieron ejemplos como:

* `URPA` dentro de `Quirofano`
* `Dialisis Peritoneal` dentro de `Hemodialisis`
* `Vacunas` dentro de una hoja o bloque operativo
* `Volantes Enfermeria` como personal usado para cubrir servicios distintos

Estos casos muestran que el rol fuente no siempre trabaja con un único nivel simple:

* `departamento`
* `servicio`
* `personal`

A veces existe un nivel intermedio o complementario:

* subservicio
* subárea
* ubicación funcional
* cobertura temporal

---

## 2. Qué NO hacer en la primera carga

En la primera implementación real no conviene:

* crear servicios artificiales solo por aparecer como subárea en una hoja
* duplicar personas para reflejar una ubicación temporal
* mover la asignación principal del personal cada vez que cubre otra unidad
* mezclar incidencias del mes con la identidad base del personal

Eso generaría:

* incoherencia organizativa
* duplicación de personal
* pérdida del servicio base real
* complejidad innecesaria en la fase inicial

---

## 3. Criterio para la primera carga real

En `lab`, por ahora, la regla correcta es:

* cargar el `servicio base` real
* cargar el `personal base` real
* no modelar todavía la subárea como entidad estructural
* conservar estas señales en documentación y dataset para decisión futura

Ejemplos:

* `URPA` sigue perteneciendo operativamente a `Quirofano`
* `Dialisis Peritoneal` sigue perteneciendo operativamente a `Hemodialisis`
* `Volantes Enfermeria` se conserva como grupo transitorio de análisis

---

## 4. Qué soporta hoy el sistema

Hoy el sistema soporta formalmente:

* `departamento`
* `servicio`
* `asignacion_personal`
* `rol_funcional`
* `planificacion` por servicio

También soporta:

* asignaciones organizativas flexibles
* jefaturas departamentales o de servicio
* una futura evolución hacia participación múltiple en planificaciones

Referencia relacionada:

* [participacion-multiple-en-planificaciones.md](/docs/arquitectura/participacion-multiple-en-planificaciones.md)

---

## 5. Qué NO soporta todavía como estructura formal

Hoy no existe todavía una entidad explícita para:

* `subservicio_operativo`
* `area_funcional`
* `ubicacion_funcional`
* `participacion_temporal_servicio`

Por eso estos datos no deben subirse aún como si fueran estructura definitiva.

---

## 6. Estrategia futura recomendada

### 6.1 Subservicio o área funcional interna

Si después se confirma institucionalmente que casos como `URPA` o `Dialisis Peritoneal` deben existir como parte estable del modelo, se recomienda evaluar una capa como:

* `subservicio_operativo`
* o `area_funcional_servicio`

Campos mínimos futuros:

* `id`
* `id_servicio`
* `codigo`
* `nombre`
* `activo`
* `es_planificable`

Esto permitiría distinguir:

* servicio base
* área funcional interna

sin convertir todo en un servicio nuevo.

### 6.2 Personal volante o apoyo temporal

Para casos de personal que aparece temporalmente en otro servicio, la estrategia futura recomendada sigue siendo:

* mantener `asignacion_personal` como base laboral
* agregar una capa de participación operativa adicional

Referencia:

* [participacion-multiple-en-planificaciones.md](/docs/arquitectura/participacion-multiple-en-planificaciones.md)

---

## 7. Preguntas que deben resolverse después

Antes de modelar esta capa nueva, debe definirse con la institución o con Enfermería:

1. `URPA` es un servicio independiente o una subárea de `Quirofano`
2. `Dialisis Peritoneal` es un servicio independiente o una dependencia de `Hemodialisis`
3. `Vacunas` debe convertirse en servicio formal, subárea o solo ubicación temporal
4. el personal volante tendrá:
   * asignación base propia
   * o participaciones temporales por servicio

---

## 8. Decisión para la fase actual

La decisión vigente para esta primera implementación en `lab` es:

* no modelar todavía subservicios ni ubicaciones funcionales como estructura
* cargar solo servicio base y personal base
* conservar la evidencia de estos casos en el dataset y en esta documentación

---

## 9. Resultado esperado

Cuando el sistema ya esté operando con Enfermería real y login local estable, esta será una de las siguientes decisiones de evolución:

1. crear `subservicio_operativo`
2. crear una capa de `participacion_operativa_servicio`
3. mantener algunos casos solo como dato operativo de contexto

Esta fase debe retomarse solo después de estabilizar:

* personal real
* jefaturas reales
* usuarios locales
* planificación básica por servicio
