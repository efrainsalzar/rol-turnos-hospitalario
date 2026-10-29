SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '010'
SET @migration_name    = '010_seed_departamento_pendiente_asignacion.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 010.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 010 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Departamento placeholder, NO es un departamento real del organigrama.
    -- Existe solo para poder guardar el dato administrativo (item,
    -- fuente/tipo_contrato, carga horaria) de personal cargado cuya ubicacion
    -- organizativa todavia no se decidio -- la restriccion
    -- ck_asignacion_personal_ambito exige que toda asignacion tenga id_servicio
    -- o id_departamento, no hay forma de omitirlo.
    -- Las asignaciones que se crean contra este departamento se cierran el
    -- mismo dia: el proposito es dejar el dato persistido y visible en el
    -- historial de cada persona, no registrar un puesto de trabajo real.
    INSERT INTO dbo.departamento (codigo, nombre)
    SELECT 'PENDIENTE-ASIGNACION', N'Pendiente de asignacion real'
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.departamento WHERE codigo = 'PENDIENTE-ASIGNACION'
    )

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 010 aplicada: departamento PENDIENTE-ASIGNACION sembrado.'

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
