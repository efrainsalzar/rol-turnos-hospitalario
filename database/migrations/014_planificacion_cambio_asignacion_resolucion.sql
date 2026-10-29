SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '014';
DECLARE @migration_name VARCHAR(255) = '014_planificacion_cambio_asignacion_resolucion.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Motivo de la aprobacion o cancelacion del cambio, distinto del motivo
        -- original del traslado (columna "motivo", capturado en la migracion 013).
        -- Las columnas id_usuario_aprobador/fecha_aprobacion ya existentes se
        -- reutilizan para registrar quien resolvio y cuando, tanto si el cambio
        -- termina APROBADA como CANCELADA (el CHECK de la migracion 013 solo
        -- exige esos valores cuando estado = 'APROBADA', no lo impide para otros
        -- estados).
        IF COL_LENGTH(N'dbo.planificacion_cambio_asignacion', N'motivo_resolucion') IS NULL
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD motivo_resolucion NVARCHAR(500) NULL;

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
