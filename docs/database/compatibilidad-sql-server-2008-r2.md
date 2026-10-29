# Compatibilidad SQL Server 2008 R2

> **[SUPERADO 2026-07-08]** Este documento ya no refleja el objetivo de produccion vigente. El proyecto
> abandono la compatibilidad con SQL Server 2008 R2 SP3; el motor oficial pasa a ser SQL Server 2022
> (la misma version usada en desarrollo). Ver `docs/database/decisiones-tecnicas.md` seccion 36 para el
> detalle de la decision y por que importaba. El contenido de abajo se conserva solo como contexto
> historico de por que ciertas migraciones tempranas evitan sintaxis moderna — no es una regla vigente
> para trabajo nuevo.

## Regla principal

Todo script de `database/migrations` debe ejecutarse correctamente sobre SQL Server 2008 R2 SP3.

## SQL Server 2022 local

SQL Server 2022 local se usa solo como entorno de prueba. El hecho de que un script funcione ahi no es criterio suficiente de aceptacion.

Siempre debe asumirse que:

* el parser valido es el de SQL Server 2008 R2
* las restricciones del motor productivo mandan
* cualquier mejora moderna solo puede considerarse si existe alternativa equivalente compatible

## Sintaxis y features prohibidos

No usar en migraciones:

* `CREATE OR ALTER`
* `DROP IF EXISTS`
* `OFFSET ... FETCH`
* `SEQUENCE`
* `STRING_AGG`
* `CONCAT`
* `FORMAT`
* `TRY_CAST`
* `TRY_CONVERT`
* `EOMONTH`
* `IIF`
* `THROW`
* funciones y tipos introducidos despues de SQL Server 2008 R2

## Patrones permitidos

Usar:

* `IF OBJECT_ID(...) IS NOT NULL`
* `RAISERROR`
* `BEGIN TRY / BEGIN CATCH`
* `GETDATE()` o `GETUTCDATE()`
* `BIGINT IDENTITY(1,1)`
* `DATETIME`
* `BIT`
* `VARCHAR` y `NVARCHAR`

## Decisiones especificas de esta linea base

* No se usa `TIMESTAMP` por incompatibilidad semantica con fechas reales.
* Las horas operativas de `turno` se almacenan como `CHAR(5)` para mantener un contrato simple y portable.
* Las descripciones de texto se limitan a longitudes fijas razonables con `NVARCHAR`, evitando `TEXT`.
* Las migraciones usan transacciones explicitas y fallan rapido si detectan estado inesperado.

## Restricciones que no se fuerzan en SQL puro portable

Algunas reglas del modelo no deben forzarse con SQL especifico del motor en esta fase:

* exclusiones temporales avanzadas
* indices filtrados para reglas funcionales de jefatura
* validaciones cruzadas entre varias tablas
* logica de negocio en triggers

Estas reglas deben resolverse en backend y, si alguna necesita apoyo adicional de base, debe documentarse primero en `decisiones-tecnicas.md`.
