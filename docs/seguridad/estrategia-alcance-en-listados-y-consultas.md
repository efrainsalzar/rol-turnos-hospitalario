# Estrategia: alcance organizacional empujado a la consulta (no filtrado después)

**Fecha:** 2026-07-07
**Origen:** el usuario notó que un `JEFE_SERVICIO` veía opciones de filtro fuera de su alcance
(ej. "JEFE_DEPARTAMENTO" como opción de cargo/rol en la pantalla de Personal) y preguntó si el
patrón de carga de datos por rol era el adecuado, o si se estaba trayendo más de lo necesario desde
la base de datos para luego recortarlo en código.
**Estado:** estrategia y plan de trabajo documentados; implementación en curso, pantalla por
pantalla, con pruebas manuales del usuario entre cada paso (tiene 3 usuarios reales: `JEFE_SERVICIO`,
`JEFE_DEPARTAMENTO`, `ADMIN_SISTEMA`).
**Complementa:** `docs/seguridad/estrategia-desacople-permisos-y-reglas.md` (define el "Policy
Pattern" en términos generales); este documento corrige y precisa **dónde** debe aplicarse ese
patrón para que sea escalable.

---

## 1. El problema encontrado

Auditoría completa (ver también `project-filtros-por-alcance-rol` en la memoria de sesiones): varios
listados del backend traen **todos** los registros de la tabla, sin ninguna restricción de alcance en
el `WHERE`, y recién filtran el resultado ya traído usando JavaScript, en el controlador:

| Endpoint | Dónde ocurre | Consecuencia |
|---|---|---|
| `GET /v1/departamentos` | `DepartamentoController.listar()` → `scopeDepartamentos()` | trae todos los departamentos, filtra en memoria |
| `GET /v1/servicios` | `ServicioController.listar()` → `scopeServicios()` | trae todos los servicios, filtra en memoria |
| `GET /v1/planificaciones` | `PlanificacionController.listar()` → `PlanificacionAccessPolicyService.filtrarPlanificaciones()` | trae **todas** las planificaciones del sistema y **desactiva la paginación del servidor** para poder filtrar y re-paginar en memoria |

Para catálogos chicos (`departamento`, `servicio`) el costo real de esto es bajo hoy — son tablas de
pocas decenas de filas. Para `planificacion` (una fila por servicio/departamento × mes × versión,
acumulando años) el mismo patrón sí degrada con el tiempo, y ya hoy obliga a desactivar la
paginación del servidor para cualquier actor que no sea `ADMIN_SISTEMA`.

## 2. El patrón que ya funciona bien (modelo a replicar)

El módulo de **Personal** ya resuelve esto correctamente:
`PersonalAccessPolicyService.scopeQuery(actor, query)`
(`apps/api/src/modules/personal/application/use-cases/helpers/personal-access-policy.service.ts`)
recibe el query original **antes** de que llegue al caso de uso, y lo ajusta según el alcance real
del actor (`actor.departamentosGestionables` / `actor.serviciosGestionables`, que ya están
correctamente resueltos con un `WHERE asignacion.id_personal = :idPersonal` desde el login — ver
`typeorm-usuario.repository.ts`). El repositorio nunca ve una consulta sin acotar: arma su `WHERE`
directamente con lo que ya viene filtrado.

## 3. Receta generalizada a aplicar

No hace falta recalcular nada nuevo — los datos para acotar ya existen en la sesión
(`serviciosGestionables`/`departamentosGestionables`), correctamente resueltos con SQL. Lo único que
cambia es **en qué momento se usan**:

1. El caso de uso (`ListarXUseCase`) acepta un parámetro opcional de alcance (ej. `idsPermitidos?:
   number[]`, o para el caso de Personal, coerción de un id único — ver la variante ya existente).
2. El controlador, **antes** de invocar el caso de uso, calcula ese alcance a partir de
   `actor.departamentosGestionables`/`serviciosGestionables` — si el actor tiene alcance de sistema
   (`hasSystemScope`), no se pasa restricción (se sigue trayendo todo, igual que hoy para ese caso).
3. El repositorio agrega un `WHERE id IN (:...ids)` (o la condición equivalente) solo cuando el
   alcance viene informado.

Esta receta es agnóstica de la tabla — cualquier listado nuevo que dependa de servicio/departamento
(reportes futuros, catálogos nuevos, lo que sea) la puede reusar tal cual, sin inventar un mecanismo
nuevo por pantalla.

## 4. Plan de trabajo (pantalla por pantalla, con pruebas del usuario entre cada paso)

Se avanza de a una pantalla por vez — el usuario prueba en vivo con sus 3 usuarios reales
(`JEFE_SERVICIO`, `JEFE_DEPARTAMENTO`, `ADMIN_SISTEMA`) antes de pasar a la siguiente. Verificación
mínima esperada por pantalla: `ADMIN_SISTEMA` ve todo (sin cambios); `JEFE_DEPARTAMENTO` ve solo su(s)
departamento(s) y los servicios dentro de ellos; `JEFE_SERVICIO` ve solo su propio servicio.

1. **Departamento** (`GET /v1/departamentos`) — en curso.
2. **Servicio** (`GET /v1/servicios`) — mismo patrón que Departamento, pendiente.
3. **Personal** — ya resuelto correctamente (`PersonalAccessPolicyService.scopeQuery`); este paso es
   solo de verificación en vivo, sin cambios de código esperados.
4. **Planificaciones** — el de mayor prioridad real (única tabla que crece sin límite natural).
   Requiere además reactivar la paginación del servidor para actores no-sistema una vez que el
   filtro se resuelva en SQL. Se deja para el final, después de validar el patrón en los pasos 1-3.

## 5. Fuera de alcance de este plan (decisión ya tomada, no revisar de nuevo)

Los catálogos `niveles-cargo` y `roles-funcionales` (`CatalogoPersonalController`) no tienen guard de
actor ni restricción por alcance — son catálogos globales por diseño, y la responsabilidad de filtrar
opciones de UI queda del lado del frontend (ver el bug ya corregido en `personal/index.tsx`,
documentado en la memoria de sesión `project-filtros-por-alcance-rol`). No se considera parte de esta
estrategia salvo que aparezca un caso concreto que lo justifique.
