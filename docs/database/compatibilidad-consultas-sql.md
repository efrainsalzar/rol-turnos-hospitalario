# Compatibilidad de consultas por perfil de base de datos

## Objetivo

Mantener el comportamiento actual de SQL Server moderno y agregar un perfil
compatible con SQL Server 2008 R2 sin mezclar reglas de una versión dentro de
los casos de uso.

## Perfiles

```text
mssql-modern  -> SQL Server 2012+ / actual. Perfil predeterminado.
mssql-2008r2  -> SQL Server 2008 R2, compatibilidad 100.
```

Configuración:

```env
DB_DIALECT=mssql
DB_PROFILE=mssql-modern
DB_COMPATIBILITY_LEVEL=160
```

Para la instancia de prueba SQL Server 2008 R2:

```env
DB_DIALECT=mssql
DB_PROFILE=mssql-2008r2
DB_COMPATIBILITY_LEVEL=100
DB_HOST=localhost
DB_INSTANCE=
DB_PORT=1435
```

El perfil se resuelve una sola vez al crear la configuración de la base. La
lógica de negocio no debe consultar la versión del servidor en cada petición.

## Inventario inicial

La revisión del código encontró tres listados paginados que usaban
`.offset().limit()` de TypeORM:

- `typeorm-personal.repository.ts`: listado de personal.
- `typeorm-personal.repository.ts`: listado de asignaciones.
- `typeorm-planificacion.repository.ts`: listado de planificaciones.

TypeORM traduce esas llamadas a `OFFSET ... FETCH`, que no existe en SQL
Server 2008 R2.

También se encontraron usos de `MERGE` en seeds y repositorios. `MERGE` existe
en SQL Server 2008 R2 y se mantiene por ahora; debe seguir probándose por su
comportamiento bajo concurrencia.

## Estrategia de paginación

El helper
`apps/api/src/infrastructure/persistence/query/paginated-raw-query.ts`
selecciona la estrategia según el perfil:

- `mssql-modern`: mantiene `OFFSET/FETCH` generado por TypeORM.
- `mssql-2008r2`: envuelve la consulta base y usa `ROW_NUMBER()`.

La consulta debe tener un orden estable y proyectar los alias usados por la
ventana de paginación. No se debe usar paginación en memoria para datos reales.

## Recuperación de una sola fila

TypeORM 0.3.x implementa `repository.findOne(...)` agregando internamente
`OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY`. Esa traducción también ocurre aunque el
código de la aplicación no llame explícitamente a `skip`, `take`, `offset` o
`limit`. SQL Server 2008 R2 rechaza `FETCH NEXT`.

Por este motivo, los repositorios que necesitan recuperar una fila por una clave
única usan ahora `QueryBuilder.where(...).getOne()`:

- `typeorm-departamento.repository.ts`;
- `typeorm-rol-seguridad.repository.ts`;
- `typeorm-incidencia-personal.repository.ts`;
- `typeorm-tipo-feriado.repository.ts`.

El `WHERE` utiliza una clave primaria o un código único, por lo que no se
necesita limitar artificialmente la consulta. `getOne()` devuelve la primera
entidad recibida sin que TypeORM agregue `FETCH NEXT`.

Regla para nuevas consultas:

```text
SQL Server 2008 R2:
  evitar repository.findOne(...)
  usar QueryBuilder + WHERE por clave única + getOne()

SQL Server moderno:
  la misma pauta se conserva para que el código sea portable
```

## Sintaxis no permitida en el perfil 2008 R2

```text
CREATE OR ALTER
DROP TABLE IF EXISTS
STRING_AGG
STRING_SPLIT
OFFSET/FETCH
AT TIME ZONE
FOR JSON
OPENJSON
THROW
```

Alternativas:

```text
IF OBJECT_ID / COL_LENGTH
ROW_NUMBER()
FOR XML PATH('')
GETDATE() / GETUTCDATE()
RAISERROR
```

## Reglas de implementación

1. Mantener las interfaces de repositorio y casos de uso compartidas.
2. Separar únicamente SQL que tenga diferencias reales entre perfiles.
3. Mantener los parámetros fuera de la concatenación SQL.
4. Usar alias deterministas en consultas paginadas.
5. No modificar migraciones ya aplicadas.
6. Agregar nuevas migraciones con versión posterior.
7. Probar el mismo caso de uso en SQL Server moderno y 2008 R2.

## Validación

```powershell
npm run build:api
npm test
npm run doctor
```

Para validar la base de prueba después de cargar los catálogos base y el usuario `admin.sistema`:

```powershell
npm run env:preparacion
npm run seed:system
npm run doctor
npm run dev
```

Las pruebas E2E deben ejecutarse sobre una base descartable o respaldada,
porque modifican datos.

## Registro de ejecución — fases 1 a 7

Fecha de validación: 2026-10-16.

| Fase                           | Resultado                         | Evidencia                                                                                                    |
| ------------------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1. Inventario de SQL           | Completada                        | Se identificaron consultas paginadas y sintaxis sensible a versión.                                          |
| 2. Perfil de ejecución         | Completada                        | `mssql-modern` y `mssql-2008r2`; el entorno de prueba usa compatibilidad 100.                                |
| 3. Separación de configuración | Completada                        | `database-profile.ts`, `.env.example` y perfil local SQL2008R2.                                              |
| 4. Migraciones/semillas        | Completada para la base de prueba | No se modificaron migraciones aplicadas ni la base oficial.                                                  |
| 5. Adaptador de consultas      | Completada                        | Helper con `OFFSET/FETCH` moderno y `ROW_NUMBER()` para 2008 R2.                                             |
| 6. Repositorios                | Completada                        | Personal, asignaciones y planificaciones usan el helper por perfil.                                          |
| 7. Validación                  | Completada con observaciones      | Build y doctor pasan; la suite tiene 426 pruebas aprobadas y 12 fallos preexistentes fuera de estos cambios. |

Validaciones ejecutadas:

```text
npm run build:api                 PASS
npm test -- --runInBand           86 suites pass, 2 suites fallan
npm test -- --runInBand apps/api/src/infrastructure/config/database-env.spec.ts
                                  PASS (3 tests)
npm run doctor                    PASS funcional
```

El doctor confirmó:

```text
localhost:1435/roles_turnos_2008r2_prueba
perfil mssql-2008r2
compatibilidad 100
8 migraciones aplicadas
5 roles de seguridad
```

Los 12 fallos de la suite completa pertenecen a pruebas existentes de reglas de
planificación: cuatro dependen del periodo visible relativo a la fecha actual y
ocho tienen mocks incompletos para `planificacion.estado`. No se originan en la
separación de dialectos y deben tratarse en una tarea independiente. El único
aviso operativo del doctor es que el puerto 3000 ya está ocupado, posiblemente
por una API que ya está corriendo.

### Criterio para avanzar

No se debe conectar todavía la aplicación a la base oficial. Antes de hacerlo,
hay que ejecutar pruebas funcionales sobre la base de prueba 2008 R2, revisar
los listados paginados y confirmar que no aparezca `OFFSET`, `STRING_AGG`, JSON
moderno ni otra sintaxis fuera del perfil. Después se repite el mismo conjunto
contra SQL Server moderno y se comparan resultados, cantidades y ordenamiento.
