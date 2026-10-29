SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '015';
DECLARE @migration_name VARCHAR(255) = '015_rol_turno_historial_vista.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Distingue, dentro del historial ya congelado de una planificacion
        -- cerrada, cual de las dos vistas describe cada fila: ORIGINAL (la
        -- aprobada, sin aplicar traslados) o EFECTIVA (con los traslados ya
        -- aprobados aplicados). NULL para historiales congelados antes de que
        -- existiera esta distincion: esos no tienen traslados que resolver,
        -- asi que la misma fila vale para ambas vistas
        -- (docs/database/decisiones-tecnicas.md seccion 146).
        IF COL_LENGTH(N'dbo.rol_turno_historial', N'vista') IS NULL
            ALTER TABLE dbo.rol_turno_historial ADD vista VARCHAR(10) NULL;

        -- EXEC(N'...') en vez de ALTER/CREATE directo: SQL Server compila el
        -- lote completo de una sola vez, y el CHECK no siempre resuelve una
        -- columna agregada mas arriba en el mismo lote ("Invalid column name
        -- 'vista'"). El SQL dinamico se compila al ejecutarse, cuando la
        -- columna ya existe.
        IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_turno_historial_vista')
            EXEC(N'ALTER TABLE dbo.rol_turno_historial ADD CONSTRAINT ck_rol_turno_historial_vista
                CHECK (vista IS NULL OR vista IN (''ORIGINAL'', ''EFECTIVA''))');

        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_rol_turno_historial_vista' AND object_id = OBJECT_ID('dbo.rol_turno_historial'))
            EXEC(N'CREATE NONCLUSTERED INDEX ix_rol_turno_historial_vista
                ON dbo.rol_turno_historial (id_planificacion_historial, vista)');

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
