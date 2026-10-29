/* Amplia estados de lotes de integracion sin cambiar datos de negocio. */
SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '012';
DECLARE @migration_name VARCHAR(255) = '012_estados_integracion.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_integracion_ejecucion_estado' AND parent_object_id = OBJECT_ID('dbo.integracion_ejecucion'))
            ALTER TABLE dbo.integracion_ejecucion DROP CONSTRAINT CK_integracion_ejecucion_estado;

        ALTER TABLE dbo.integracion_ejecucion ADD CONSTRAINT CK_integracion_ejecucion_estado CHECK
        (estado IN ('INICIADA', 'LECTURA_COMPLETA', 'VALIDADA', 'LISTA_PARA_APLICAR_TOTAL',
                    'LISTA_PARA_APLICAR_PARCIAL', 'FINALIZADA', 'APLICADA_TOTAL',
                    'APLICADA_PARCIAL', 'ERROR', 'CANCELADA'));

        IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
            UPDATE dbo.schema_migration SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO' WHERE version = @migration_version;
        ELSE
            INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado) VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO');

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @error_message NVARCHAR(4000);
        SET @error_message = ERROR_MESSAGE();
        RAISERROR(@error_message, 16, 1);
    END CATCH;
END;
