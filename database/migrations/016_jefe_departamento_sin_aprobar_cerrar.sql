SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '016';
DECLARE @migration_name VARCHAR(255) = '016_jefe_departamento_sin_aprobar_cerrar.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Decision del usuario (docs/database/decisiones-tecnicas.md seccion 147):
        -- jefe de departamento prepara, envia a revision y puede devolver a
        -- borrador, pero ya no aprueba ni cierra una planificacion — eso queda
        -- reservado a RRHH/Admin (alcance SISTEMA). Las columnas
        -- enviar_revision_planificacion/volver_borrador_planificacion de este rol
        -- no cambian (ya estaban en 1, correcto).
        UPDATE dbo.rol_seguridad
        SET
            aprobar_planificacion = 0,
            cerrar_planificacion = 0,
            updated_at = GETUTCDATE()
        WHERE codigo = 'JEFE_DEPARTAMENTO';

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
