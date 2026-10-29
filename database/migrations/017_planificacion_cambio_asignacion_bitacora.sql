SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '017';
DECLARE @migration_name VARCHAR(255) = '017_planificacion_cambio_asignacion_bitacora.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- `planificacion_cambio_asignacion` pasa a ser bitacora pura: registra
        -- el traslado (quien, de donde a donde, cuando, por que), pero ya no
        -- tiene un flujo de aprobacion/cancelacion propio y no bloquea el
        -- cierre de ninguna planificacion (docs/database/decisiones-
        -- tecnicas.md seccion 147). Se retiran las columnas de ese flujo
        -- (estado, aprobador, fecha de aprobacion, motivo de resolucion) de
        -- las migraciones 013/014.

        -- Los 3 indices existentes incluyen `estado`; hay que recrearlos sin
        -- esa columna antes de poder soltarla.
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_planificacion_cambio_asignacion_origen' AND object_id = OBJECT_ID('dbo.planificacion_cambio_asignacion'))
            DROP INDEX ix_planificacion_cambio_asignacion_origen ON dbo.planificacion_cambio_asignacion;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_planificacion_cambio_asignacion_destino' AND object_id = OBJECT_ID('dbo.planificacion_cambio_asignacion'))
            DROP INDEX ix_planificacion_cambio_asignacion_destino ON dbo.planificacion_cambio_asignacion;
        IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_planificacion_cambio_asignacion_planificaciones' AND object_id = OBJECT_ID('dbo.planificacion_cambio_asignacion'))
            DROP INDEX ix_planificacion_cambio_asignacion_planificaciones ON dbo.planificacion_cambio_asignacion;

        IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_usuario_aprobador')
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP CONSTRAINT fk_planificacion_cambio_asignacion_usuario_aprobador;

        IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_cambio_asignacion_estado')
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP CONSTRAINT ck_planificacion_cambio_asignacion_estado;
        IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_cambio_asignacion_fecha_aprobacion')
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP CONSTRAINT ck_planificacion_cambio_asignacion_fecha_aprobacion;

        IF COL_LENGTH(N'dbo.planificacion_cambio_asignacion', N'estado') IS NOT NULL
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP COLUMN estado;
        IF COL_LENGTH(N'dbo.planificacion_cambio_asignacion', N'id_usuario_aprobador') IS NOT NULL
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP COLUMN id_usuario_aprobador;
        IF COL_LENGTH(N'dbo.planificacion_cambio_asignacion', N'fecha_aprobacion') IS NOT NULL
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP COLUMN fecha_aprobacion;
        IF COL_LENGTH(N'dbo.planificacion_cambio_asignacion', N'motivo_resolucion') IS NOT NULL
            ALTER TABLE dbo.planificacion_cambio_asignacion DROP COLUMN motivo_resolucion;

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_planificacion_cambio_asignacion_origen' AND object_id = OBJECT_ID('dbo.planificacion_cambio_asignacion'))
            CREATE NONCLUSTERED INDEX ix_planificacion_cambio_asignacion_origen
                ON dbo.planificacion_cambio_asignacion (id_asignacion_origen, fecha_efectiva);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_planificacion_cambio_asignacion_destino' AND object_id = OBJECT_ID('dbo.planificacion_cambio_asignacion'))
            CREATE NONCLUSTERED INDEX ix_planificacion_cambio_asignacion_destino
                ON dbo.planificacion_cambio_asignacion (id_asignacion_destino, fecha_efectiva);
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_planificacion_cambio_asignacion_planificaciones' AND object_id = OBJECT_ID('dbo.planificacion_cambio_asignacion'))
            CREATE NONCLUSTERED INDEX ix_planificacion_cambio_asignacion_planificaciones
                ON dbo.planificacion_cambio_asignacion (id_planificacion_origen, id_planificacion_destino);

        IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
            UPDATE dbo.schema_migration
            SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
            WHERE version = @migration_version;
        ELSE
            INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
            VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @error_message NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@error_message, 16, 1);
    END CATCH;
END;
