# Mapa de Menus y Acciones por Perfil

> **Nota (2026-07-05):** este mapa se verifico contra el codigo real en una auditoria que corrigio desvios (botones deshabilitados en vez de ocultos en Personal/Asignaciones, fuga de alcance en el selector de departamento de Servicios, y un hueco de autorizacion en backend en `ServicioController`/`DepartamentoController`).

## Objetivo

Dejar claro, para la primera presentacion institucional, que ve y que hace cada perfil operativo priorizado:

- `ADMIN_SISTEMA`
- `JEFE_DEPARTAMENTO`
- `JEFE_SERVICIO`

El alcance operativo actual esta orientado a:

- `Departamento de Enfermeria`
- sus servicios activos
- planificacion mensual
- asignaciones
- horarios del servicio
- visualizacion operativa

## Reglas globales de acceso

- los menus visibles dependen de `permisos` y `capacidades`
- las rutas sensibles usan `RequirePermission`
- backend valida alcance y estados en:
  - `personal`
  - `asignaciones`
  - `turnos`
  - `planificaciones`
- las jefaturas no dependen solo de ocultamiento visual; el backend recorta por alcance real

## Reglas de estados de planificacion

Estados actuales:

- `BORRADOR`
- `REVISION`
- `APROBADA`
- `CERRADA`

Reglas vigentes:

- `BORRADOR`
  - editable por `ADMIN_SISTEMA`
  - editable por `JEFE_DEPARTAMENTO` del alcance
  - editable por `JEFE_SERVICIO` del alcance
- `REVISION`
  - editable solo por `JEFE_DEPARTAMENTO` del alcance
  - `JEFE_SERVICIO` solo puede ver
  - `JEFE_DEPARTAMENTO` puede devolver a `BORRADOR` o aprobar
- `APROBADA`
  - no editable
  - `JEFE_DEPARTAMENTO` puede devolver a `REVISION`
  - solo `JEFE_DEPARTAMENTO` o `ADMIN_SISTEMA` puede cerrar
- `CERRADA`
  - oculta para jefaturas operativas
  - `ADMIN_SISTEMA` mantiene visibilidad global de consulta

## Conflicto JEFE_DEPARTAMENTO vs JEFE_SERVICIO

Regla operativa actual recomendada para presentacion:

- `BORRADOR`: trabajo colaborativo permitido dentro del mismo alcance de servicio
- `REVISION`: bloquea a `JEFE_SERVICIO` y deja edicion solo a `JEFE_DEPARTAMENTO`
- `APROBADA`: congelada para edicion
- `CERRADA`: congelada definitivamente

No existe todavia:

- bloqueo por propietario/creador
- historial detallado de cambios por celda

Para la presentacion esto debe explicarse asi:

- el control de concurrencia actual se resuelve por `estado`
- no por `dueno`

## Auditoria de permisos y capacidades

### Permisos operativos actuales

- `puedeVerOrganizacion`
- `puedeVerPersonal`
- `puedeGestionarPersonal`
- `puedeVerAsignaciones`
- `puedeGestionarAsignaciones`
- `puedeVerSeguridad`
- `puedeGestionarUsuarios`
- `puedeVerOperacion`
- `puedeVerPlanificacion`
- `puedeEditarPlanificacion`
- `puedeAprobarPlanificacion`

### Capacidades operativas actuales

- `verCalendarios`
- `verTiposDia`
- `verCargasHorarias`
- `verTurnos`
- `crearPlanificacion`
- `editarPlanificacion`
- `enviarRevisionPlanificacion`
- `volverBorradorPlanificacion`
- `aprobarPlanificacion`
- `cerrarPlanificacion`
- `exportarPlanificacion`
- `exportarPlanificacionLote`
- `gestionarCodigosOperativos`
- `gestionarTurnos`
- `gestionarAsignaciones`
- `gestionarServicios`
- `gestionarUsuarios`

### Permisos ideales futuros

Para evolucion futura conviene converger gradualmente a nombres como:

- `personal.ver`
- `personal.crear`
- `personal.editar`
- `personal.activar_desactivar`
- `asignaciones.ver`
- `asignaciones.crear`
- `asignaciones.cambiar`
- `asignaciones.cerrar`
- `planificaciones.ver`
- `planificaciones.crear`
- `planificaciones.editar`
- `planificaciones.enviar_revision`
- `planificaciones.aprobar`
- `planificaciones.cerrar`
- `planificaciones.exportar`
- `operacion.horarios.ver`
- `operacion.horarios.gestionar`
- `operacion.visualizacion.gestionar`
- `seguridad.usuarios.gestionar`
- `seguridad.roles.ver`

No se renombraron todavia para no romper el sistema antes de la presentacion.

---

## Perfil: ADMIN_SISTEMA

### Proposito

Preparar el sistema, cargar estructura, personal y usuarios, y supervisar el flujo institucional.

### Menus visibles

- `Sistema`
  - `Sesion`
  - `Health`
- `Organizacion`
  - `Departamentos`
  - `Servicios`
- `Personal`
  - `Personal`
  - `Asignaciones`
  - `Familias laborales`
  - `Cargos`
- `Seguridad`
  - `Roles`
  - `Usuarios`
- `Operacion`
  - `Calendarios`
  - `Catalogo de feriados`
  - `Incidencias personales`
  - `Horarios del servicio`
  - `Visualizacion operativa`
  - `Cargas horarias`
- `Planificacion`
  - `Planificaciones`

### Rutas visibles

- `/organizacion/departamentos`
- `/organizacion/servicios`
- `/personal`
- `/personal/asignaciones`
- `/personal/familias-laborales`
- `/personal/cargos`
- `/seguridad/roles`
- `/seguridad/usuarios`
- `/operacion/calendarios`
- `/operacion/tipos-feriado`
- `/operacion/incidencias-personales`
- `/operacion/turnos`
- `/operacion/configuracion-operativa`
- `/operacion/cargas-horarias`
- `/planificacion/planificaciones`

### Acciones visibles

- crear, editar y dar de baja personal
- crear, editar y dar de baja usuarios
- ver roles
- crear, editar, activar y desactivar horarios del servicio
- ajustar visualizacion operativa
- generar calendarios
- crear borradores de planificacion
- revisar, exportar, aprobar y cerrar planificaciones

### CRUD realmente disponible

- `Personal`: alta, edicion, baja logica
- `Usuarios`: alta, edicion, baja logica
- `Roles`: alta, edicion, activacion/desactivacion y configuracion de permisos/capacidades
- `Servicios/Departamentos`: alta, edicion y activacion/desactivacion
- `Catalogo de feriados`: lectura y gestion institucional
- `Incidencias personales`: lectura y gestion institucional

### Pendientes claros para ADMIN

- aplicar la migracion `017_add_role_permissions_and_scope.sql` en cada base nueva antes de probar roles dinamicos
- eliminar fallbacks legacy por `rol.codigo` que todavia quedan en reglas de dominio puntuales

---

## Perfil: JEFE_DEPARTAMENTO

### Proposito

Supervisar los servicios de su departamento, mover personal entre servicios y controlar el flujo de planificacion.

### Menus visibles

- `Sistema`
  - `Sesion`
  - `Health`
- `Organizacion`
  - `Servicios`
- `Personal`
  - `Personal`
  - `Asignaciones`
- `Operacion`
  - `Calendarios`
  - `Horarios del servicio`
  - `Visualizacion operativa`
- `Planificacion`
  - `Planificaciones`

### Rutas visibles

- `/organizacion/servicios`
- `/personal`
- `/personal/asignaciones`
- `/operacion/calendarios`
- `/operacion/turnos`
- `/operacion/configuracion-operativa`
- `/planificacion/planificaciones`
- `/planificacion/matriz/:id`

### Acciones visibles

- ver servicios de su departamento
- ver personal del departamento
- ver detalle de personal dentro de su alcance
- mover personal entre servicios del departamento
- quitar personal de un servicio y dejarlo disponible en el departamento
- crear planificaciones para servicios de su departamento
- preparar siguiente mes
- exportar individual o por lote
- revisar matrices
- devolver a borrador
- aprobar
- cerrar

### Acciones bloqueadas

- crear o dar de baja personal institucional
- gestionar usuarios
- gestionar roles
- editar catalogos de familias o cargos
- ver otros departamentos
- editar servicios fuera de su alcance

### Permisos requeridos

- `puedeVerOrganizacion`
- `puedeVerPersonal`
- `puedeVerAsignaciones`
- `puedeGestionarAsignaciones`
- `puedeVerOperacion`
- `puedeVerPlanificacion`
- `puedeAprobarPlanificacion`
- capacidades:
  - `verCalendarios`
  - `verTurnos`
  - `gestionarTurnos`
  - `gestionarCodigosOperativos`
  - `crearPlanificacion`
  - `aprobarPlanificacion`
  - `cerrarPlanificacion`
  - `exportarPlanificacion`
  - `exportarPlanificacionLote`

---

## Perfil: JEFE_SERVICIO

### Proposito

Gestionar solo su servicio, cargar el rol mensual y enviarlo a revision.

### Menus visibles

- `Sistema`
  - `Sesion`
  - `Health`
- `Organizacion`
  - `Servicios`
- `Personal`
  - `Personal`
- `Operacion`
  - `Horarios del servicio`
  - `Visualizacion operativa`
- `Planificacion`
  - `Planificaciones`

### Rutas visibles

- `/organizacion/servicios`
- `/personal`
- `/operacion/turnos`
- `/operacion/configuracion-operativa`
- `/planificacion/planificaciones`
- `/planificacion/matriz/:id`

### Acciones visibles

- ver solo su servicio
- ver solo personal de su servicio
- ver detalle de personal dentro de su alcance
- editar horarios reales del servicio
- editar ayuda visual operativa del servicio
- crear borrador de planificacion de su servicio
- editar matriz si la planificacion esta en `BORRADOR`
- enviar a revision
- exportar su planificacion

### Acciones bloqueadas

- reasignar personal
- ver otros servicios
- aprobar o cerrar planificaciones
- gestionar seguridad
- gestionar catalogos institucionales
- editar contenido cuando la planificacion esta en `REVISION`, `APROBADA` o `CERRADA`

### Permisos requeridos

- `puedeVerOrganizacion`
- `puedeVerPersonal`
- `puedeVerOperacion`
- `puedeVerPlanificacion`
- `puedeEditarPlanificacion`
- capacidades:
  - `verTurnos`
  - `gestionarTurnos`
  - `gestionarCodigosOperativos`
  - `crearPlanificacion`
  - `editarPlanificacion`
  - `enviarRevisionPlanificacion`
  - `volverBorradorPlanificacion`
  - `exportarPlanificacion`

---

## Botones internos que dependen de permiso

### Personal

- `Nuevo personal`: perfiles con `puedeGestionarPersonal`
- `Editar`: perfiles con `puedeGestionarPersonal`
- `Baja`: perfiles con `puedeGestionarPersonal`
- `Detalle`: visible en perfiles con `puedeVerPersonal`

### Asignaciones

- `Cambiar asignacion`: perfiles con `puedeGestionarAsignaciones`
- `Quitar asignacion`: perfiles con `puedeGestionarAsignaciones`
- `JEFE_SERVICIO`: no ve el modulo

### Planificaciones

- `Nueva planificacion`: perfiles con `crearPlanificacion`
- `Preparar siguiente mes`: perfiles con `crearPlanificacion`
- `Enviar a revision`: perfiles con `enviarRevisionPlanificacion`
- `Aprobar`: perfiles con `aprobarPlanificacion`
- `Cerrar`: perfiles con `cerrarPlanificacion`
- `Exportar lote`: perfiles con `exportarPlanificacionLote`

---

## Limites conocidos para la presentacion

- no existe historial detallado por celda de matriz
- el control de concurrencia de planificacion se basa en `estado`, no en propietario
- la administracion totalmente dinamica de roles requiere que la base tenga aplicada la migracion `017`
