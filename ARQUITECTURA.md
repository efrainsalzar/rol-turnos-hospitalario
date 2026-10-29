# Arquitectura y estándares de desarrollo

**Proyecto:** Sistema de Gestión de Roles y Turnos Hospitalarios
**Stack:** NestJS + TypeScript (API) · React + Vite + TypeScript (web) · SQL Server
**Dominio:** planificación de turnos hospitalarios, gestión de personal y trazabilidad operativa

Este documento define los estándares que guían el desarrollo del proyecto: estructura del código,
diseño de módulos, nomenclatura, lógica de negocio, acceso a datos, trazabilidad y validaciones. Las
decisiones concretas que se tomaron aplicando estos estándares están en
[`docs/database/decisiones-tecnicas.md`](docs/database/decisiones-tecnicas.md).

---

## 1. Principios rectores

### 1.1 El dominio manda

Las decisiones técnicas responden a la operación hospitalaria real, no a la conveniencia de una
implementación rápida. La estructura del sistema respeta:

* planificación mensual por servicio o por departamento (alcance dual);
* variabilidad de turnos por servicio o por departamento;
* rotación de personal;
* un turno por día por persona (el backend conserva capacidad estructural para más, sin interfaz);
* separación entre **incidencia de personal** (vacaciones, licencias, francos) y **turno**;
* trazabilidad de cambios.

### 1.2 Modularidad desde el inicio

El sistema es un **monolito modular** con fronteras claras y responsabilidades específicas por módulo.

### 1.3 Escalabilidad sin reescritura

Toda decisión considera el crecimiento en volumen de datos, cantidad de servicios, tipos de turno,
reglas horarias, auditoría e integración con otros sistemas.

### 1.4 Consistencia antes que rapidez

No se introducen atajos que comprometan la integridad relacional, la claridad semántica, la
mantenibilidad o la auditabilidad.

### 1.5 Trazabilidad obligatoria

No basta con guardar datos: debe poder saberse **quién** hizo el cambio, **cuándo**, **qué** cambió y
**por qué**.

---

## 2. Estilo de arquitectura

### 2.1 Capas por módulo

```text
apps/api/src/
  modules/
    planificacion/
      domain/
        entities/
        repositories/
        rules/
      application/
        use-cases/
        dto/
        mappers/
      infrastructure/
        persistence/
        adapters/
      presentation/
        controllers/
      planificacion.module.ts
```

### 2.2 Regla de dependencia

* `presentation` depende de `application`;
* `application` depende de `domain`;
* `infrastructure` implementa contratos definidos por las capas internas;
* `domain` no depende de NestJS ni del ORM.

### 2.3 Por qué monolito modular

* el dominio todavía se estaba estabilizando;
* hay alta relación transaccional entre módulos;
* el costo de coordinación distribuida no se justifica en esta etapa.

### 2.4 Casos de uso explícitos

La lógica se organiza por casos de uso, no en servicios genéricos con decenas de métodos.

Ejemplos: `CrearBorradorPlanificacionUseCase`, `AplicarCeldaMatrizPlanificacionUseCase`,
`CerrarPlanificacionUseCase`, `MoverAsignacionUseCase`.

### 2.5 Estructura del repositorio

```text
apps/
  api/        backend NestJS
  web/        frontend React
database/     migraciones, seeds y consultas de integración
docs/         documentación técnica
```

* La raíz orquesta scripts generales (`dev:api`, `dev:web`, `build`, `migrate:api`, …).
* `apps/api` y `apps/web` pueden ejecutarse de forma independiente.
* No se mezcla código frontend dentro de `apps/api`.

---

## 3. Módulos del sistema

| Módulo | Responsabilidades |
|---|---|
| **Organización** | Departamentos, servicios/unidades, estructura organizativa |
| **Personal** | Personal, cargos, contratos, carga horaria, asignaciones e historial de asignación |
| **Seguridad** | Usuarios, roles de seguridad, autenticación, autorización por capacidades y alcance |
| **Operación** | Turnos e incidencias de personal por servicio o departamento, configuración operativa |
| **Planificación** | Planificación mensual, matriz de turnos, estados, edición exclusiva, cierre e historial, observaciones mensuales, calendario y feriados, exportación del rol a Excel/PDF |
| **Integración** | Sincronización de personal desde sistemas externos (puertos y adaptadores) |

---

## 4. Nomenclatura

### 4.1 Idioma del dominio

El lenguaje del dominio se mantiene en **español**: el contexto institucional y los usuarios trabajan
con esos conceptos, y así se reduce la ambigüedad con documentos y reglas reales. En el código se usa
español sin tildes ni caracteres especiales (`Planificacion`, `AsignacionPersonal`,
`IncidenciaPersonal`).

### 4.2 Convenciones

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos | `kebab-case` | `crear-planificacion-mensual.use-case.ts` |
| Clases | `PascalCase` | `AplicarCeldaMatrizPlanificacionUseCase` |
| Variables y propiedades | `camelCase` | `fechaInicio`, `idAsignacionPersonal` |
| Interfaces | nombre explícito, sin prefijo `I` | `PlanificacionRepository` |
| Enums | `PascalCase`, valores `UPPER_SNAKE_CASE` | `EstadoPlanificacion.BORRADOR` |
| Tablas y columnas | `snake_case`, singular | `asignacion_personal`, `fecha_inicio` |
| Claves | `id`, `id_<entidad>` | `id_servicio`, `id_planificacion` |

---

## 5. Lógica de negocio

* **Los controladores no contienen lógica:** reciben la request, validan el DTO, invocan el caso de uso
  y devuelven la respuesta.
* **La lógica no depende del ORM:** las reglas se entienden sin leer decorators de persistencia.
* **Casos de uso pequeños:** una intención clara, entradas definidas y una única responsabilidad.
* **Reglas críticas centralizadas:** superposición de asignaciones, transiciones de estado y políticas
  de acceso viven en componentes reutilizables (`*-access-policy.service.ts`, `*-business-rules.ts`).
* **Estados controlados:** `BORRADOR → REVISION → APROBADA → CERRADA`, cada transición exige la
  capacidad correspondiente del rol de seguridad.

---

## 6. Base de datos

* Modelo al menos en **tercera forma normal**, salvo justificación técnica fuerte.
* Integridad respaldada por `FOREIGN KEY`, `UNIQUE`, `CHECK` e índices.
* Tablas transaccionales con `created_at`, `updated_at`, `created_by` y `updated_by`; tablas históricas
  y motivo del cambio cuando el dominio lo requiere.
* **No se guardan datos derivados como fuente primaria** (por ejemplo, el total mensual de horas se
  deriva de `rol_turno`). Los snapshots, como el historial de planificaciones cerradas, se declaran
  como tales.
* **Soft delete:** la información con impacto histórico se desactiva (`activo`, vigencias), no se borra.
* **Migraciones versionadas:** todo cambio estructural pasa por `database/migrations`. Ningún cambio
  manual fuera del control del proyecto.
* **Motor:** SQL Server 2022, con un perfil de compatibilidad `mssql-2008r2` para instalaciones
  antiguas. Toda migración y consulta nueva debe correr en ambos.

---

## 7. Persistencia

* Los **repositorios expresan intención de negocio**
  (`existePlanificacionAbiertaParaAsignacion()`, `listarAsignacionesDisponiblesPorDepartamento()`),
  no CRUD genérico (`findAll()`).
* Los contratos viven en `domain/repositories`; `infrastructure` los implementa.
* **Transacciones** cuando una operación afecta varias entidades (publicar, cerrar, mover una
  asignación).
* **Carga eficiente:** se evitan patrones `N+1`; las consultas se diseñan para la matriz mensual y el
  resumen de horas por persona.
* **ORM como infraestructura:** las entidades ORM no son entidades de dominio ni se exponen en
  controladores. `synchronize = false`, y las migraciones SQL son la fuente de verdad del esquema.
  Estrategia híbrida: ORM para persistencia simple y SQL directo para consultas complejas.

---

## 8. API

* Endpoints orientados a recursos y casos de uso: `POST /v1/planificaciones`,
  `POST /v1/planificaciones/:id/cerrar`.
* Versionado desde el inicio con prefijo `/v1`.
* Parámetros públicos de query y path en `snake_case`.
* **DTOs obligatorios** para toda entrada y salida pública, con validación explícita (`class-validator`)
  de formatos, enums, rangos y coherencia semántica.
* **Respuestas consistentes:** formato uniforme para éxito, errores de validación, errores de negocio
  y errores no controlados. Los listados usan `data` + `meta.total`.
* Documentación de endpoints en [`docs/api/`](docs/api/).

---

## 9. Errores

Se separan los **errores de negocio** (turno no válido para el servicio, planificación ya cerrada,
conflicto de asignación) de los **errores técnicos** (fallo de conexión, timeout). Los mensajes son
claros para el usuario, y el contexto técnico va a los logs.

---

## 10. Seguridad

* Toda acción sensible verifica permisos (aprobar o cerrar planificación, modificar turnos, gestionar
  asignaciones).
* **RBAC con alcance:** cada rol tiene capacidades explícitas y un alcance (servicio, departamento o
  sistema) que acota tanto las acciones como los listados.
* **Mínimo privilegio.**
* Nunca se exponen `password_hash`, secretos ni tokens. Sesión con JWT validado contra la base en cada
  request, rate limiting en login y bcrypt para contraseñas.

---

## 11. Calidad

* Todo cambio en TypeScript debe pasar ESLint y Prettier.
* Pruebas priorizadas por riesgo: unitarias de reglas de negocio, integración de repositorios y casos
  de uso, y e2e para flujos críticos (creación, asignación, aprobación y cierre de planificación).
* Un cambio de esquema, contrato o mecanismo no está completo si deja documentación, tests o seeds
  apuntando a algo que ya no existe.
* Los seeds de desarrollo son idempotentes y están separados de las migraciones.

---

## 12. Comentarios en el código

Los comentarios explican **por qué**: una regla no evidente, una decisión técnica no obvia, una
restricción de compatibilidad o un riesgo que se evita. No repiten lo que el código ya dice ni
justifican código confuso que debería refactorizarse. Se escriben en español claro y breve.

---

## 13. Frontend

* Vive exclusivamente en `apps/web`, en TypeScript.
* Base visual adaptada de la plantilla **Mantis Free** (MIT, CodedThemes): se reescribe y se integra a
  los módulos reales, sin arrastrar demos ni componentes muertos.
* Cliente HTTP centralizado; no se dispersan `fetch` ni URLs hardcodeadas.
* La UI resuelve carga, vacíos, errores de presentación y filtros de visualización. **No resuelve reglas
  críticas del dominio**: esas viven en el backend.
* Variables de entorno propias con prefijo `VITE_`.

---

## 14. Antipatrones que se evitan

* lógica de negocio en controladores;
* entidades ORM como contratos de API;
* servicios gigantes con responsabilidades difusas;
* reglas de negocio duplicadas en varios módulos;
* datos derivados como fuente primaria;
* romper la trazabilidad para "simplificar";
* modelar estados no laborales como si fueran turnos;
* acoplar el dominio a decisiones temporales del frontend.
