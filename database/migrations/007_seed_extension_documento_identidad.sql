SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '007'
SET @migration_name    = '007_seed_extension_documento_identidad.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 007.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 007 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Catalogo del departamento emisor de la cedula de identidad (Bolivia): el
    -- numero de C.I. no es unico por si solo, solo dentro de la serie de su
    -- departamento emisor (ver docs/database/decisiones-tecnicas.md, migracion
    -- original 057 antes de la limpieza de migraciones).
    IF NOT EXISTS (SELECT 1 FROM dbo.extension_documento_identidad)
    BEGIN
        INSERT INTO dbo.extension_documento_identidad (codigo, nombre)
        VALUES
            ('LP', N'La Paz'),
            ('CB', N'Cochabamba'),
            ('SC', N'Santa Cruz'),
            ('OR', N'Oruro'),
            ('PT', N'Potosi'),
            ('CH', N'Chuquisaca'),
            ('TJ', N'Tarija'),
            ('BE', N'Beni'),
            ('PD', N'Pando')
    END

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 007 aplicada: extension_documento_identidad sembrada (9 departamentos de Bolivia).'

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION

    DECLARE @error_message NVARCHAR(4000)
    SET @error_message = ERROR_MESSAGE()

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration SET estado = 'ERROR' WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'ERROR')

    RAISERROR(@error_message, 16, 1)
END CATCH
