# Contratos estables de API

Este documento fija convenciones de contrato para reducir friccion al iniciar frontend.

## Respuesta de coleccion

Todos los listados publicos deben responder con la misma forma general:

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

Reglas:

* `data` siempre es arreglo
* `meta.total` siempre refleja la cantidad de elementos devueltos
* no mezclar esta forma con respuestas ad hoc por modulo

## Parametros de query

Regla preferida:

* exponer parametros externos en `snake_case`

Compatibilidad transitoria:

* si ya existe un parametro legado en `camelCase`, se puede aceptar como alias mientras se documenta `snake_case` como preferido

Ejemplos preferidos:

* `id_departamento`
* `id_servicio`
* `id_tipo_turno`
* `id_nivel_cargo`
* `activo`

## IDs y tipos primitivos

Reglas:

* los `id` deben salir como `number` en JSON
* los flags lógicos deben salir como `boolean`
* no exponer valores `bigint` serializados como texto si el backend puede normalizarlos antes

## Identidad local base

Mientras no exista autenticación activa, los endpoints de seguridad pueden exponer proyecciones operativas de identidad, pero nunca secretos.

Reglas:

* no exponer `password_hash`
* no exponer tokens, sesiones ni secretos
* exponer solo datos necesarios para administración y futura pantalla de login:
  * `username`
  * `proveedorAutenticacion`
  * `sujetoAutenticacion`
  * `identidadLocalHabilitada`
  * relación con `rol`
  * relación con `personal`, si existe

## Errores de validacion

Los endpoints con validacion deben devolver `400` cuando el parametro no cumple formato o rango esperado.

Casos tipicos:

* entero no valido
* booleano invalido
* rango fuera de minimo permitido

## Regla de evolucion

Si un contrato publico cambia:

* actualizar `docs/api/README.md`
* actualizar este documento si la regla transversal cambia
* agregar o ajustar pruebas e2e del endpoint afectado
