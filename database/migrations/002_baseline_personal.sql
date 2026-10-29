SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '002'
SET @migration_name    = '002_baseline_personal.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 002.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 002 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Tabla: nivel_cargo
    IF OBJECT_ID(N'dbo.nivel_cargo', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[nivel_cargo](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[orden_visual] [smallint] NULL,
     CONSTRAINT [pk_nivel_cargo] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_nivel_cargo_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_nivel_cargo_nombre] UNIQUE NONCLUSTERED 
    (
    	[nombre] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[nivel_cargo] ADD  CONSTRAINT [df_nivel_cargo_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[nivel_cargo] ADD  CONSTRAINT [df_nivel_cargo_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[nivel_cargo] ADD  CONSTRAINT [df_nivel_cargo_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: extension_documento_identidad
    IF OBJECT_ID(N'dbo.extension_documento_identidad', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[extension_documento_identidad](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](5) NOT NULL,
    	[nombre] [nvarchar](60) NOT NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_extension_documento_identidad] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_extension_documento_identidad_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[extension_documento_identidad] ADD  CONSTRAINT [df_extension_documento_identidad_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[extension_documento_identidad] ADD  CONSTRAINT [df_extension_documento_identidad_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[extension_documento_identidad] ADD  CONSTRAINT [df_extension_documento_identidad_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: tipo_contrato
    IF OBJECT_ID(N'dbo.tipo_contrato', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[tipo_contrato](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_tipo_item] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_tipo_item_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_tipo_item_nombre] UNIQUE NONCLUSTERED 
    (
    	[nombre] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[tipo_contrato] ADD  CONSTRAINT [df_tipo_item_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[tipo_contrato] ADD  CONSTRAINT [df_tipo_item_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[tipo_contrato] ADD  CONSTRAINT [df_tipo_item_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: carga_horaria
    IF OBJECT_ID(N'dbo.carga_horaria', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[carga_horaria](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[horas_dia_base] [decimal](5, 2) NOT NULL,
    	[descripcion] [varchar](max) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_carga_horaria] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_carga_horaria_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
    ALTER TABLE [dbo].[carga_horaria] ADD  CONSTRAINT [df_carga_horaria_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[carga_horaria] ADD  CONSTRAINT [df_carga_horaria_created_at]  DEFAULT (getdate()) FOR [created_at]
    ALTER TABLE [dbo].[carga_horaria] ADD  CONSTRAINT [df_carga_horaria_updated_at]  DEFAULT (getdate()) FOR [updated_at]
    END

    -- Tabla: rol_funcional
    IF OBJECT_ID(N'dbo.rol_funcional', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[rol_funcional](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[alcance_organizativo] [varchar](20) NOT NULL,
    	[es_jefatura] [bit] NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_rol_funcional] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_rol_funcional_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_rol_funcional_nombre] UNIQUE NONCLUSTERED 
    (
    	[nombre] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[rol_funcional] ADD  CONSTRAINT [df_rol_funcional_es_jefatura]  DEFAULT ((0)) FOR [es_jefatura]
    ALTER TABLE [dbo].[rol_funcional] ADD  CONSTRAINT [df_rol_funcional_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[rol_funcional] ADD  CONSTRAINT [df_rol_funcional_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[rol_funcional] ADD  CONSTRAINT [df_rol_funcional_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: personal
    IF OBJECT_ID(N'dbo.personal', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[personal](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo_personal] [varchar](30) NULL,
    	[nombres] [nvarchar](120) NOT NULL,
    	[apellido_paterno] [nvarchar](120) NOT NULL,
    	[apellido_materno] [nvarchar](120) NULL,
    	[documento_identidad] [varchar](30) NOT NULL,
    	[id_nivel_cargo] [bigint] NOT NULL,
    	[fecha_ingreso_institucion] [datetime] NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[id_extension_documento_identidad] [bigint] NULL,
     CONSTRAINT [pk_personal] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[personal] ADD  CONSTRAINT [df_personal_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[personal] ADD  CONSTRAINT [df_personal_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[personal] ADD  CONSTRAINT [df_personal_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: asignacion_personal
    IF OBJECT_ID(N'dbo.asignacion_personal', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[asignacion_personal](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_personal] [bigint] NOT NULL,
    	[id_servicio] [bigint] NULL,
    	[id_departamento] [bigint] NULL,
    	[id_tipo_contrato] [bigint] NOT NULL,
    	[id_rol_funcional] [bigint] NOT NULL,
    	[nro_item] [varchar](50) NULL,
    	[codigo_fuente_item] [varchar](30) NULL,
    	[tipo_asignacion] [varchar](30) NOT NULL,
    	[es_principal] [bit] NOT NULL,
    	[fecha_inicio] [datetime] NOT NULL,
    	[fecha_fin] [datetime] NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[id_carga_horaria] [bigint] NOT NULL,
     CONSTRAINT [pk_asignacion_personal] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[asignacion_personal] ADD  CONSTRAINT [df_asignacion_personal_es_principal]  DEFAULT ((0)) FOR [es_principal]
    ALTER TABLE [dbo].[asignacion_personal] ADD  CONSTRAINT [df_asignacion_personal_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[asignacion_personal] ADD  CONSTRAINT [df_asignacion_personal_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[asignacion_personal] ADD  CONSTRAINT [df_asignacion_personal_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    CREATE NONCLUSTERED INDEX [ix_asignacion_personal_departamento_rol_activo] ON [dbo].[asignacion_personal]
    (
    	[id_departamento] ASC,
    	[id_rol_funcional] ASC,
    	[activo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_asignacion_personal_id_carga_horaria] ON [dbo].[asignacion_personal]
    (
    	[id_carga_horaria] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_asignacion_personal_personal_activo_fechas] ON [dbo].[asignacion_personal]
    (
    	[id_personal] ASC,
    	[activo] ASC,
    	[fecha_inicio] ASC,
    	[fecha_fin] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_asignacion_personal_servicio_tipo_item_rol_activo] ON [dbo].[asignacion_personal]
    (
    	[id_servicio] ASC,
    	[id_tipo_contrato] ASC,
    	[id_rol_funcional] ASC,
    	[activo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uix_asignacion_personal_una_principal_activa] ON [dbo].[asignacion_personal]
    (
    	[id_personal] ASC
    )
    WHERE ([tipo_asignacion]='PRINCIPAL' AND [activo]=(1))
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_asignacion_personal_persona_ambito_inicio] ON [dbo].[asignacion_personal]
    (
    	[id_personal] ASC,
    	[id_servicio] ASC,
    	[id_departamento] ASC,
    	[fecha_inicio] ASC
    )
    WHERE ([activo]=(1))
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [ux_asignacion_personal_persona_principal_activa] ON [dbo].[asignacion_personal]
    (
    	[id_personal] ASC
    )
    WHERE ([activo]=(1) AND [es_principal]=(1))
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: historial_asignacion
    IF OBJECT_ID(N'dbo.historial_asignacion', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[historial_asignacion](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_asignacion_personal] [bigint] NOT NULL,
    	[fecha_evento] [datetime] NOT NULL,
    	[tipo_evento] [varchar](30) NOT NULL,
    	[id_servicio_origen] [bigint] NULL,
    	[id_servicio_destino] [bigint] NULL,
    	[id_departamento_origen] [bigint] NULL,
    	[id_departamento_destino] [bigint] NULL,
    	[id_usuario] [bigint] NOT NULL,
    	[motivo] [nvarchar](500) NULL,
    	[created_at] [datetime] NOT NULL,
    	[id_rol_funcional_origen] [bigint] NULL,
    	[id_rol_funcional_destino] [bigint] NULL,
     CONSTRAINT [pk_historial_asignacion] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[historial_asignacion] ADD  CONSTRAINT [df_historial_asignacion_fecha_evento]  DEFAULT (getutcdate()) FOR [fecha_evento]
    ALTER TABLE [dbo].[historial_asignacion] ADD  CONSTRAINT [df_historial_asignacion_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    CREATE NONCLUSTERED INDEX [ix_historial_asignacion_asignacion_fecha_evento] ON [dbo].[historial_asignacion]
    (
    	[id_asignacion_personal] ASC,
    	[fecha_evento] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Claves foraneas de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_personal_extension_documento_identidad' AND parent_object_id = OBJECT_ID('dbo.personal'))
    ALTER TABLE [dbo].[personal] WITH CHECK ADD CONSTRAINT [fk_personal_extension_documento_identidad] FOREIGN KEY([id_extension_documento_identidad])
    REFERENCES [dbo].[extension_documento_identidad] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_personal_nivel_cargo' AND parent_object_id = OBJECT_ID('dbo.personal'))
    ALTER TABLE [dbo].[personal] WITH CHECK ADD CONSTRAINT [fk_personal_nivel_cargo] FOREIGN KEY([id_nivel_cargo])
    REFERENCES [dbo].[nivel_cargo] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_carga_horaria' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_carga_horaria] FOREIGN KEY([id_carga_horaria])
    REFERENCES [dbo].[carga_horaria] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_departamento' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_departamento] FOREIGN KEY([id_departamento])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_personal' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_personal] FOREIGN KEY([id_personal])
    REFERENCES [dbo].[personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_rol_funcional' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_rol_funcional] FOREIGN KEY([id_rol_funcional])
    REFERENCES [dbo].[rol_funcional] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_servicio' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_servicio] FOREIGN KEY([id_servicio])
    REFERENCES [dbo].[servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_tipo_contrato' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_tipo_contrato] FOREIGN KEY([id_tipo_contrato])
    REFERENCES [dbo].[tipo_contrato] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_asignacion_personal_tipo_item' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal] WITH CHECK ADD CONSTRAINT [fk_asignacion_personal_tipo_item] FOREIGN KEY([id_tipo_contrato])
    REFERENCES [dbo].[tipo_contrato] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_asignacion_personal' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_asignacion_personal] FOREIGN KEY([id_asignacion_personal])
    REFERENCES [dbo].[asignacion_personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_departamento_destino' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_departamento_destino] FOREIGN KEY([id_departamento_destino])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_departamento_origen' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_departamento_origen] FOREIGN KEY([id_departamento_origen])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_rol_funcional_destino' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_rol_funcional_destino] FOREIGN KEY([id_rol_funcional_destino])
    REFERENCES [dbo].[rol_funcional] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_rol_funcional_origen' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_rol_funcional_origen] FOREIGN KEY([id_rol_funcional_origen])
    REFERENCES [dbo].[rol_funcional] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_servicio_destino' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_servicio_destino] FOREIGN KEY([id_servicio_destino])
    REFERENCES [dbo].[servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_servicio_origen' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_servicio_origen] FOREIGN KEY([id_servicio_origen])
    REFERENCES [dbo].[servicio] ([id])

    -- Check constraints de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_funcional_alcance_organizativo' AND parent_object_id = OBJECT_ID('dbo.rol_funcional'))
    ALTER TABLE [dbo].[rol_funcional]  WITH CHECK ADD  CONSTRAINT [ck_rol_funcional_alcance_organizativo] CHECK  (([alcance_organizativo]='DEPARTAMENTO' OR [alcance_organizativo]='SERVICIO' OR [alcance_organizativo]='NINGUNO'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_asignacion_personal_ambito' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal]  WITH CHECK ADD  CONSTRAINT [ck_asignacion_personal_ambito] CHECK  (([id_servicio] IS NOT NULL OR [id_departamento] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_asignacion_personal_fechas' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal]  WITH CHECK ADD  CONSTRAINT [ck_asignacion_personal_fechas] CHECK  (([fecha_fin] IS NULL OR [fecha_fin]>=[fecha_inicio]))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_asignacion_personal_tipo' AND parent_object_id = OBJECT_ID('dbo.asignacion_personal'))
    ALTER TABLE [dbo].[asignacion_personal]  WITH CHECK ADD  CONSTRAINT [ck_asignacion_personal_tipo] CHECK  (([tipo_asignacion]='SECUNDARIA' OR [tipo_asignacion]='PRINCIPAL'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_historial_asignacion_tipo_evento' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion]  WITH CHECK ADD  CONSTRAINT [ck_historial_asignacion_tipo_evento] CHECK  (([tipo_evento]='REACTIVACION' OR [tipo_evento]='CIERRE' OR [tipo_evento]='TRASLADO' OR [tipo_evento]='ACTUALIZACION' OR [tipo_evento]='ALTA'))

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 002 aplicada: baseline de personal (8 tablas).'

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
