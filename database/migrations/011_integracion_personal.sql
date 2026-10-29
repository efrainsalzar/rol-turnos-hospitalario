/*
  Integracion de personal multi-fuente.
  Esta migracion solo crea estructuras en la base propia de la aplicacion.
  No contiene referencias ni escrituras sobre sistemas externos de origen.
  Compatible con SQL Server 2008 R2.
*/

SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50);
DECLARE @migration_name VARCHAR(255);
SET @migration_version = '011';
SET @migration_name = '011_integracion_personal.sql';

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 011 ya aplicada. Se omite.';
    RETURN;
END;

BEGIN TRY
    BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.integracion_ejecucion', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.integracion_ejecucion (
        id BIGINT IDENTITY(1,1) NOT NULL,
        source_system VARCHAR(80) NOT NULL,
        source_entity VARCHAR(128) NOT NULL,
        tipo_ejecucion VARCHAR(20) NOT NULL,
        estado VARCHAR(20) NOT NULL,
        iniciado_at DATETIME NOT NULL CONSTRAINT DF_integracion_ejecucion_iniciado_at DEFAULT GETDATE(),
        finalizado_at DATETIME NULL,
        total_leidos INT NOT NULL CONSTRAINT DF_integracion_ejecucion_total_leidos DEFAULT 0,
        total_validos INT NOT NULL CONSTRAINT DF_integracion_ejecucion_total_validos DEFAULT 0,
        total_aplicados INT NOT NULL CONSTRAINT DF_integracion_ejecucion_total_aplicados DEFAULT 0,
        total_errores INT NOT NULL CONSTRAINT DF_integracion_ejecucion_total_errores DEFAULT 0,
        mensaje VARCHAR(1000) NULL,
        CONSTRAINT PK_integracion_ejecucion PRIMARY KEY (id),
        CONSTRAINT CK_integracion_ejecucion_tipo CHECK (tipo_ejecucion IN ('DRY_RUN', 'APPLY')),
        CONSTRAINT CK_integracion_ejecucion_estado CHECK (estado IN ('INICIADA', 'FINALIZADA', 'ERROR', 'CANCELADA'))
    );
END;

IF OBJECT_ID(N'dbo.personal_fuente', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.personal_fuente (
        id BIGINT IDENTITY(1,1) NOT NULL,
        personal_id BIGINT NOT NULL,
        source_system VARCHAR(80) NOT NULL,
        source_entity VARCHAR(128) NOT NULL,
        external_id VARCHAR(100) NOT NULL,
        external_code VARCHAR(100) NULL,
        is_primary BIT NOT NULL CONSTRAINT DF_personal_fuente_is_primary DEFAULT 1,
        first_seen_at DATETIME NOT NULL CONSTRAINT DF_personal_fuente_first_seen_at DEFAULT GETDATE(),
        last_seen_at DATETIME NOT NULL CONSTRAINT DF_personal_fuente_last_seen_at DEFAULT GETDATE(),
        is_active BIT NOT NULL CONSTRAINT DF_personal_fuente_is_active DEFAULT 1,
        created_at DATETIME NOT NULL CONSTRAINT DF_personal_fuente_created_at DEFAULT GETDATE(),
        updated_at DATETIME NOT NULL CONSTRAINT DF_personal_fuente_updated_at DEFAULT GETDATE(),
        CONSTRAINT PK_personal_fuente PRIMARY KEY (id),
        CONSTRAINT FK_personal_fuente_personal FOREIGN KEY (personal_id) REFERENCES dbo.personal(id),
        CONSTRAINT UQ_personal_fuente_external UNIQUE (source_system, source_entity, external_id)
    );

    CREATE INDEX IX_personal_fuente_personal_id
        ON dbo.personal_fuente (personal_id);
END;

IF OBJECT_ID(N'dbo.integracion_personal_staging', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.integracion_personal_staging (
        id BIGINT IDENTITY(1,1) NOT NULL,
        ejecucion_id BIGINT NOT NULL,
        source_system VARCHAR(80) NOT NULL,
        source_entity VARCHAR(128) NOT NULL,
        external_id VARCHAR(100) NOT NULL,
        nombre NVARCHAR(120) NULL,
        apellido_paterno NVARCHAR(120) NULL,
        apellido_materno NVARCHAR(120) NULL,
        documento_identidad VARCHAR(30) NULL,
        documento_normalizado VARCHAR(30) NULL,
        source_record_hash VARCHAR(64) NULL,
        estado VARCHAR(20) NOT NULL CONSTRAINT DF_integracion_staging_estado DEFAULT 'RECIBIDO',
        mensaje VARCHAR(1000) NULL,
        recibido_at DATETIME NOT NULL CONSTRAINT DF_integracion_staging_recibido_at DEFAULT GETDATE(),
        procesado_at DATETIME NULL,
        CONSTRAINT PK_integracion_personal_staging PRIMARY KEY (id),
        CONSTRAINT FK_integracion_staging_ejecucion FOREIGN KEY (ejecucion_id) REFERENCES dbo.integracion_ejecucion(id),
        CONSTRAINT UQ_integracion_staging_external UNIQUE (ejecucion_id, source_system, source_entity, external_id),
        CONSTRAINT CK_integracion_staging_estado CHECK (estado IN ('RECIBIDO', 'VALIDO', 'SIN_CAMBIOS', 'APLICADO', 'DUPLICADO', 'CONFLICTO', 'OMITIDO', 'ERROR'))
    );

    CREATE INDEX IX_integracion_staging_estado
        ON dbo.integracion_personal_staging (ejecucion_id, estado);
END;

IF OBJECT_ID(N'dbo.integracion_conflicto', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.integracion_conflicto (
        id BIGINT IDENTITY(1,1) NOT NULL,
        ejecucion_id BIGINT NOT NULL,
        staging_id BIGINT NULL,
        tipo VARCHAR(40) NOT NULL,
        detalle VARCHAR(1000) NOT NULL,
        estado VARCHAR(20) NOT NULL CONSTRAINT DF_integracion_conflicto_estado DEFAULT 'PENDIENTE',
        creado_at DATETIME NOT NULL CONSTRAINT DF_integracion_conflicto_creado_at DEFAULT GETDATE(),
        resuelto_at DATETIME NULL,
        CONSTRAINT PK_integracion_conflicto PRIMARY KEY (id),
        CONSTRAINT FK_integracion_conflicto_ejecucion FOREIGN KEY (ejecucion_id) REFERENCES dbo.integracion_ejecucion(id),
        CONSTRAINT FK_integracion_conflicto_staging FOREIGN KEY (staging_id) REFERENCES dbo.integracion_personal_staging(id),
        CONSTRAINT CK_integracion_conflicto_estado CHECK (estado IN ('PENDIENTE', 'RESUELTO', 'DESCARTADO'))
    );
END;

IF EXISTS (SELECT 1 FROM dbo.nivel_cargo WHERE codigo = 'PENDIENTE')
BEGIN
    UPDATE dbo.nivel_cargo
    SET nombre = N'Cargo pendiente de clasificar',
        activo = 1,
        updated_at = GETUTCDATE()
    WHERE codigo = 'PENDIENTE';
END
ELSE
BEGIN
    INSERT INTO dbo.nivel_cargo
        (codigo, nombre, descripcion, activo, created_at, updated_at, orden_visual)
    VALUES
        ('PENDIENTE', N'Cargo pendiente de clasificar',
         N'Valor temporal para personal importado sin equivalencia de cargo.',
         1, GETUTCDATE(), GETUTCDATE(), 9999);
END;

IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
    UPDATE dbo.schema_migration
    SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
    WHERE version = @migration_version;
ELSE
    INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
    VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO');

    COMMIT TRANSACTION;
    PRINT 'Migracion 011 aplicada: integracion de personal multi-fuente.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

    DECLARE @error_message NVARCHAR(4000);
    SET @error_message = ERROR_MESSAGE();

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration SET estado = 'ERROR' WHERE version = @migration_version;
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'ERROR');

    RAISERROR(@error_message, 16, 1);
END CATCH;
