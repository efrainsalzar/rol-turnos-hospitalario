# Plantilla de referencia para Rol de Turnos Mensual

## Objetivo

Este documento fija la referencia visual y funcional de la tabla principal de `rol de turnos mensual` que luego debe reproducirse en el frontend.

La fuente de inspiración es el formato operativo usado en Excel por el hospital.  
Los datos mostrados aquí son solo de ejemplo.

## Propósito en el sistema

La tabla representa un rol mensual por servicio con tres bloques:

1. datos fijos del personal
2. calendario mensual con una celda por día
3. columnas finales de control

Esta es la vista objetivo que debe guiar el diseño del módulo `planificacion` en frontend.

---

## Plantilla base

```text
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                          ROL DE TURNOS                                                           ║
║                                DEPARTAMENTO / SERVICIO / MES Y AÑO DE LA PLANIFICACIÓN                                           ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝


┌────────────────────────────────────── BLOQUE 1: DATOS DEL PERSONAL ──────────────────────────────────────┐
│                                                                                                           │
│ [1] N° │ [2] Nro.ITEM │ [3] C/H │ [4] C.I. │ [5] ITEM TGN/MIN │ [6] AP.PATERNO │ [7] AP.MATERNO │     │
│                                                                                                           │
│                                      [8] NOMBRES │ [9] CARGO ACTUAL                                      │
│                                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────── BLOQUE 2: CALENDARIO MENSUAL ────────────────────────────────────────┐
│                                                                                                                │
│ DÍA DEL MES →                                                                                                  │
│                                                                                                                │
│   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27 │
│  28  29  30  31                                                                                                │
│                                                                                                                │
│   V   S   D   L   M   M   J   V   S   D   L   M   M   J   V   S   D   L   M   M   J   V   S   D   L   M   M │
│   J   V   S   D                                                                                                │
│                                                                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────── BLOQUE 3: COLUMNAS FINALES DE CONTROL ────────────────────────────┐
│                                                                                                 │
│ [TOTAL HRS MES] │ [HORARIO] │ [OBSERVACIONES]                                                   │
│                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Ejemplo de fila completa

```text
┌────┬──────────┬─────┬──────────┬──────────────┬────────────┬────────────┬────────────┬────────────────┬───────────────────────────────────────────────────────────────┬────────────┬────────────────┐
│ N° │ Nro.ITEM │ C/H │   C.I.   │ ITEM TGN/MIN │ AP.PATERNO │ AP.MATERNO │  NOMBRES   │ CARGO ACTUAL   │                 DÍAS DEL MES                                │ TOTAL HRS  │ OBSERVACIONES  │
├────┼──────────┼─────┼──────────┼──────────────┼────────────┼────────────┼────────────┼────────────────┼───────────────────────────────────────────────────────────────┼────────────┼────────────────┤
│ 1  │   245    │  H  │ 5487211  │     TGN      │ PEREZ      │ GUTIERREZ  │ JUAN CARLOS│ TEC. ASIST.    │ FN FN  V  V  V  V  V     V  V  V  V  V     V  V  V  V  V   │     0      │ VACACIONES     │
│ 2  │   350    │  H  │ 7712458  │     MIN      │ ROJAS      │ FLORES     │ ANA MARIA  │ AUXILIAR       │ FN FN  6  6  6  6  6     6  6  6  6  6     6  6  6  6  6   │    102     │ NORMAL         │
│ 3  │   410    │  H  │ 6123478  │     TGN      │ QUISPE     │ MENDOZA    │ LUIS ALBER │ ADMINISTRATIVO │ FN FN  7  7  7  7  7     7  7  7  7  7     7  7  7  7  7   │    140     │ NORMAL         │
└────┴──────────┴─────┴──────────┴──────────────┴────────────┴────────────┴────────────┴────────────────┴───────────────────────────────────────────────────────────────┴────────────┴────────────────┘
```

---

## Estructura lógica

### Columnas 1 a 9

```text
┌──────────────────────────┐
│ DATOS FIJOS DEL PERSONAL │
└──────────────────────────┘
```

### Columnas 10 a 40

```text
┌──────────────────────────┐
│ DÍAS DEL MES (1-31)      │
│ Cada celda = turno       │
│ o estado diario          │
└──────────────────────────┘
```

### Columnas finales

```text
┌──────────────────────────┐
│ TOTAL HORAS              │
│ HORARIO                  │
│ OBSERVACIONES            │
└──────────────────────────┘
```

---

## Leyenda funcional

```text
FN = Feriado Nacional
V  = Vacación
LV = Licencia a cuenta Vacación
6  = Turno o carga horaria tipo 6
7  = Turno o carga horaria tipo 7
```

Regla de interpretación:

* un código diario puede venir de `turno`
* o puede venir de `tipo_dia`
* o puede venir del propio `calendario` cuando se trate de un marcador institucional como feriado

---

## Encaje con el sistema actual

## Sí encaja bien

La estructura principal ya coincide bastante con el sistema que estamos construyendo:

* `departamento`, `servicio` y `planificacion` ya existen
* el calendario mensual ya existe
* `rol_turno` ya existe
* `tipo_dia` ya existe
* `turno` ya existe
* la matriz mensual ya existe en backend
* los resúmenes de horas por persona ya existen

Eso significa que la parte central de la tabla ya es compatible con la arquitectura actual.

## Lo que ya podemos renderizar

Con lo implementado hoy ya podemos dibujar en frontend:

* encabezado con hospital, departamento, servicio, mes y año
* fila superior de días `1..31`
* fila secundaria con día de semana
* filas por persona
* códigos diarios por celda
* total de horas del mes

## Lo que todavía requiere ajuste de dominio o contrato

Estas columnas no están completamente cerradas todavía:

1. `Nro.ITEM`
   * hoy no existe como contrato claro en la API pública
   * parece ser un dato administrativo o de nómina

2. `C/H`
   * hoy no existe un contrato público claro para esa abreviatura
   * puede depender de tipo de contrato, categoría o jornada

3. `ITEM TGN/MIN`
   * hoy no está formalizado como parte del dominio expuesto
   * parece ser dato presupuestario o de fuente de financiamiento

4. `HORARIO`
   * la columna final todavía no está modelada como salida consolidada
   * hay que definir si será:
     * texto libre derivado
     * resumen de patrón
     * o una columna eliminable del diseño final

5. `OBSERVACIONES`
   * el módulo de observaciones todavía no está implementado
   * hoy no conviene simularlo como texto fijo sin contrato backend

## Conclusión de encaje

Sí, esta tabla **sí cumple con el sistema que estamos realizando**.

Pero para replicarla de forma fiel en frontend, todavía debemos formalizar mejor estos datos:

* datos administrativos de personal
* observaciones
* definición de la columna `horario`

---

## Recomendación de diseño frontend

La tabla web no debe copiar el Excel de forma literal píxel por píxel.  
Debe respetar su lógica visual, pero adaptada a una interfaz usable.

## Propuesta de renderizado

### Encabezado superior

Mostrar:

* hospital
* departamento
* servicio
* periodo
* estado de planificación
* versión

### Bloque izquierdo fijo

Columnas sticky:

* `N°`
* `Nro.Item`
* `C/H`
* `C.I.`
* `Item TGN/MIN`
* `Ap. paterno`
* `Ap. materno`
* `Nombres`
* `Cargo actual`

### Bloque central desplazable

Una columna por día:

* encabezado con número del día
* segunda línea con inicial del día de semana
* celda con código corto:
  * `M`
  * `T`
  * `N`
  * `V`
  * `LV`
  * `FN`
  * etc.

Si un día tiene más de un registro:

* mostrar chips apilados
* o doble línea dentro de la misma celda

### Bloque derecho fijo

Columnas sticky:

* `Total hrs mes`
* `Horario`
* `Observaciones`

---

## Recomendación técnica para el frontend

Para esta vista conviene usar:

* tabla horizontal con scroll
* columnas fijas a izquierda y derecha
* cabecera doble
* celdas compactas
* chips cortos por turno o tipo de día
* colores por categoría:
  * turno normal
  * feriado
  * vacaciones
  * licencia
  * descanso

La fuente principal de datos debería salir de un endpoint de matriz mensual más rico que el actual, o de una evolución del ya existente:

* `GET /v1/planificaciones/:id/matriz-mensual`

Ese endpoint tendrá que enriquecerse después con:

* más datos administrativos del personal
* observaciones por persona
* horario consolidado
* codificación visual lista para UI

---

## Decisión recomendada antes de implementarla

Antes de construir esta pantalla en frontend conviene tomar estas decisiones:

1. confirmar si `Nro.ITEM`, `C/H` e `ITEM TGN/MIN` entran al alcance del sistema
2. confirmar si `OBSERVACIONES` será por persona, por día o por planificación
3. definir qué significa exactamente `HORARIO`
4. decidir si una celda diaria admite:
   * un solo código
   * varios códigos
   * o combinación de turno + marca especial

---

## Estado recomendado

Esta plantilla queda aprobada como:

* referencia visual de negocio
* base para diseño frontend del rol mensual
* guía para enriquecer `matriz-mensual`

No debe tratarse todavía como contrato cerrado de API.

Primero es una referencia visual y funcional del producto final.
