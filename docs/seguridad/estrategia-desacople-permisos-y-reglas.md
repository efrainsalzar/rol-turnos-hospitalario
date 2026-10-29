# Estrategia de Desacople entre Permisos, Reglas y Frontend

## Objetivo

Separar correctamente tres capas del sistema:

1. **Configuracion persistida**
   - vive en base de datos
   - define permisos, capacidades y alcance
2. **Reglas del dominio**
   - viven en backend
   - aplican jerarquia, transiciones y validaciones
3. **Presentacion**
   - vive en frontend
   - solo consume sesion y catalogos expuestos por la API

La meta no es mover todo a tablas.

La meta correcta es:

- mover a base de datos todo lo configurable
- dejar en backend solo reglas estructurales del dominio
- impedir que el frontend recalcule permisos o jerarquias

---

## Alcance de esta fase

El circuito funcional actual queda acotado a:

- `ADMIN_SISTEMA`
- `JEFE_DEPARTAMENTO` de Enfermeria
- `JEFE_SERVICIO` de Enfermeria

La documentacion, seed activo y pruebas de esta fase deben concentrarse en esos tres perfiles.

---

## Fuente de verdad actual

La fuente de verdad de seguridad queda distribuida asi:

### Base de datos

- `dbo.rol`
  - `alcance_planificacion`
  - permisos globales
  - capacidades operativas
- `dbo.usuario`
  - vinculacion a rol
- estructura organizativa
  - `departamento`
  - `servicio`
  - `personal`
  - `asignacion_personal`

### Backend

- arma la sesion desde `dbo.rol`
- decide alcance real segun asignaciones y jerarquia
- valida transiciones de planificacion
- valida restricciones operativas

### Frontend

- consume `session.permisos`
- consume `session.capacidades`
- consume `session.alcancePlanificacion`
- no reconstruye permisos por `rol.codigo`

---

## Que ya quedo resuelto

## 1. Rol persistido activo

La migracion:

- [017_add_role_permissions_and_scope.sql](/database/migrations/017_add_role_permissions_and_scope.sql)

ya queda como base del modelo actual.

Con eso:

- `dbo.rol` define permisos
- `dbo.rol` define capacidades
- `dbo.rol` define alcance

## 2. Sesion sin fallbacks operativos

La sesion backend ya no usa builders por `rol.codigo` para:

- permisos
- capacidades
- alcance

Si faltara configuracion persistida:

- permisos => `false`
- capacidades => `false`
- alcance => `LECTURA`

Eso evita seguir manteniendo perfiles efectivos hardcodeados.

## 3. Frontend desacoplado de rol fijo

El frontend ya no usa reconstruccion local de permisos o capacidades.

para controlar menu, rutas o botones.

Ahora depende de:

- `session.permisos`
- `session.capacidades`
- `session.alcancePlanificacion`

## 4. Control administrativo desacoplado

La gestion de:

- `Personal`
- `Asignaciones`
- `Organizacion`
- `Turnos`
- catalogos administrativos

ya no depende de checks fijos de rol para administracion simple.

Ahora depende de permisos y capacidades persistidos.

## 5. Jerarquia consolidada

Los checks repetidos de jefatura se concentraron en helpers compartidos de backend.

Eso reduce duplicacion entre:

- `personal`
- `organizacion`
- `operacion`

---

## Que debe seguir viniendo de base de datos

## Seguridad y acceso

- roles
- permisos
- capacidades
- alcance
- usuarios

## Catalogos operativos

- `tipo_feriado`
- `tipo_dia`
- `turno`
- `carga_horaria`
- `rol_funcional`
- `configuracion_operativa_servicio`
- `codigo_operativo_servicio`

## Estructura institucional

- departamentos
- servicios
- personal
- asignaciones

---

## Que NO debe pasar a configuracion libre

## 1. Jerarquia de jefaturas

Estas reglas deben quedarse en backend:

- una `JEFE_DEPARTAMENTO` opera sobre su departamento y sus servicios
- una `JEFE_SERVICIO` opera solo sobre su servicio
- una jefatura no gana alcance fuera de su estructura real

## 2. Flujo de estados de planificacion

Estas transiciones siguen siendo regla del dominio:

- `BORRADOR -> REVISION`
- `REVISION -> BORRADOR`
- `REVISION -> APROBADA`
- `APROBADA -> REVISION`
- `APROBADA -> CERRADA`

No deben quedar como configuracion editable por un admin comun.

## 3. Restricciones de edicion por jerarquia

Tambien deben quedarse en backend:

- `BORRADOR`: jefatura departamental y de servicio pueden editar
- `REVISION`: solo jefatura departamental puede editar
- `APROBADA`: ambas jefaturas solo ven
- `CERRADA`: las jefaturas ya no operan

## 4. Invariantes de rol funcional

No deben quedar libres:

- una jefatura de servicio requiere servicio
- una jefatura de departamento requiere coherencia departamental

---

## Patrones aplicados

## Policy Pattern

Para decidir:

- puede ver
- puede editar
- puede gestionar
- puede transicionar

## Session Snapshot

La sesion funciona como snapshot operativo:

- rol
- permisos
- capacidades
- alcance
- departamentos gestionables
- servicios gestionables

El frontend no recalcula eso.

## Catalog Pattern

Los codigos y catalogos operativos se leen desde base de datos y no desde listas fijas en UI.

---

## Estado final de Fase 2

Fase 2 queda cerrada con este criterio:

- seguridad configurable sale de base de datos
- backend concentra reglas del dominio
- frontend consume sesion real
- los checks restantes por `JEFE_DEPARTAMENTO` y `JEFE_SERVICIO` no son deuda; son politica del dominio

---

## Que sigue despues de Fase 2

La siguiente fase ya no es de desacople de permisos.

La siguiente fase corresponde a:

- login institucional final
- sincronizacion con datos reales institucionales
- reglas operativas adicionales para otros perfiles cuando realmente entren al circuito
