:setvar DatabaseName "roles_turnos_demo"
:on error exit

IF DB_ID(N'$(DatabaseName)') IS NULL
BEGIN
    RAISERROR('La base de datos $(DatabaseName) no existe.', 16, 1)
END
GO

USE [$(DatabaseName)]
GO

SET NOCOUNT ON

DECLARE @failure_count INT
DECLARE @expected_domain_table_count INT
DECLARE @expected_total_table_count INT
DECLARE @actual_total_table_count INT

SET @failure_count = 0
SET @expected_domain_table_count = 25
SET @expected_total_table_count = 26

PRINT 'Validacion de esquema iniciada.'
PRINT 'Nota: la especificacion menciona 24 tablas, pero el listado funcional entregado contiene 25 tablas de negocio. Esta validacion usa el listado explicito y ademas valida dbo.schema_migration.'

CREATE TABLE #expected_tables
(
    nombre SYSNAME NOT NULL
)

INSERT INTO #expected_tables (nombre) VALUES ('departamento')
INSERT INTO #expected_tables (nombre) VALUES ('servicio')
INSERT INTO #expected_tables (nombre) VALUES ('familia_laboral')
INSERT INTO #expected_tables (nombre) VALUES ('nivel_cargo')
INSERT INTO #expected_tables (nombre) VALUES ('tipo_contrato')
INSERT INTO #expected_tables (nombre) VALUES ('tipo_item')
INSERT INTO #expected_tables (nombre) VALUES ('rol_funcional')
INSERT INTO #expected_tables (nombre) VALUES ('personal')
INSERT INTO #expected_tables (nombre) VALUES ('servicio_familia_habilitada')
INSERT INTO #expected_tables (nombre) VALUES ('asignacion_personal')
INSERT INTO #expected_tables (nombre) VALUES ('historial_asignacion')
INSERT INTO #expected_tables (nombre) VALUES ('rol_seguridad')
INSERT INTO #expected_tables (nombre) VALUES ('usuario')
INSERT INTO #expected_tables (nombre) VALUES ('calendario')
INSERT INTO #expected_tables (nombre) VALUES ('planificacion')
INSERT INTO #expected_tables (nombre) VALUES ('incidencia_personal')
INSERT INTO #expected_tables (nombre) VALUES ('turno')
INSERT INTO #expected_tables (nombre) VALUES ('rol_turno')
INSERT INTO #expected_tables (nombre) VALUES ('observacion_mensual')

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: falta la tabla dbo.schema_migration.'
END

IF EXISTS
(
    SELECT 1
    FROM #expected_tables et
    LEFT JOIN sys.tables st
        ON st.name = et.nombre
       AND st.schema_id = SCHEMA_ID('dbo')
    WHERE st.object_id IS NULL
)
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan tablas esperadas.'

    SELECT et.nombre AS tabla_faltante
    FROM #expected_tables et
    LEFT JOIN sys.tables st
        ON st.name = et.nombre
       AND st.schema_id = SCHEMA_ID('dbo')
    WHERE st.object_id IS NULL
    ORDER BY et.nombre
END
ELSE
BEGIN
    PRINT 'OK: existen las 25 tablas de negocio esperadas.'
END

SET @actual_total_table_count =
(
    SELECT COUNT(*)
    FROM sys.tables
    WHERE schema_id = SCHEMA_ID('dbo')
      AND is_ms_shipped = 0
)

PRINT 'Cantidad total de tablas dbo detectadas: ' + CAST(@actual_total_table_count AS VARCHAR(20))

IF @actual_total_table_count <> @expected_total_table_count
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: la cantidad total esperada de tablas dbo para esta fase es 26 incluyendo schema_migration.'
END
ELSE
BEGIN
    PRINT 'OK: cantidad total de tablas dbo valida para esta fase.'
END

IF EXISTS
(
    SELECT 1
    FROM #expected_tables et
    LEFT JOIN sys.tables st
        ON st.name = et.nombre
       AND st.schema_id = SCHEMA_ID('dbo')
    LEFT JOIN sys.key_constraints kc
        ON kc.parent_object_id = st.object_id
       AND kc.type = 'PK'
    WHERE kc.object_id IS NULL
)
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: hay tablas esperadas sin PK.'

    SELECT et.nombre AS tabla_sin_pk
    FROM #expected_tables et
    LEFT JOIN sys.tables st
        ON st.name = et.nombre
       AND st.schema_id = SCHEMA_ID('dbo')
    LEFT JOIN sys.key_constraints kc
        ON kc.parent_object_id = st.object_id
       AND kc.type = 'PK'
    WHERE kc.object_id IS NULL
    ORDER BY et.nombre
END
ELSE
BEGIN
    PRINT 'OK: todas las tablas de negocio tienen PK.'
END

CREATE TABLE #expected_foreign_keys
(
    nombre SYSNAME NOT NULL
)

INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_servicio_departamento')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_nivel_cargo_familia_laboral')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_personal_nivel_cargo')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_servicio_familia_habilitada_servicio')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_servicio_familia_habilitada_familia_laboral')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_asignacion_personal_personal')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_asignacion_personal_servicio')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_asignacion_personal_departamento')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_asignacion_personal_tipo_contrato')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_asignacion_personal_tipo_item')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_asignacion_personal_rol_funcional')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_asignacion_personal')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_servicio_origen')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_servicio_destino')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_departamento_origen')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_departamento_destino')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_tipo_contrato_origen')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_tipo_contrato_destino')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_historial_asignacion_usuario')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_usuario_personal')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_usuario_rol')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_planificacion_servicio')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_planificacion_usuario_creador')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_planificacion_usuario_publicador')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_planificacion_usuario_cierre')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_turno_servicio')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_turno_tipo_turno')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_planificacion')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_asignacion_personal')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_calendario')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_turno')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_tipo_dia')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_created_by')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_rol_turno_updated_by')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_planificacion')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_asignacion_personal')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_calendario')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_rol_turno')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_created_by')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_mensual_planificacion')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_mensual_asignacion_personal')
INSERT INTO #expected_foreign_keys (nombre) VALUES ('fk_observacion_mensual_created_by')

IF EXISTS
(
    SELECT 1
    FROM #expected_foreign_keys efk
    LEFT JOIN sys.foreign_keys fk
        ON fk.name = efk.nombre
    WHERE fk.object_id IS NULL
)
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan claves foraneas esperadas.'

    SELECT efk.nombre AS foreign_key_faltante
    FROM #expected_foreign_keys efk
    LEFT JOIN sys.foreign_keys fk
        ON fk.name = efk.nombre
    WHERE fk.object_id IS NULL
    ORDER BY efk.nombre
END
ELSE
BEGIN
    PRINT 'OK: existen las claves foraneas principales.'
END

CREATE TABLE #expected_indexes
(
    nombre SYSNAME NOT NULL
)

INSERT INTO #expected_indexes (nombre) VALUES ('ix_servicio_id_departamento')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_servicio_familia_habilitada_servicio_activo')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_asignacion_personal_personal_activo_fechas')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_asignacion_personal_departamento_rol_activo')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_asignacion_personal_servicio_tipo_item_rol_activo')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_historial_asignacion_asignacion_fecha_evento')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_usuario_id_personal')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_planificacion_servicio_anio_mes_estado')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_rol_turno_planificacion_calendario')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_rol_turno_asignacion_calendario')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_rol_turno_id_turno')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_rol_turno_id_tipo_dia')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_observacion_planificacion_asignacion_calendario')
INSERT INTO #expected_indexes (nombre) VALUES ('ix_observacion_mensual_planificacion_asignacion')

IF EXISTS
(
    SELECT 1
    FROM #expected_indexes ei
    LEFT JOIN sys.indexes si
        ON si.name = ei.nombre
    WHERE si.index_id IS NULL
)
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan indices esperados.'

    SELECT ei.nombre AS indice_faltante
    FROM #expected_indexes ei
    LEFT JOIN sys.indexes si
        ON si.name = ei.nombre
    WHERE si.index_id IS NULL
    ORDER BY ei.nombre
END
ELSE
BEGIN
    PRINT 'OK: existen los indices principales.'
END

IF (SELECT COUNT(*) FROM dbo.schema_migration WHERE estado = 'APLICADO') <> 8
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: la tabla schema_migration no registra las 8 migraciones aplicadas.'
END
ELSE
BEGIN
    PRINT 'OK: schema_migration registra 8 migraciones aplicadas.'
END

IF NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'ADMIN_SISTEMA')
   OR NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'RRHH')
   OR NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'JEFE_DEPARTAMENTO')
   OR NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'JEFE_SERVICIO')
   OR NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'PLANIFICADOR')
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan roles seed minimos.'
END
ELSE
BEGIN
    PRINT 'OK: roles seed minimos presentes.'
END

IF NOT EXISTS (SELECT 1 FROM dbo.rol_funcional WHERE codigo = 'ASISTENCIAL')
   OR NOT EXISTS (SELECT 1 FROM dbo.rol_funcional WHERE codigo = 'JEFE_SERVICIO')
   OR NOT EXISTS (SELECT 1 FROM dbo.rol_funcional WHERE codigo = 'JEFE_DEPARTAMENTO')
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan roles funcionales seed minimos.'
END
ELSE
BEGIN
    PRINT 'OK: roles funcionales seed minimos presentes.'
END

IF NOT EXISTS (SELECT 1 FROM dbo.tipo_dia WHERE codigo = 'DESCANSO')
   OR NOT EXISTS (SELECT 1 FROM dbo.tipo_dia WHERE codigo = 'VACACION')
   OR NOT EXISTS (SELECT 1 FROM dbo.tipo_dia WHERE codigo = 'LICENCIA')
   OR NOT EXISTS (SELECT 1 FROM dbo.tipo_dia WHERE codigo = 'BAJA_MEDICA')
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan tipos de dia seed minimos.'
END
ELSE
BEGIN
    PRINT 'OK: tipos de dia seed minimos presentes.'
END

IF NOT EXISTS (SELECT 1 FROM dbo.tipo_turno WHERE codigo = 'M')
   OR NOT EXISTS (SELECT 1 FROM dbo.tipo_turno WHERE codigo = 'T')
   OR NOT EXISTS (SELECT 1 FROM dbo.tipo_turno WHERE codigo = 'N')
BEGIN
    SET @failure_count = @failure_count + 1
    PRINT 'ERROR: faltan tipos de turno seed minimos.'
END
ELSE
BEGIN
    PRINT 'OK: tipos de turno seed minimos presentes.'
END

DROP TABLE #expected_indexes
DROP TABLE #expected_foreign_keys
DROP TABLE #expected_tables

IF @failure_count > 0
BEGIN
    RAISERROR('La validacion de esquema detecto errores.', 16, 1)
END
ELSE
BEGIN
    PRINT 'Validacion de esquema completada sin errores.'
END
GO
