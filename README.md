# Sistema de Gestión de Roles y Turnos Hospitalarios

Aplicación web para **planificar el rol mensual de turnos del personal hospitalario** por servicio o por
departamento: armar la matriz del mes, pasarla por un flujo de revisión y aprobación, cerrarla con un
historial inmutable y exportarla en el formato institucional (Excel/PDF).

Nació para reemplazar planillas Excel que cada jefatura llenaba a mano. El sistema busca mantener la
misma forma de trabajo (una grilla persona × día), pero con reglas de negocio, control de acceso por
rol y trazabilidad de cada cambio.

> Todos los datos de este repositorio (personas, servicios, organigramas) son **ficticios**.

<!-- Capturas: agregar las imágenes en docs/capturas/ y descomentar.
![Matriz mensual de planificación](docs/capturas/matriz-mensual.png)
![Bandeja de planificaciones](docs/capturas/planificaciones.png)
-->

## Funcionalidades principales

- **Matriz mensual editable** tipo hoja de cálculo: se "pinta" turnos e incidencias arrastrando sobre
  las celdas, con guardado por lotes, encabezado fijo y columnas que se pueden ocultar.
- **Flujo de estados** `BORRADOR → REVISION → APROBADA → CERRADA`, donde cada transición exige la
  capacidad correspondiente del rol.
- **Edición exclusiva:** una sola persona edita una planificación a la vez, y un rango igual o
  superior puede tomar el control con confirmación.
- **Alcance dual:** planificaciones, turnos y configuración operativa por **servicio** o por
  **departamento**.
- **Traslados a mitad de mes** con vista **original** y **efectiva**; al cerrar se congelan ambas en
  un historial inmutable.
- **Gestión de personal y asignaciones:** asignación principal y secundaria, jefaturas, carga horaria,
  traslados con motivo obligatorio e historial auditable.
- **RBAC con alcance:** administrador, RRHH, jefe de departamento y jefe de servicio, cada uno con
  capacidades explícitas y visibilidad acotada a su unidad.
- **Exportación** del rol mensual a Excel (varios formatos y plantillas por año), vista previa HTML y
  reporte individual por persona en PDF.
- **Calendario operativo** con feriados por rango de fechas.
- **Integración** de personal desde un sistema de RRHH externo, con validación en staging antes de
  aplicar.

## Stack

| Capa | Tecnologías |
|---|---|
| Backend | NestJS 11, TypeScript, TypeORM (solo en infraestructura), `mssql`, JWT, bcrypt, class-validator, ExcelJS |
| Frontend | React 19, Vite, TypeScript, MUI 7, React Router 7, SWR |
| Base de datos | SQL Server 2022 (con un perfil de compatibilidad para SQL Server 2008 R2), migraciones SQL versionadas |
| Calidad | ESLint, Prettier, Jest, Supertest |

## Arquitectura

**Monolito modular** con capas por módulo y dependencias de afuera hacia adentro:

```text
presentation  →  application  →  domain  ←  infrastructure
(controllers)    (casos de uso)  (entidades,   (TypeORM, SQL, adaptadores
                                  reglas,       que implementan los
                                  contratos)    contratos del dominio)
```

- El dominio no depende de NestJS, del ORM ni del motor de base de datos.
- La lógica se organiza en **casos de uso explícitos** (`AplicarCeldaMatrizPlanificacionUseCase`,
  `CerrarPlanificacionUseCase`, `MoverAsignacionUseCase`, …), no en servicios genéricos.
- El esquema vive en **migraciones SQL versionadas**: `synchronize = false` y el ORM no decide el
  modelo.
- La integración con sistemas externos usa **puertos y adaptadores**, con una capa anti-corrupción.

Módulos: `organizacion`, `personal`, `seguridad`, `operacion`, `planificacion` e `integracion`.

Para más detalle:

- [`ARQUITECTURA.md`](ARQUITECTURA.md): estándares de diseño, nomenclatura, persistencia, API y
  seguridad.
- [`docs/database/decisiones-tecnicas.md`](docs/database/decisiones-tecnicas.md): decisiones clave y
  sus alternativas (JWT híbrido, edición exclusiva, historial inmutable, backpressure en la matriz…).

## Estructura del repositorio

```text
apps/
  api/          backend NestJS (src/modules/<modulo>/{domain,application,infrastructure,presentation})
  web/          frontend React + Vite
database/
  migrations/   esquema versionado (única fuente de verdad)
  seeds/        datos ficticios de demo e institución de ejemplo
  integracion/  consultas de solo lectura sobre fuentes externas
docs/           documentación técnica (API, modelo de datos, seguridad, exportación, rendimiento)
scripts/        utilidades de entorno (PowerShell)
```

## Ejecutar en local

### Requisitos

- Node.js 20 o superior
- SQL Server 2022 (la edición Express sirve), con autenticación SQL habilitada
- Windows para los scripts de perfil (`npm run env:*`, en PowerShell)

### Pasos

```powershell
git clone <url-del-repositorio>
cd rol-turnos-hospitalario
npm install
npm --prefix apps/web install

# 1. configurar el perfil demo de la API
copy apps\api\.env.demo.example apps\api\.env.demo   # completar DB_USER, DB_PASSWORD y JWT_SECRET
npm run env:demo

# 2. crear la base demo (una sola vez)
sqlcmd -S localhost\SQLEXPRESS -U <usuario> -P <contrasena> -C -i .\database\scripts\create-database-demo.sql

# 3. esquema y datos ficticios
npm run migrate:api
npm run seed:demo

# 4. configurar el frontend y levantar todo
copy apps\web\.env.example apps\web\.env
npm run doctor        # diagnostica el entorno y dice qué falta
npm run dev           # API en http://localhost:3000, web en http://localhost:3001
```

Guía completa: [`docs/deployment/guia-instalacion.md`](docs/deployment/guia-instalacion.md).

### Usuarios de demostración

Todos con la contraseña `Demo1234!`:

| Usuario | Rol | Qué muestra |
|---|---|---|
| `admin.demo` | Administrador del sistema | Vista global de todos los departamentos y servicios |
| `rrhh.demo` | RRHH | Gestión de personal y asignaciones |
| `jefe.departamento.demo` | Jefe de departamento | Alcance del departamento completo, revisión y aprobación |
| `jefe.servicio.demo` | Jefe de servicio | Su servicio, con la planificación del mes ya cargada |

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | API + web en modo desarrollo |
| `npm run doctor` | Diagnóstico de entorno (dependencias, conexión, migraciones, puertos) |
| `npm run migrate:api` | Aplica las migraciones pendientes |
| `npm run reset:db` | Recrea la base (solo en bases marcadas como reseteables) |
| `npm run seed:demo` | Carga los datos ficticios de demo (idempotente) |
| `npm run build` | Build de API y web |
| `npm run lint` / `npm run typecheck:api` | Calidad de código |
| `npm test` / `npm run test:e2e` | Pruebas unitarias / end-to-end |

Referencia completa: [`docs/comandos.md`](docs/comandos.md).

## Documentación

| Tema | Documento |
|---|---|
| API | [`docs/api/README.md`](docs/api/README.md) |
| Modelo de datos | [`docs/database/modelo-relacional-rol-turnos.md`](docs/database/modelo-relacional-rol-turnos.md) |
| Permisos por rol | [`docs/seguridad/matriz-permisos-roles.md`](docs/seguridad/matriz-permisos-roles.md) |
| Exportación | [`docs/exportacion/modos-exportacion-rol-turnos.md`](docs/exportacion/modos-exportacion-rol-turnos.md) |
| Rendimiento de la matriz | [`docs/rendimiento/analisis-lentitud-matriz-mensual.md`](docs/rendimiento/analisis-lentitud-matriz-mensual.md) |
| Perfiles de entorno | [`docs/deployment/guia-perfiles-entorno.md`](docs/deployment/guia-perfiles-entorno.md) |
| Seeds y datos de demo | [`database/seeds/README.md`](database/seeds/README.md) |

## Licencia

Código publicado con fines de demostración y portafolio. **Todos los derechos reservados**: ver
[`LICENSE`](LICENSE). La base visual del frontend está adaptada de
[Mantis Free](https://github.com/codedthemes/mantis-free-react-admin-template) (MIT, ver
[`apps/web/LICENSE`](apps/web/LICENSE)).
