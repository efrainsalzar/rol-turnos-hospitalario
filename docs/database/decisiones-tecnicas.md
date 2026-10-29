# Decisiones técnicas

Resumen público de las decisiones de arquitectura y modelo de datos más relevantes del proyecto.

El desarrollo se llevó con una bitácora interna de más de 170 decisiones numeradas. Este documento
conserva la **numeración original** de las secciones que se publican, para que las referencias del
código (por ejemplo `decisiones-tecnicas.md §119`) sigan apuntando al mismo tema. Las secciones que no
aparecen aquí corresponden a ajustes puntuales, correcciones o contexto operativo interno que no se
publica.

---

## 2. Dominio desacoplado de persistencia

El backend se organiza en capas por módulo:

* `domain`: entidades, reglas y contratos de repositorio.
* `application`: casos de uso, DTO y coordinación transaccional.
* `infrastructure`: ORM, driver, repositorios concretos y adaptadores.

Ninguna regla de negocio necesita conocer SQL Server. Las interfaces de repositorio viven en `domain` y
las implementaciones en `infrastructure`.

## 3. Migraciones fuera del ORM

El esquema se define con SQL versionado en `database/migrations` y TypeORM corre con
`synchronize = false`. Así el DDL queda legible, revisable y traducible a otro motor, y el ORM no
decide la forma del modelo.

## 6–7. Qué lógica vive en la base y qué en el backend

La base contiene integridad estructural: PK, FK, `UNIQUE`, `CHECK`, defaults e índices. No contiene
procesos de negocio en triggers ni reglas que crucen varias tablas según el contexto funcional.

Quedan en el backend, entre otras:

* coherencia entre la asignación de una persona y su servicio/departamento;
* unicidad efectiva de jefaturas vigentes por unidad;
* control de superposición temporal de asignaciones;
* transiciones de estado de la planificación.

## 8. Estrategia de portabilidad

Nombres en `snake_case`, SQL simple, mínima sintaxis propietaria y dominio sin dependencia del motor.
Un cambio de motor debe afectar solo al adaptador de conexión, a los repositorios concretos y a la
traducción de migraciones, nunca a entidades de dominio ni a casos de uso.

## 11–12. Alcance dual: servicio o departamento

La planificación, los turnos y la configuración operativa pueden pertenecer a un **servicio** o a un
**departamento** (alcance XOR, respaldado por `CHECK`). Las incidencias de personal (vacaciones,
licencias, francos) se configuran a nivel de departamento; los turnos, en cualquiera de los dos. La
matriz mensual consume ambas configuraciones según el contexto.

## 17. Historial inmutable de planificaciones cerradas

Para poder responder "qué tenía planificado el servicio X en marzo" sin que cambios posteriores en
turnos, personal o asignaciones alteren la respuesta, al cerrar una planificación se materializa un
**snapshot plano** en tablas de historial.

Se descartó versionar los catálogos (estilo SCD tipo 2): no resolvía por sí solo la consulta rápida y
obligaba a extender el patrón a varias tablas con mecanismos ya distintos.

## 29. Alcance funcional acotado

Se retiraron del modelo capacidades que tenían implementación real pero quedaban fuera del alcance
("armar el rol mensual"): plantillas de planificación, cobertura mínima por turno, metas de horas
mensuales (más propias de nómina/RRHH) y observaciones diarias por celda. Se eliminaron con migración y
limpieza completa de código, en vez de dejarlas a medias.

## 32. Prueba de portabilidad a PostgreSQL

Como experimento, se extrajo el esquema real desde el catálogo de SQL Server (`sys.tables`,
`sys.columns`, `sys.foreign_keys`, etc.) y se aplicó en PostgreSQL. Resultado: **el esquema es
portable** (tablas, checks, índices y FKs sin errores); lo que no es portable hoy son las consultas SQL
directas de la capa de persistencia. Esto confirma la estrategia de la sección 8.

## 36 / 140. Motor de base de datos y perfiles de compatibilidad

El motor oficial es **SQL Server 2022**. Además se mantiene un perfil de compatibilidad
`mssql-2008r2` como mecanismo de portabilidad para instalaciones con versiones antiguas: toda migración
y consulta nueva debe correr en ambos.

Las diferencias de capacidades (por ejemplo `OFFSET/FETCH`, `STRING_AGG`, funciones JSON) se resuelven
en `DatabaseCapabilities` (`apps/api/src/infrastructure/config/database-profile.ts`), no con
condicionales dispersos por el código.

## 66. Un solo turno por día por persona

No es requisito de negocio asignar más de un turno por día. El backend conserva la capacidad
estructural (`secuencia_dia` en la unicidad de `rol_turno`), pero no se construye interfaz para eso.

## 81. Motivo obligatorio en acciones delicadas

Cerrar, mover o editar una asignación exige un motivo, validado **en frontend y en backend**. La
trazabilidad (quién, cuándo, qué y por qué) no puede depender solo de la interfaz.

## 85. Historial de asignaciones apto para auditoría

Un cambio de unidad se registra como un único evento `TRASLADO` con origen y destino, no como
`CIERRE` + `ALTA` (que parecía un retiro). El historial también distingue si el cambio implicó un cambio
de rol funcional (jefatura ↔ asistencial).

## 115. Rendimiento de la matriz mensual

El análisis de lentitud (carga, pintado de celdas y exportación) mostró que la configuración operativa
se resolvía 2–3 veces por pantalla, con unas 8 consultas secuenciales cada vez. Se agregó una caché en
memoria de corta duración (TTL de 3 s) para esas resoluciones duplicadas, y un índice faltante en
`calendario (anio, mes)`, verificado contra `sys.indexes`. Antes de eso ya se habían separado los
timeouts de conexión y de consulta y acotado el pool. Detalle en `docs/rendimiento/`.

## 117. Sesión: JWT híbrido

El token de sesión es un JWT firmado, pero **cada request se valida contra la tabla `sesion_usuario`**.
Un JWT stateless puro habría perdido la revocación inmediata (logout, reseteo de contraseña, sesión
reemplazada por un login nuevo). También se agregaron: guard global, rate limiting en login y cambio de
contraseña self-service. Las contraseñas se guardan con bcrypt.

## 119. Edición exclusiva de la planificación

Varias jefaturas pueden tener permiso para editar la misma planificación. En vez de concurrencia
optimista por celda (detectar el choque después del hecho), se implementó **edición exclusiva por
planificación**: un solo usuario escribe a la vez, el resto queda en solo lectura y ve quién tiene el
control. Un actor de rango igual o superior puede tomar el control, con confirmación explícita.

## 122. Backpressure en la matriz

El gesto de "pintar" celdas arrastrando el mouse se envía por lotes (`PUT
/v1/planificaciones/:id/matriz/celdas/lote`) con debounce en el frontend. Sobre eso se agregó
backpressure explícito: si el pool de conexiones está saturado, la API responde `503` con el código
`POOL_SATURADO` en vez de encolar sin límite, y el frontend reintenta ese lote con backoff corto y un
número acotado de intentos.

## 126. Consolidación de migraciones

Antes de la primera instalación fuera del entorno de desarrollo, las migraciones originales (muchas eran
ciclos de crear y después eliminar) se consolidaron en un baseline limpio. Se pudo hacer de forma
segura porque ninguna se había aplicado todavía en otro entorno.

## 141 / 146. El cierre congela dos vistas: original y efectiva

Cuando una persona se traslada a mitad de mes, la planificación tiene dos lecturas válidas: la
**original** aprobada al inicio y la **efectiva** ajustada por el traslado. Al cerrar se congelan ambas
en el historial, distinguidas por una columna `vista` en `rol_turno_historial`, en vez de duplicar la
cabecera del historial.

## 147. Estados de planificación por capacidades, no por nombre de rol

Las transiciones (`BORRADOR → REVISION → APROBADA → CERRADA`) exigen la capacidad correspondiente del
rol de seguridad (`aprobar_planificacion`, `cerrar_planificacion`, …), igual para cualquier rol y sin
casos especiales escritos a mano por nombre de rol. Una planificación aprobada no vuelve atrás.

## 158. Builds deterministas

Se corrigieron builds intermitentes en Windows (directorio de salida bloqueado por el antivirus), un
`start:prod` que apuntaba a una ruta inexistente y un modo watch que compilaba los tests. En desarrollo
se usa SWC para compilar más rápido.

## 159. Módulo de integración: puertos y adaptadores

La sincronización de personal desde un sistema de RRHH externo vive en el módulo `integracion`:

* un **runner genérico** (`EjecutarSincronizacionUseCase`) resuelve bloqueo, ejecución, cierre y errores;
* cada fuente es un **conector**, y un sistema nuevo solo necesita su adaptador (`FuentePersonalExterna`);
* lo que se lee pasa por una **capa anti-corrupción** (`PersonaExterna`) y por staging con validación
  previa (dry run) antes de aplicarse;
* el alta de personal se hace a través del módulo `personal`, nunca escribiendo directo en sus tablas;
* la conexión a la fuente es **de solo lectura**, con ubicación y credenciales configurables por separado.

## 166. Perfiles de entorno

Tres perfiles con base propia: `demo` (datos ficticios, se puede resetear), `preparacion` (copia de
trabajo, se puede resetear) y `produccion` (nunca se resetea ni se siembra; se llena por
backup/restore). Los scripts destructivos (`reset:db`, seeds) se niegan a correr contra una base no
reseteable.
