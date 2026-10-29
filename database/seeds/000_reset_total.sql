-- ============================================================
-- 000_reset_total.sql
-- Borra TODOS los datos de todas las tablas en orden seguro.
-- Conserva schema_migration (historial de migraciones).
-- Resetea identities para que los IDs vuelvan a empezar en 1.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

PRINT 'Iniciando reset total de datos...'

-- 1. Nivel mas profundo: tablas que referencian a casi todo
-- (dbo.cambio_turno se elimino en la migracion 040_drop_cambio_turno.sql;
--  dbo.observacion se elimino en la migracion 041)
DELETE FROM dbo.sesion_usuario
DELETE FROM dbo.observacion_mensual
DELETE FROM dbo.historial_asignacion
PRINT 'Paso 1/7 OK: sesion_usuario, observacion_mensual, historial'

-- 1b. Tablas de historial (migraciones 036-038), hijas de planificacion_historial
DELETE FROM dbo.rol_turno_historial
DELETE FROM dbo.observacion_historial
DELETE FROM dbo.observacion_mensual_historial
DELETE FROM dbo.planificacion_historial
PRINT 'Paso 1b/7 OK: historial de planificacion'

-- 2. Planificacion y rol_turno (referencian entre si via calendario y asignacion)
-- (dbo.cobertura_turno se elimino en la migracion 041)
DELETE FROM dbo.rol_turno
PRINT 'Paso 2/7 OK: rol_turno'

-- 3. Planificacion
-- (dbo.plantilla_planificacion y la columna id_plantilla_planificacion se
--  eliminaron en la migracion 041)
DELETE FROM dbo.planificacion
DELETE FROM dbo.calendario
PRINT 'Paso 3/7 OK: planificacion, calendario'

-- 4. Configuracion operativa y codigos
-- (dbo.regla_horas se elimino en la migracion 041)
DELETE FROM dbo.codigo_operativo_servicio
DELETE FROM dbo.configuracion_operativa_servicio
PRINT 'Paso 4/7 OK: configuracion_operativa, codigo_operativo'

-- 5. Asignaciones y personal
DELETE FROM dbo.asignacion_personal
DELETE FROM dbo.usuario
DELETE FROM dbo.personal
PRINT 'Paso 5/7 OK: asignacion_personal, usuario, personal'

-- 6. Organizacion (servicio_familia_habilitada eliminada en mig 028)
DELETE FROM dbo.turno
DELETE FROM dbo.servicio
DELETE FROM dbo.departamento
PRINT 'Paso 6/7 OK: turno, servicio, departamento'

-- 7. Catalogos (familia_laboral y tipo_turno eliminadas en mig 028 y 033)
DELETE FROM dbo.nivel_cargo
DELETE FROM dbo.rol_funcional
DELETE FROM dbo.carga_horaria
DELETE FROM dbo.rol_seguridad
DELETE FROM dbo.tipo_contrato
DELETE FROM dbo.incidencia_personal
DELETE FROM dbo.feriado
DELETE FROM dbo.tipo_feriado
PRINT 'Paso 7/7 OK: catalogos'

-- 8. Resetear identities
DBCC CHECKIDENT ('dbo.sesion_usuario',            RESEED, 0)
DBCC CHECKIDENT ('dbo.observacion_mensual',       RESEED, 0)
DBCC CHECKIDENT ('dbo.historial_asignacion',      RESEED, 0)
DBCC CHECKIDENT ('dbo.rol_turno_historial',       RESEED, 0)
DBCC CHECKIDENT ('dbo.observacion_historial',     RESEED, 0)
DBCC CHECKIDENT ('dbo.observacion_mensual_historial', RESEED, 0)
DBCC CHECKIDENT ('dbo.planificacion_historial',   RESEED, 0)
DBCC CHECKIDENT ('dbo.rol_turno',                 RESEED, 0)
DBCC CHECKIDENT ('dbo.planificacion',             RESEED, 0)
DBCC CHECKIDENT ('dbo.calendario',                RESEED, 0)
DBCC CHECKIDENT ('dbo.codigo_operativo_servicio', RESEED, 0)
DBCC CHECKIDENT ('dbo.configuracion_operativa_servicio', RESEED, 0)
DBCC CHECKIDENT ('dbo.asignacion_personal',       RESEED, 0)
DBCC CHECKIDENT ('dbo.usuario',                   RESEED, 0)
DBCC CHECKIDENT ('dbo.personal',                  RESEED, 0)
DBCC CHECKIDENT ('dbo.turno',                     RESEED, 0)
DBCC CHECKIDENT ('dbo.servicio',                  RESEED, 0)
DBCC CHECKIDENT ('dbo.departamento',              RESEED, 0)
DBCC CHECKIDENT ('dbo.nivel_cargo',               RESEED, 0)
DBCC CHECKIDENT ('dbo.rol_funcional',             RESEED, 0)
DBCC CHECKIDENT ('dbo.carga_horaria',             RESEED, 0)
DBCC CHECKIDENT ('dbo.rol_seguridad',                       RESEED, 0)
DBCC CHECKIDENT ('dbo.tipo_contrato',             RESEED, 0)
DBCC CHECKIDENT ('dbo.incidencia_personal',                  RESEED, 0)
DBCC CHECKIDENT ('dbo.feriado',                   RESEED, 0)
DBCC CHECKIDENT ('dbo.tipo_feriado',              RESEED, 0)
PRINT 'Paso 8/8 OK: identities reseteados a 0 (proximo ID = 1)'

-- 9. Reparar FK duplicada dejada por migracion 032
--    fk_asignacion_personal_tipo_item sobrevivio al sp_rename del column
--    y apunta al mismo par que fk_asignacion_personal_tipo_contrato.
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'fk_asignacion_personal_tipo_item'
      AND parent_object_id = OBJECT_ID('dbo.asignacion_personal')
)
BEGIN
    ALTER TABLE dbo.asignacion_personal DROP CONSTRAINT fk_asignacion_personal_tipo_item
    PRINT 'FK duplicada fk_asignacion_personal_tipo_item eliminada.'
END

PRINT ''
PRINT 'Reset total completado. Base de datos vacia y lista para carga de catalogos.'
