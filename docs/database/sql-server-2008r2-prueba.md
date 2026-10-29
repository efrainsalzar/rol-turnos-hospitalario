# Migración de la base propia a SQL Server 2008 R2

Esta guía prepara la base propia del sistema. No modifica la base oficial de
personal y no debe utilizarse para ejecutar `reset`, `seed` ni migraciones
sobre esa base oficial.

## 1. Crear la base vacía

Conectarse a `localhost\\SQL2008R2` usando SSMS, autenticación SQL Server, y
ejecutar en `master`:

```sql
IF DB_ID(N'planificacion_turnos_preparacion') IS NULL
BEGIN
    CREATE DATABASE [planificacion_turnos_preparacion]
        COLLATE Latin1_General_100_CI_AS;
END;
GO

ALTER DATABASE [planificacion_turnos_preparacion]
    SET COMPATIBILITY_LEVEL = 100;
GO
```

Verificar:

```sql
SELECT name, state_desc, compatibility_level, collation_name
FROM sys.databases
WHERE name = N'planificacion_turnos_preparacion';
```

## 2. Preparar las variables locales

Copiar:

```text
apps/api/.env.preparacion.example
```

como:

```text
apps/api/.env.preparacion
```

Completar únicamente en la copia local:

```env
DB_PASSWORD=la_contraseña_local
```

La copia local no debe versionarse.

La carga de configuración aplica esta prioridad:

1. Variables definidas externamente por el proceso.
2. El archivo indicado mediante `API_ENV_FILE` (variable del proceso), si existe.
3. El perfil activo: `apps/api/.env.preparacion` después de `npm run env:preparacion`
   (lo registra `apps/api/.env.active`; ya no se copia sobre `apps/api/.env`).
4. `apps/api/.env`, solo cuando no hay perfil activo (servidor real).

Ver `docs/deployment/guia-perfiles-entorno.md`.

## 3. Activar el perfil

Desde la raíz del repositorio:

```powershell
npm run env:preparacion
```

El script copia `.env.preparacion` a `apps/api/.env`.

## 4. Ejecutar las migraciones propias

Después de verificar la base y el archivo `.env`:

```powershell
npm run migrate:api
```

Este comando crea únicamente el esquema propio del sistema en
`planificacion_turnos_preparacion`.

## 5. Verificar el resultado

```sql
USE [planificacion_turnos_preparacion];
GO

SELECT version, nombre, estado, aplicado_at
FROM dbo.schema_migration
ORDER BY version;
GO

SELECT TABLE_SCHEMA, TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
```

Todas las migraciones deben tener estado `APLICADO`.

## 6. Diagnóstico validado de la conexión

La instancia de prueba quedó validada con esta configuración:

```text
Servidor: localhost
Instancia: SQL2008R2
Puerto TCP: 1435
Base propia: planificacion_turnos_preparacion
Usuario: sa
Transporte: TCP
```

El puerto `1433` corresponde a la instancia SQL Server Express 2022 y no debe
usarse para este perfil. El puerto UDP `1434` corresponde a SQL Server Browser;
no es el puerto TCP de la base.

La conexión se debe configurar por puerto explícito:

```env
DB_HOST=localhost
DB_INSTANCE=
DB_PORT=1435
DB_NAME=planificacion_turnos_preparacion
```

### Problema encontrado y solución

Inicialmente el proyecto intentaba resolver `localhost\\SQL2008R2` mediante
SQL Server Browser. Después se configuró el puerto `1435`, pero el doctor
seguía mostrando `Login failed for user 'sa'`.

La causa real era que la base configurada todavía no existía. SQL Server y el
driver Tedious exponían ese caso como un error de login. Se comprobó que las
credenciales eran válidas conectando primero contra `master` por TCP.

El doctor fue ajustado para conectarse primero a `master`, comprobar que la
base exista y mostrar un mensaje específico cuando falte. Por eso, ante una
base nueva, el resultado esperado antes de migrar es:

```text
Conexion a la base configurada: correcta
Esquema migrado: 0 migraciones aplicadas
```

El aviso de catálogos sin roles también es normal antes de ejecutar un seed.

### Orden reproducible

```powershell
npm run env:preparacion
npm run doctor
npm run migrate:api
npm run doctor
```

El primer `doctor` confirma la conectividad y reporta que el esquema aún está
vacío. Después de `migrate:api`, el segundo `doctor` debe mostrar migraciones
aplicadas. Los seeds se ejecutan únicamente después de confirmar que la base
propia ya está migrada.

## Orden y límites

Primero debe migrarse la base propia vacía. La base oficial de personal no se
incluye en este paso. La sincronización del personal se implementará después,
con una conexión o credencial de solo lectura y un proceso separado.

No ejecutar en la base oficial:

- `npm run reset:db`
- `npm run seed:demo`
- seeds del proyecto
- migraciones del esquema propio
