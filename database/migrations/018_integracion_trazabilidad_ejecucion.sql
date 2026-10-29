/*
  Trazabilidad de ejecuciones de integracion (modulo integracion, fase 1).
  Solo modifica estructuras de la base propia; no referencia el sistema de RRHH ni
  ninguna otra fuente externa. Compatible con SQL Server 2008 R2.
*/
SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '018';
DECLARE @migration_name VARCHAR(255) = '018_integracion_trazabilidad_ejecucion.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Quien y desde donde disparo la ejecucion. created_by queda nulo
        -- cuando se ejecuta desde consola (no hay sesion de usuario).
        IF COL_LENGTH(N'dbo.integracion_ejecucion', N'origen_ejecucion') IS NULL
            ALTER TABLE dbo.integracion_ejecucion ADD origen_ejecucion VARCHAR(20) NULL;
        IF COL_LENGTH(N'dbo.integracion_ejecucion', N'created_by') IS NULL
            ALTER TABLE dbo.integracion_ejecucion ADD created_by BIGINT NULL;

        -- Una aplicacion (APPLY) siempre parte de una validacion (DRY_RUN)
        -- concreta; hasta ahora esa relacion solo quedaba en el texto.
        IF COL_LENGTH(N'dbo.integracion_ejecucion', N'ejecucion_validacion_id') IS NULL
            ALTER TABLE dbo.integracion_ejecucion ADD ejecucion_validacion_id BIGINT NULL;

        -- Como se conecto a la fuente (misma instancia/propia, mismas
        -- credenciales/propias) y si esa credencial podia escribir en el
        -- origen: permite auditar cuando se paso del usuario maestro a uno de
        -- solo lectura.
        IF COL_LENGTH(N'dbo.integracion_ejecucion', N'modo_conexion') IS NULL
            ALTER TABLE dbo.integracion_ejecucion ADD modo_conexion VARCHAR(60) NULL;
        IF COL_LENGTH(N'dbo.integracion_ejecucion', N'origen_con_permiso_escritura') IS NULL
            ALTER TABLE dbo.integracion_ejecucion ADD origen_con_permiso_escritura BIT NULL;

        -- EXEC(N'...'): SQL Server compila el lote completo antes de ejecutar
        -- los ALTER de arriba, asi que referencias directas a las columnas
        -- nuevas fallarian con "Invalid column name".
        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_integracion_ejecucion_origen' AND parent_object_id = OBJECT_ID('dbo.integracion_ejecucion'))
            EXEC(N'ALTER TABLE dbo.integracion_ejecucion ADD CONSTRAINT CK_integracion_ejecucion_origen
                CHECK (origen_ejecucion IS NULL OR origen_ejecucion IN (''CONSOLA'', ''API'', ''PROGRAMADA''))');

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_integracion_ejecucion_created_by' AND parent_object_id = OBJECT_ID('dbo.integracion_ejecucion'))
            EXEC(N'ALTER TABLE dbo.integracion_ejecucion ADD CONSTRAINT FK_integracion_ejecucion_created_by
                FOREIGN KEY (created_by) REFERENCES dbo.usuario(id)');

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_integracion_ejecucion_validacion' AND parent_object_id = OBJECT_ID('dbo.integracion_ejecucion'))
            EXEC(N'ALTER TABLE dbo.integracion_ejecucion ADD CONSTRAINT FK_integracion_ejecucion_validacion
                FOREIGN KEY (ejecucion_validacion_id) REFERENCES dbo.integracion_ejecucion(id)');

        -- Antes de esta migracion la unica forma de ejecutar era por consola.
        EXEC(N'UPDATE dbo.integracion_ejecucion SET origen_ejecucion = ''CONSOLA'' WHERE origen_ejecucion IS NULL');

        -- "Ultima validacion de esta fuente" es la consulta mas frecuente del
        -- modulo (aplicar, reporte de conflictos).
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_integracion_ejecucion_fuente_tipo' AND object_id = OBJECT_ID('dbo.integracion_ejecucion'))
            CREATE NONCLUSTERED INDEX IX_integracion_ejecucion_fuente_tipo
                ON dbo.integracion_ejecucion (source_system, source_entity, tipo_ejecucion, id);

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
