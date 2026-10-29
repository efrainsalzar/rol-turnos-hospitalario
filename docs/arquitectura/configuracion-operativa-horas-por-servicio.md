# Configuracion Operativa y Equivalencia Horaria por Servicio

## Objetivo

Definir una evolucion minima y mantenible del sistema para soportar distintos esquemas operativos por servicio y por familia laboral, sin rehacer el modelo actual ni romper la implementacion ya funcional de Enfermeria.

El problema real no es solo "turnos". El sistema debe representar y exportar:

* codigos visibles para la operacion diaria
* equivalencia horaria real para RRHH y calculo
* dias especiales administrativos
* diferencias por servicio
* crecimiento gradual hacia nuevas familias operativas

## 1. Contexto operativo corregido

La lectura correcta del dominio es esta:

* en Enfermeria, `M/T/N` son sobre todo ayudas visuales
* para RRHH y para acumulacion mensual, lo importante es la equivalencia horaria
* `M = 6`, `T = 6`, `N = 12`
* en Laboratorio puede no existir `M/T/N`; pueden usarse directamente `6`, `12`, `FR`, `VAC`
* en Consulta Externa puede existir trabajo parcial de `1`, `2`, `3`, `4`, `6` horas
* una celda no expresa necesariamente "un turno tradicional"
* una celda expresa una combinacion de:
  * representacion visual
  * equivalencia horaria
  * tipo de registro
  * contexto operativo

Por tanto, la plataforma debe crecer como sistema de **planificacion operativa hospitalaria** y no como una app fija de letras `M/T/N`.

## 2. Analisis del estado actual

### 2.1 Lo que ya existe y sirve

El modelo actual ya aporta casi toda la base estructural necesaria:

* `TURNO` depende de `SERVICIO`
* `TURNO` ya tiene:
  * `codigo`
  * `hora_inicio`
  * `hora_fin`
  * `duracion_horas`
  * `vigencia`
* `TIPO_DIA` ya separa:
  * licencia
  * vacacion
  * feriado
  * descanso
* `ROL_TURNO` ya guarda:
  * `id_turno` o `id_tipo_dia`
  * `horas_programadas`
  * multi-turno por `secuencia_dia`
* la matriz backend ya entrega por celda:
  * `valorVisual`
  * `registros`
  * `horasProgramadas`
  * `horaInicio`
  * `horaFin`
* la exportacion ya usa un mapper centralizado
* en modo numerico la exportacion ya usa `horas_programadas` para turnos

### 2.2 Donde esta el acoplamiento actual

Aunque el backend ya soporta un dominio mas rico, todavia hay acoplamientos a Enfermeria en la capa de experiencia:

* la matriz frontend construye herramientas con `buildToolActions(...)`
* ahi filtra explicitamente turnos `M/T/N`
* ahi filtra explicitamente tipos de dia como `FERIADO`, `LICENCIA`, `VACACION`
* `resolveToolDisplayLabel(...)` y `formatRegistroCodigo(...)` siguen transformando casos concretos
* el toolbar todavia nace de una logica semidura, no de una configuracion operativa formal

Conclusion:

* el **modelo transaccional** esta mejor que la **capa de configuracion operativa**
* el cuello de botella no es la base central
* el cuello de botella es la falta de una capa explicita de configuracion por servicio

## 3. Reanalisis del concepto de celda

La celda debe entenderse como un **contenedor de registro operativo diario**.

Minimamente debe poder responder estas cuatro preguntas:

1. Que se ve
   * `M`
   * `12`
   * `VAC`
   * `FR`

2. Cuantas horas representa
   * `6`
   * `12`
   * `0`
   * `4`

3. Que tipo de registro es
   * trabajo
   * descanso
   * licencia
   * vacacion
   * feriado

4. En que contexto aplica
   * servicio
   * familia laboral
   * eventualmente cargo o configuracion mas especifica

### 3.1 Implicacion importante

No conviene pensar la celda como "codigo = verdad del dominio".

La verdad del dominio debe ser:

* si es turno o tipo de dia
* cuantas horas computa
* a que contexto operativo pertenece
* como se representa visualmente

El codigo visible es importante, pero es **representacion**, no el unico dato semantico.

## 4. Modelo minimo recomendado

La recomendacion minima es **no crear un rediseño paralelo**, sino aprovechar `TURNO` y `TIPO_DIA` existentes y agregar una capa de configuracion operativa.

### 4.1 Opcion recomendada

Mantener:

* `TURNO`
* `TIPO_DIA`
* `ROL_TURNO`

Y agregar, a nivel conceptual, una configuracion nueva:

* `configuracion_operativa_servicio`
* `codigo_operativo_servicio`

No como reemplazo del modelo actual, sino como capa de configuracion y presentacion.

## 5. Propuesta concreta de conceptos

### 5.1 `configuracion_operativa_servicio`

Concepto de alto nivel que describe como planifica un servicio.

Responsabilidades esperadas:

* modo visual por defecto
* politica de representacion
* si trabaja por etiquetas o por horas visibles
* si admite multiples familias laborales en la misma matriz
* si agrupa o no por familia
* si requiere exportacion RRHH numerica por defecto

Campos conceptuales minimos:

* `id_servicio`
* `modo_visual_default`
  * `ETIQUETAS`
  * `NUMERICO`
* `agrupa_por_familia`
* `permite_multi_registro_dia`
* `usa_equivalencia_horaria_en_exportacion`
* `activa`

No sustituye `SERVICIO`. Es configuracion operativa del servicio.

### 5.2 `codigo_operativo_servicio`

Este concepto resuelve que codigos puede usar ese servicio y como se muestran.

Debe permitir representar tanto turnos laborales como dias especiales, sin mezclar transaccion principal.

Campos conceptuales minimos:

* `id_servicio`
* `id_familia_laboral` opcional
* `origen`
  * `TURNO`
  * `TIPO_DIA`
* `id_turno` nullable
* `id_tipo_dia` nullable
* `codigo_visual`
* `etiqueta`
* `descripcion`
* `horas_equivalentes`
* `categoria`
  * `TRABAJO`
  * `DESCANSO`
  * `LICENCIA`
  * `VACACION`
  * `FERIADO`
  * otras futuras
* `color`
* `orden_visual`
* `es_laborable`
* `requiere_confirmacion`
* `activo`

### 5.3 Por que no alcanza con `TURNO` solo

`TURNO` ya resuelve muy bien el trabajo real.
Pero no alcanza solo porque:

* `TIPO_DIA` tambien debe entrar al mismo set visible de herramientas
* el servicio puede querer representar distinto el mismo turno segun contexto
* puede existir familia laboral con distinto set visible dentro del mismo servicio
* el frontend necesita un contrato unificado para dibujar toolbar, colores y leyendas

Entonces:

* `TURNO` sigue siendo verdad operativa para trabajo
* `TIPO_DIA` sigue siendo verdad administrativa para incidencias
* `codigo_operativo_servicio` seria la capa de configuracion visible y editable

## 6. Alternativas evaluadas

### 6.1 Reutilizar solo `TURNO/TIPO_DIA` con algunos campos extra

Ventaja:

* minimo movimiento estructural

Problema:

* mezcla configuracion de UX con tablas transaccionales y catalogos centrales
* si luego distintos servicios quieren diferentes etiquetas, orden, color o comportamiento, el acoplamiento crece
* `TIPO_DIA` es global, pero su presentacion puede variar por servicio o familia

Veredicto:

* util para transicion corta
* insuficiente como solucion escalable institucional

### 6.2 Crear `codigo_horario_operativo` global

Ventaja:

* da un catalogo unico de codigos

Problema:

* vuelve a empujar el modelo a un catalogo abstracto central demasiado genérico
* no respeta que el mismo hospital puede reutilizar representaciones distintas segun servicio

Veredicto:

* no es la mejor primera evolucion

### 6.3 Crear solo `configuracion_operativa_servicio`

Ventaja:

* centraliza configuracion por servicio

Problema:

* no alcanza si no existe un nivel de detalle para cada codigo visible

Veredicto:

* necesaria, pero no suficiente por si sola

## 7. Uso recomendado de `TURNO` actual

### 7.1 Enfermeria

Usar `TURNO` para:

* `M`
* `T`
* `N`

Con:

* `duracion_horas = 6/6/12`
* exportacion numerica derivada de horas
* visualizacion principal por etiquetas

### 7.2 Laboratorio

Se puede seguir usando `TURNO` para:

* `6`
* `12`

Y `TIPO_DIA` para:

* `FR`
* `VAC`
* `FN`

Aqui no hace falta inventar un nuevo tipo de entidad.
La diferencia principal no esta en el modelo transaccional, sino en la configuracion visual y de herramientas.

### 7.3 Consulta Externa

Tambien se puede usar `TURNO` para:

* `1`
* `2`
* `3`
* `4`
* `6`

Si esas unidades representan bloques operativos u horas imputables del servicio.

`TIPO_DIA` seguiria cubriendo:

* `FR`
* `VAC`
* `FN`

La limitacion no esta en `TURNO`; esta en que mas adelante puede aparecer un caso donde una persona distribuya horas entre mas de un servicio o actividad. Eso es un problema de asignacion y granularidad futura, no del modelo minimo actual.

## 8. Configuracion por servicio esperada

### 8.1 Enfermeria

* codigos visibles: `M, T, N, LIC, VAC, FN`
* equivalencia: `M=6`, `T=6`, `N=12`
* modo visual por defecto: `ETIQUETAS`
* exportacion RRHH: numerica por horas

### 8.2 Laboratorio

* codigos visibles: `6, 12, FR, VAC, FN`
* equivalencia: `6=6`, `12=12`
* modo visual por defecto: `NUMERICO`
* exportacion RRHH: misma visualizacion numerica

### 8.3 Consulta Externa

* codigos visibles: `1, 2, 3, 4, 6, FR, VAC, FN`
* equivalencia: `1=1`, `2=2`, `3=3`, `4=4`, `6=6`
* modo visual por defecto: `NUMERICO`
* observaciones operativas mas relevantes

## 9. Toolbar dinamica recomendada

La toolbar ya no debe salir de reglas como:

* "mostrar solo M/T/N"
* "mostrar solo LIC/VAC/FN"

Debe venir desde backend segun contexto.

### 9.1 Endpoint recomendado

`GET /v1/planificaciones/:id/configuracion-operativa`

### 9.2 Respuesta sugerida

```json
{
  "planificacion": {
    "id": 1,
    "id_servicio": 10,
    "codigo_servicio": "NEURO"
  },
  "modoVisual": "ETIQUETAS",
  "agrupaPorFamilia": false,
  "codigosPermitidos": [
    {
      "origen": "TURNO",
      "id": 3,
      "codigo": "M",
      "etiqueta": "Manana",
      "descripcion": "Turno manana",
      "horas": 6,
      "categoria": "TRABAJO",
      "color": "#e6f4ea",
      "esLaborable": true,
      "requiereConfirmacion": false
    },
    {
      "origen": "TIPO_DIA",
      "id": 8,
      "codigo": "VAC",
      "etiqueta": "Vacacion",
      "descripcion": "Vacacion",
      "horas": 0,
      "categoria": "VACACION",
      "color": "#fff0f3",
      "esLaborable": false,
      "requiereConfirmacion": false
    }
  ]
}
```

### 9.3 Ventajas

* elimina hardcode de `M/T/N`
* permite un set distinto por servicio
* permite un set distinto por familia mas adelante
* desacopla la UI de reglas temporales de Enfermeria

## 10. Exportacion

La exportacion debe apoyarse en el mismo mapeo central y no en ifs por servicio.

### 10.1 Regla

La exportacion no debe guardar numeros nuevos en base.

Debe poder:

* mostrar la etiqueta visual del sistema
* mostrar la equivalencia numerica para RRHH
* construir leyenda segun contexto

### 10.2 Uso recomendado

* `ROL_TURNO.horas_programadas` sigue siendo la base cuantitativa
* `TURNO` y `TIPO_DIA` siguen siendo la base semantica
* `codigo_operativo_servicio` resuelve:
  * codigo visible
  * etiqueta
  * color
  * categoria
  * presentacion por defecto

### 10.3 Implicacion para Excel/PDF

La plantilla institucional actual sigue sirviendo.

Lo que debe cambiar a futuro no es la plantilla base, sino:

* el conjunto de codigos visibles
* la leyenda
* el modo visual por contexto

Por tanto:

* la versionacion por año debe mantenerse
* la configuracion operativa debe sumarse como una dimension adicional
* no conviene crear una plantilla nueva por cada servicio salvo que la institucion exija un formato radicalmente distinto

## 11. Compatibilidad con lo ya construido

La compatibilidad se mantiene asi:

### 11.1 Lo que sigue igual

* `PLANIFICACION`
* `ROL_TURNO`
* `TURNO`
* `TIPO_DIA`
* `CALENDARIO`
* exportacion versionada
* endpoints principales de matriz

### 11.2 Lo que cambia gradualmente

* la toolbar deja de derivarse por filtros fijos
* el frontend consume configuracion operativa
* la exportacion usa configuracion operativa y horas programadas
* la UX se hace contextual al servicio

## 12. Que se debe cambiar ahora

Arquitectonicamente, lo siguiente que conviene planificar es:

1. formalizar el concepto de configuracion operativa por servicio
2. formalizar el contrato de codigos permitidos para la matriz
3. dejar de asumir `M/T/N` en la toolbar
4. mantener `horas_programadas` como verdad cuantitativa
5. usar `TURNO/TIPO_DIA` como base y no crear una estructura operativa paralela

## 13. Que NO se debe cambiar ahora

No conviene tocar todavia:

* el nucleo transaccional de `ROL_TURNO`
* la separacion `TURNO` vs `TIPO_DIA`
* la logica de calendario
* la exportacion versionada por año
* la estructura general del modulo de planificacion
* la base del frontend de matriz

Tampoco conviene todavia:

* modelar `subservicio_operativo`
* modelar `actividad_operativa`
* meter distribucion multisitio compleja en la primera iteracion

Eso debe esperar a la fase de Consulta Externa real.

## 14. Estrategia por fases

### Fase 1: Enfermeria

Objetivo:

* formalizar que `M/T/N` son codigos visuales con equivalencia horaria
* mover la toolbar a configuracion operativa sin romper la matriz actual
* mantener exportacion RRHH numerica

Resultado esperado:

* el sistema sigue funcionando igual para Enfermeria
* pero deja de estar semantica y visualmente acoplado a ella

### Fase 2: Laboratorio

Objetivo:

* validar modo visual numerico por defecto
* validar codigos `6/12/FR/VAC/FN`
* confirmar que no hace falta rediseño del nucleo

Resultado esperado:

* mismo sistema
* otra configuracion operativa

### Fase 3: Consulta Externa

Objetivo:

* validar horas parciales `1/2/3/4/6`
* validar observaciones operativas mas ricas
* decidir si hace falta introducir actividad o distribucion de horas entre contextos

Resultado esperado:

* solo si ese caso lo exige, analizar una segunda evolucion del modelo

## 15. Riesgos

### 15.1 Riesgo si no se hace esta abstraccion

* el frontend seguira endureciendo `M/T/N`
* cada nuevo servicio obligara a meter ifs
* la exportacion se hara cada vez menos mantenible
* se confundira codigo visual con semantica de horas

### 15.2 Riesgo si se abstrae demasiado pronto

* se puede sobrediseñar un sistema genérico innecesario
* se puede complicar Enfermeria antes de cerrarla bien

La recomendacion correcta es una abstraccion minima guiada por casos reales.

## 16. Alternativas descartadas

### 16.1 Rehacer todo el dominio como "codigo operativo"

Descartado porque:

* destruye lo que ya funciona
* mezcla demasiado pronto turnos y dias especiales
* no aprovecha la separacion correcta ya existente

### 16.2 Mantener todo como esta y meter excepciones por servicio

Descartado porque:

* lleva a `if(servicio === 'LAB')`
* rompe mantenibilidad
* no escala a muchas familias ni servicios

### 16.3 Hacer que la exportacion sea la unica capa flexible

Descartado porque:

* el problema ya no es solo exportacion
* la matriz tambien necesita saber que herramientas mostrar

## 17. Impacto esperado

### 17.1 Backend

Impacto medio y controlado:

* nuevo contrato de configuracion operativa
* nuevo endpoint por planificacion
* reaprovechamiento de `TURNO`, `TIPO_DIA`, `ROL_TURNO`
* sin rehacer casos de uso centrales

### 17.2 Frontend

Impacto localizado:

* toolbar dinamica
* menos hardcode
* mejor adaptabilidad por servicio

### 17.3 Exportacion

Impacto bajo:

* seguir usando mapper central
* incorporar configuracion operativa como fuente de presentacion

## 18. Recomendacion final

La mejor estrategia para crecer de forma escalable es:

1. conservar `TURNO` y `TIPO_DIA` como base del dominio
2. conservar `ROL_TURNO.horas_programadas` como verdad cuantitativa
3. introducir una capa minima de configuracion operativa por servicio
4. exponer un endpoint que entregue toolbar y modo visual
5. usar esa misma configuracion en matriz y exportacion
6. crecer por fases reales:
   * Enfermeria
   * Laboratorio
   * Consulta Externa

## 19. Siguiente paso recomendado

El siguiente paso correcto no es programar todos los servicios.

El siguiente paso correcto es producir una **propuesta tecnica de implementacion incremental** para:

* contrato backend de `configuracion-operativa`
* datos minimos necesarios
* adaptacion de toolbar
* adaptacion de exportacion
* plan de transicion sin romper Enfermeria

Ese siguiente paso ya puede aterrizarse en backend y frontend, pero debe salir de este criterio:

* no rediseñar el sistema
* no hardcodear por servicio
* no perder la base cuantitativa horaria
* no mezclar turnos con dias especiales como si fueran lo mismo

## 20. Implementacion incremental aplicada

En la iteracion actual ya se aplico la primera bajada tecnica de esta propuesta, manteniendo compatibilidad con Enfermeria:

* migracion `013_create_configuracion_operativa_servicio.sql`
* tabla `configuracion_operativa_servicio`
* tabla `codigo_operativo_servicio`
* ~~seed inicial de configuracion operativa para los servicios de Enfermeria Fase 1~~ (ese seed y el
  resto del dataset se eliminaron el 2026-07-06, ver `database/seeds/README.md`; la tabla y el
  endpoint siguen vigentes, solo el dataset de ejemplo ya no existe)
* endpoint `GET /v1/planificaciones/:id/configuracion-operativa`
* resolucion backend de codigos operativos al guardar `rol_turno`
* toolbar dinamica en la matriz mensual
* exportacion que usa configuracion operativa cuando existe y hace fallback al comportamiento anterior cuando no existe

### 20.1 Que ya resuelve

* Enfermeria deja de depender de un toolbar hardcodeado `M/T/N`
* la fuente de verdad cuantitativa sigue siendo `ROL_TURNO.horas_programadas`
* el frontend ya no decide las horas del registro; el backend las resuelve desde configuracion
* la exportacion puede tomar etiquetas, colores y leyenda desde configuracion por servicio

### 20.2 Que todavia no resuelve

* configuracion operativa especifica por familia laboral dentro del mismo servicio
* reglas diferenciadas por familia para un mismo turno del servicio
* agrupacion visual por familia en la matriz
* casos de horas distribuidas entre varios servicios o actividades

### 20.3 Criterio de compatibilidad

Para no romper el sistema ya construido:

* `ROL_TURNO`, `TURNO` y `TIPO_DIA` no se reemplazaron
* el backend mantiene compatibilidad con el flujo legado basado en `idTurno/idTipoDia`
* si un servicio aun no tiene configuracion operativa cargada, el backend genera un fallback desde los turnos y tipos de dia vigentes

Ese fallback es transitorio. La meta correcta sigue siendo que cada servicio opere con configuracion explicita.

## 21. Consolidacion siguiente: capacidades y componentes unificados

La siguiente evolucion aplicada sobre esta base ya no debe crear pantallas nuevas por servicio ni por rol.

El criterio correcto es:

* una sola matriz operativa
* una sola bandeja de planificaciones
* una sola infraestructura de exportacion
* una sola capa de componentes visuales compartidos
* capacidades operativas resueltas desde backend y consumidas por frontend

### 21.1 Capacidades operativas

Ademas del bloque `permisos`, la sesion ya puede exponer `capacidades` mas cercanas a la operacion real:

* `crearPlanificacion`
* `editarPlanificacion`
* `enviarRevisionPlanificacion`
* `volverBorradorPlanificacion`
* `aprobarPlanificacion`
* `cerrarPlanificacion`
* `exportarPlanificacion`
* `exportarPlanificacionLote`
* `verTurnos`
* `gestionarTurnos`
* `verCalendarios`
* `gestionarAsignaciones`

Esto permite que menus, rutas y botones se oculten segun capacidad real, sin repetir reglas visuales sueltas en cada pantalla.

### 21.2 Componentes operativos compartidos

La matriz debe seguir extrayendo su comportamiento desde backend, pero tambien debe apoyarse en componentes compartidos:

* toolbar operativa
* leyenda/configuracion operativa
* chips de estado
* acciones de estado
* filtros y tablas coherentes

Con esto:

* Enfermeria sigue usando etiquetas como ayuda visual
* otros servicios pueden usar numeros u otras representaciones
* la experiencia visual se mantiene institucional y consistente
