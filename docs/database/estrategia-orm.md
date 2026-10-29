# Estrategia ORM

## Objetivo

Introducir ORM sin romper:

* el desacoplamiento del dominio
* el control manual del esquema y las migraciones

## Criterio principal

El ORM no reemplaza la arquitectura. Solo implementa persistencia dentro de infraestructura.

## Reglas

* `synchronize` debe permanecer en `false`
* las migraciones SQL manuales siguen siendo la fuente de verdad
* las entidades ORM no deben cruzar a `domain` ni a `presentation`
* los casos de uso siguen dependiendo de contratos de repositorio
* la validacion del SQL generado debe ser parte de la adopcion

## Estrategia recomendada

### Fase 1

Introducir `TypeORM` como infraestructura compartida:

* `DataSource`
* configuracion por `.env`
* inicializacion controlada

### Fase 2

Migrar primero modulos simples:

* `organizacion.departamento`
* `organizacion.servicio`

### Fase 3

Validar:

* comportamiento funcional equivalente
* compatibilidad del SQL generado
* impacto en pruebas y logs

### Fase 4

Decidir por modulo si conviene:

* ORM
* SQL manual
* estrategia hibrida

## Estrategia hibrida

Se considera valida y recomendada para este proyecto:

* ORM para CRUD y catalogos simples
* SQL manual para consultas complejas, agregaciones o reportes

## Modulo piloto actual

La adopcion inicial de ORM debe comenzar por:

* `GET /v1/departamentos`
* `GET /v1/servicios`
