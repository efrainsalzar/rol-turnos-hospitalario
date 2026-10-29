SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '001'
SET @migration_name    = '001_baseline_organizacion.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 001.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 001 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Tabla: departamento
    IF OBJECT_ID(N'dbo.departamento', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[departamento](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_departamento] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_departamento_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_departamento_nombre] UNIQUE NONCLUSTERED 
    (
    	[nombre] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[departamento] ADD  CONSTRAINT [df_departamento_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[departamento] ADD  CONSTRAINT [df_departamento_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[departamento] ADD  CONSTRAINT [df_departamento_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: servicio
    IF OBJECT_ID(N'dbo.servicio', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[servicio](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_departamento] [bigint] NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[tipo_servicio] [varchar](20) NOT NULL,
     CONSTRAINT [pk_servicio] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_servicio_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_servicio_departamento_nombre] UNIQUE NONCLUSTERED 
    (
    	[id_departamento] ASC,
    	[nombre] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[servicio] ADD  CONSTRAINT [df_servicio_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[servicio] ADD  CONSTRAINT [df_servicio_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[servicio] ADD  CONSTRAINT [df_servicio_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    ALTER TABLE [dbo].[servicio] ADD  CONSTRAINT [df_servicio_tipo_servicio]  DEFAULT ('SERVICIO') FOR [tipo_servicio]
    CREATE NONCLUSTERED INDEX [ix_servicio_id_departamento] ON [dbo].[servicio]
    (
    	[id_departamento] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Claves foraneas de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_servicio_departamento' AND parent_object_id = OBJECT_ID('dbo.servicio'))
    ALTER TABLE [dbo].[servicio] WITH CHECK ADD CONSTRAINT [fk_servicio_departamento] FOREIGN KEY([id_departamento])
    REFERENCES [dbo].[departamento] ([id])

    -- Check constraints de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_servicio_tipo_servicio' AND parent_object_id = OBJECT_ID('dbo.servicio'))
    ALTER TABLE [dbo].[servicio]  WITH CHECK ADD  CONSTRAINT [ck_servicio_tipo_servicio] CHECK  (([tipo_servicio]='UNIDAD' OR [tipo_servicio]='SERVICIO'))

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 001 aplicada: baseline de organizacion (2 tablas).'

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
