SET NOCOUNT ON;

DECLARE @migration_version VARCHAR(50) = '013';
DECLARE @migration_name VARCHAR(255) = '013_planificacion_cambios_asignacion.sql';

IF NOT EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Registra el impacto de un traslado sobre una planificacion aprobada.
        -- La planificacion original no se modifica: esta tabla solo describe el
        -- cambio y permite resolver la vista efectiva.
        IF OBJECT_ID(N'dbo.planificacion_cambio_asignacion', N'U') IS NULL
        BEGIN
            CREATE TABLE dbo.planificacion_cambio_asignacion (
                id BIGINT IDENTITY(1,1) NOT NULL,
                id_asignacion_origen BIGINT NOT NULL,
                id_asignacion_destino BIGINT NOT NULL,
                id_planificacion_origen BIGINT NULL,
                id_planificacion_destino BIGINT NULL,
                fecha_efectiva DATE NOT NULL,
                estado VARCHAR(20) NOT NULL,
                motivo NVARCHAR(500) NOT NULL,
                id_usuario_creador BIGINT NOT NULL,
                id_usuario_aprobador BIGINT NULL,
                fecha_aprobacion DATETIME NULL,
                created_at DATETIME NOT NULL CONSTRAINT df_planificacion_cambio_asignacion_created_at DEFAULT (GETUTCDATE()),
                updated_at DATETIME NOT NULL CONSTRAINT df_planificacion_cambio_asignacion_updated_at DEFAULT (GETUTCDATE()),
                activo BIT NOT NULL CONSTRAINT df_planificacion_cambio_asignacion_activo DEFAULT (1),
                CONSTRAINT pk_planificacion_cambio_asignacion PRIMARY KEY CLUSTERED (id),
                CONSTRAINT ck_planificacion_cambio_asignacion_estado CHECK (estado IN ('EN_EDICION', 'REVISION', 'APROBADA', 'CANCELADA')),
                CONSTRAINT ck_planificacion_cambio_asignacion_fecha_aprobacion CHECK (
                    (estado = 'APROBADA' AND id_usuario_aprobador IS NOT NULL AND fecha_aprobacion IS NOT NULL)
                    OR (estado <> 'APROBADA')
                )
            );

            CREATE NONCLUSTERED INDEX ix_planificacion_cambio_asignacion_origen
                ON dbo.planificacion_cambio_asignacion (id_asignacion_origen, fecha_efectiva, estado);
            CREATE NONCLUSTERED INDEX ix_planificacion_cambio_asignacion_destino
                ON dbo.planificacion_cambio_asignacion (id_asignacion_destino, fecha_efectiva, estado);
            CREATE NONCLUSTERED INDEX ix_planificacion_cambio_asignacion_planificaciones
                ON dbo.planificacion_cambio_asignacion (id_planificacion_origen, id_planificacion_destino, estado);
        END;

        -- Las celdas de la incorporacion se persisten en rol_turno para
        -- reutilizar la matriz y sus consultas actuales. La relacion con el
        -- traslado permite ocultarlas en la vista original y conservarlas en
        -- la efectiva.
        IF COL_LENGTH(N'dbo.rol_turno', N'id_planificacion_cambio') IS NULL
            ALTER TABLE dbo.rol_turno ADD id_planificacion_cambio BIGINT NULL;
        IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_rol_turno_planificacion_cambio' AND object_id = OBJECT_ID('dbo.rol_turno'))
            CREATE NONCLUSTERED INDEX ix_rol_turno_planificacion_cambio
                ON dbo.rol_turno (id_planificacion_cambio, id_planificacion, id_asignacion_personal, id_calendario);

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_origen')
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD CONSTRAINT fk_planificacion_cambio_asignacion_origen
                FOREIGN KEY (id_asignacion_origen) REFERENCES dbo.asignacion_personal (id);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_destino')
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD CONSTRAINT fk_planificacion_cambio_asignacion_destino
                FOREIGN KEY (id_asignacion_destino) REFERENCES dbo.asignacion_personal (id);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_plan_origen')
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD CONSTRAINT fk_planificacion_cambio_asignacion_plan_origen
                FOREIGN KEY (id_planificacion_origen) REFERENCES dbo.planificacion (id);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_plan_destino')
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD CONSTRAINT fk_planificacion_cambio_asignacion_plan_destino
                FOREIGN KEY (id_planificacion_destino) REFERENCES dbo.planificacion (id);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_usuario_creador')
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD CONSTRAINT fk_planificacion_cambio_asignacion_usuario_creador
                FOREIGN KEY (id_usuario_creador) REFERENCES dbo.usuario (id);
        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_cambio_asignacion_usuario_aprobador')
            ALTER TABLE dbo.planificacion_cambio_asignacion ADD CONSTRAINT fk_planificacion_cambio_asignacion_usuario_aprobador
                FOREIGN KEY (id_usuario_aprobador) REFERENCES dbo.usuario (id);

        IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_planificacion_cambio')
            ALTER TABLE dbo.rol_turno ADD CONSTRAINT fk_rol_turno_planificacion_cambio
                FOREIGN KEY (id_planificacion_cambio) REFERENCES dbo.planificacion_cambio_asignacion (id);

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
