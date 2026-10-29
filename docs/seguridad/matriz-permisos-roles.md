# Matriz de permisos por rol (los 4 roles reales en uso)

**Fecha:** 2026-07-22 (actualizado: RRHH pasó a tener casi todos los permisos de Admin — ver sección 2)
**Fuente:** `database/migrations/006_seed_catalogos_base.sql` (siembra de `dbo.rol_seguridad`), verificado
campo por campo contra el SQL real, no de memoria.

`dbo.rol_seguridad` tiene 5 filas (`ADMIN_SISTEMA`, `RRHH`, `JEFE_DEPARTAMENTO`, `JEFE_SERVICIO`,
`PLANIFICADOR`), pero **hoy solo existen usuarios de 4 de esos roles** (`admin.sistema`, `rrhh1.sistema`,
`rrhh2.sistema`, y los que se creen para Jefe de Departamento / Jefe de Servicio). `PLANIFICADOR` queda
fuera de esta comparativa porque todavía no tiene usuarios reales.

## 1. Alcance de cada rol

| Rol | Alcance | ¿Requiere personal con jefatura activa? |
|---|---|---|
| Admin | Sistema | ❌ |
| RRHH | Sistema | ❌ |
| Jefe de Departamento | Departamento | Sí — el departamento que gestiona sale de su asignación real activa, no del rol en sí |
| Jefe de Servicio | Servicio | Sí — mismo mecanismo, a nivel servicio |

## 2. Lo rápido: en qué se diferencia cada uno de Admin

Admin tiene los 31 permisos activos. En vez de repetir una tabla larga de "✅" para leer las
diferencias, acá está solo lo que cambia.

### Admin — 31 / 31
Control total, sin excepciones.

### RRHH — 30 / 31
Prácticamente igual que Admin. La única limitación real:

- NO tiene **Gestionar servicios (organización)** — no puede crear ni editar departamentos/servicios.
  Eso sigue siendo exclusivo de Admin.

Todo lo demás quedó habilitado en la actualización de 2026-07-22: gestión de seguridad y usuarios,
ciclo completo de planificación (crear, editar, enviar a revisión, aprobar, cerrar, exportar — de
**cualquier** servicio, no solo el propio), reportes, códigos operativos y catálogo de turnos.

### Jefe de Departamento — 19 / 31
❌ tiene, a diferencia de Admin:

- Ver / gestionar personal directamente (lo maneja RRHH)
- Ver seguridad / gestionar usuarios
- Gestionar calendarios, incidencias, feriados, cargas horarias (catálogos de apoyo — RRHH)
- Gestionar el catálogo de turnos (horarios) ni servicios
- Ver reportes

En cambio sí tiene el ciclo completo de planificación de su departamento y aprueba movimientos
organizativos.

### Jefe de Servicio — 12 / 31
Es el más acotado. Lo que sí tiene (más corto que listar lo que no):

- Ver asignaciones, operación, planificación, calendarios, incidencias, turnos (todo en modo lectura)
- Crear planificación de su servicio, editarla, enviarla a revisión, exportarla
- Gestionar códigos operativos

❌ aprueba ni cierra planificaciones (eso es del Jefe de Departamento), no gestiona personal, ni
catálogos de apoyo, ni ve la organización completa — solo su propio ámbito.

## 3. Diferencia clave entre los dos niveles de jefatura

El Jefe de Departamento tiene autoridad de aprobación, cierre y exportación por lote que el Jefe de
Servicio no tiene — es una jerarquía real de dos niveles dentro del ciclo de planificación, no el mismo
rol repetido a distinta escala.

## 4. Matriz completa (referencia — los 31 permisos)

✅ = permitido · ❌ = no permitido. Columnas alineadas con espacios (no una tabla markdown) para que se
lean bien como texto plano, sin renderizador.

```
Permiso                                  |  Admin  |  RRHH   | J.Depto | J.Serv  
-----------------------------------------+---------+---------+---------+---------

ORGANIZACION Y PERSONAL
Ver organizacion                         |   ✅    |   ✅    |   ✅    |   ❌    
Ver personal                             |   ✅    |   ✅    |   ❌    |   ❌    
Gestionar personal                       |   ✅    |   ✅    |   ❌    |   ❌    
Ver asignaciones                         |   ✅    |   ✅    |   ✅    |   ✅    
Gestionar asignaciones                   |   ✅    |   ✅    |   ✅    |   ❌    

SEGURIDAD
Ver seguridad                            |   ✅    |   ✅    |   ❌    |   ❌    
Gestionar usuarios y roles               |   ✅    |   ✅    |   ❌    |   ❌    

OPERACION Y CATALOGOS
Ver operacion                            |   ✅    |   ✅    |   ✅    |   ✅    
Ver calendarios                          |   ✅    |   ✅    |   ✅    |   ✅    
Gestionar calendarios                    |   ✅    |   ✅    |   ❌    |   ❌    
Ver incidencias personales               |   ✅    |   ✅    |   ✅    |   ✅    
Gestionar incidencias personales         |   ✅    |   ✅    |   ❌    |   ❌    
Gestionar catalogo de feriados           |   ✅    |   ✅    |   ❌    |   ❌    
Ver cargas horarias                      |   ✅    |   ✅    |   ❌    |   ❌    
Gestionar cargas horarias                |   ✅    |   ✅    |   ❌    |   ❌    
Ver horarios del servicio (catalogo)     |   ✅    |   ✅    |   ✅    |   ✅    
Gestionar codigos operativos             |   ✅    |   ✅    |   ✅    |   ✅    
Gestionar horarios del servicio (turnos) |   ✅    |   ✅    |   ❌    |   ❌    
Gestionar servicios (organizacion)       |   ✅    |   ❌    |   ❌    |   ❌    

CICLO DE PLANIFICACION
Ver planificacion                        |   ✅    |   ✅    |   ✅    |   ✅    
Editar planificacion (flag general) *    |   ✅    |   ✅    |   ✅    |   ✅    
Aprobar planificacion (flag general)     |   ✅    |   ✅    |   ✅    |   ❌    
Crear planificaciones                    |   ✅    |   ✅    |   ✅    |   ✅    
Editar matrices de planificacion *       |   ✅    |   ✅    |   ✅    |   ✅    
Enviar a revision                        |   ✅    |   ✅    |   ✅    |   ✅    
Volver a borrador                        |   ✅    |   ✅    |   ✅    |   ❌    
Aprobar planificacion (accion real)      |   ✅    |   ✅    |   ✅    |   ❌    
Cerrar planificacion                     |   ✅    |   ✅    |   ✅    |   ❌    
Exportar planificacion                   |   ✅    |   ✅    |   ✅    |   ✅    
Exportar por lote                        |   ✅    |   ✅    |   ✅    |   ❌    

REPORTES
Ver reportes                             |   ✅    |   ✅    |   ❌    |   ❌    
```

\* **Nota de precisión (verificado en código, no en el catálogo):** `puede_editar_planificacion` (flag
general) y `editar_planificacion` (capacidad, matrices) no tienen ningún punto de verificación real en
el backend hoy — se buscó `permisos.puedeEditarPlanificacion` / `capacidades.editarPlanificacion` en todo
`apps/api/src` y el único resultado fuera de tests es donde se persisten al guardar el rol
(`typeorm-rol-seguridad.repository.ts`). Tenerlos en "✅" no habilita ninguna capacidad real hoy porque
nada los consulta para autorizar una acción. ❌ es un riesgo de seguridad, pero el catálogo queda
inconsistente con lo que cada rol hace de verdad — candidato a limpieza ✅ se decide.

## 5. Documentos relacionados

* `docs/database/decisiones-tecnicas.md` sección 132 — auditoría original de permisos de RRHH y
  creación de los usuarios de prueba. Sección 133 — ampliación de permisos de RRHH (2026-07-22).
* `docs/seguridad/mapa-menus-acciones-por-perfil.md` — qué ve cada rol en el menú y las pantallas.
* `docs/seguridad/estrategia-desacople-permisos-y-reglas.md` — diseño general del modelo de permisos.
