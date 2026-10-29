SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '004'
SET @migration_name    = '004_baseline_operacion.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 004.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 004 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Tabla: turno
    IF OBJECT_ID(N'dbo.turno', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[turno](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_servicio] [bigint] NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[hora_inicio] [char](5) NOT NULL,
    	[hora_fin] [char](5) NOT NULL,
    	[cruza_medianoche] [bit] NOT NULL,
    	[duracion_horas] [decimal](5, 2) NOT NULL,
    	[vigencia_desde] [datetime] NOT NULL,
    	[vigencia_hasta] [datetime] NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[tipo_horario] [varchar](20) NOT NULL,
    	[id_departamento] [bigint] NULL,
     CONSTRAINT [pk_turno] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[turno] ADD  CONSTRAINT [df_turno_cruza_medianoche]  DEFAULT ((0)) FOR [cruza_medianoche]
    ALTER TABLE [dbo].[turno] ADD  CONSTRAINT [df_turno_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[turno] ADD  CONSTRAINT [df_turno_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[turno] ADD  CONSTRAINT [df_turno_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    ALTER TABLE [dbo].[turno] ADD  DEFAULT ('CONTINUO') FOR [tipo_horario]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_turno_departamento_codigo_vigencia] ON [dbo].[turno]
    (
    	[id_departamento] ASC,
    	[codigo] ASC,
    	[vigencia_desde] ASC
    )
    WHERE ([id_departamento] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_turno_servicio_codigo_vigencia] ON [dbo].[turno]
    (
    	[id_servicio] ASC,
    	[codigo] ASC,
    	[vigencia_desde] ASC
    )
    WHERE ([id_servicio] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: turno_tramo
    IF OBJECT_ID(N'dbo.turno_tramo', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[turno_tramo](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_turno] [bigint] NOT NULL,
    	[orden] [smallint] NOT NULL,
    	[hora_inicio] [char](5) NOT NULL,
    	[hora_fin] [char](5) NOT NULL,
    	[duracion_horas] [decimal](5, 2) NOT NULL,
    	[cruza_medianoche] [bit] NOT NULL,
    	[activo] [bit] NOT NULL,
     CONSTRAINT [pk_turno_tramo] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_turno_tramo_orden] UNIQUE NONCLUSTERED 
    (
    	[id_turno] ASC,
    	[orden] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[turno_tramo] ADD  DEFAULT ((0)) FOR [cruza_medianoche]
    ALTER TABLE [dbo].[turno_tramo] ADD  DEFAULT ((1)) FOR [activo]
    CREATE NONCLUSTERED INDEX [ix_turno_tramo_id_turno] ON [dbo].[turno_tramo]
    (
    	[id_turno] ASC
    )
    INCLUDE ( 	[orden],
    	[hora_inicio],
    	[hora_fin],
    	[duracion_horas],
    	[cruza_medianoche],
    	[activo]) WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: incidencia_personal
    IF OBJECT_ID(N'dbo.incidencia_personal', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[incidencia_personal](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[alcance] [varchar](20) NOT NULL,
    	[es_laborable] [bit] NOT NULL,
    	[genera_horas_trabajadas] [bit] NOT NULL,
    	[computa_para_meta_horas] [bit] NOT NULL,
    	[requiere_respaldo] [bit] NOT NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[codigo_exportacion_etiqueta] [varchar](30) NULL,
    	[codigo_exportacion_numerico] [varchar](30) NULL,
     CONSTRAINT [pk_tipo_dia] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_tipo_dia_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_alcance]  DEFAULT ('PERSONAL') FOR [alcance]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_es_laborable]  DEFAULT ((0)) FOR [es_laborable]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_genera_horas_trabajadas]  DEFAULT ((0)) FOR [genera_horas_trabajadas]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_computa_para_meta_horas]  DEFAULT ((0)) FOR [computa_para_meta_horas]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_requiere_respaldo]  DEFAULT ((0)) FOR [requiere_respaldo]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[incidencia_personal] ADD  CONSTRAINT [df_tipo_dia_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    END

    -- Tabla: configuracion_operativa_servicio
    IF OBJECT_ID(N'dbo.configuracion_operativa_servicio', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[configuracion_operativa_servicio](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_servicio] [bigint] NULL,
    	[modo_visual_default] [varchar](30) NOT NULL,
    	[permite_multi_registro_dia] [bit] NOT NULL,
    	[usa_equivalencia_horaria_exportacion] [bit] NOT NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[id_departamento] [bigint] NULL,
     CONSTRAINT [pk_configuracion_operativa_servicio] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[configuracion_operativa_servicio] ADD  CONSTRAINT [df_configuracion_operativa_servicio_permite_multi_registro_dia]  DEFAULT ((1)) FOR [permite_multi_registro_dia]
    ALTER TABLE [dbo].[configuracion_operativa_servicio] ADD  CONSTRAINT [df_configuracion_operativa_servicio_usa_eq_horaria_export]  DEFAULT ((1)) FOR [usa_equivalencia_horaria_exportacion]
    ALTER TABLE [dbo].[configuracion_operativa_servicio] ADD  CONSTRAINT [df_configuracion_operativa_servicio_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[configuracion_operativa_servicio] ADD  CONSTRAINT [df_configuracion_operativa_servicio_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[configuracion_operativa_servicio] ADD  CONSTRAINT [df_configuracion_operativa_servicio_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_configuracion_operativa_servicio_id_departamento] ON [dbo].[configuracion_operativa_servicio]
    (
    	[id_departamento] ASC
    )
    WHERE ([id_departamento] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_configuracion_operativa_servicio_id_servicio] ON [dbo].[configuracion_operativa_servicio]
    (
    	[id_servicio] ASC
    )
    WHERE ([id_servicio] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: codigo_operativo_servicio
    IF OBJECT_ID(N'dbo.codigo_operativo_servicio', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[codigo_operativo_servicio](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_configuracion_operativa_servicio] [bigint] NOT NULL,
    	[origen] [varchar](30) NOT NULL,
    	[id_turno] [bigint] NULL,
    	[id_incidencia_personal] [bigint] NULL,
    	[codigo_visual] [varchar](30) NOT NULL,
    	[etiqueta] [nvarchar](120) NOT NULL,
    	[descripcion] [nvarchar](250) NULL,
    	[horas_equivalentes] [decimal](5, 2) NOT NULL,
    	[categoria] [varchar](30) NOT NULL,
    	[color] [varchar](30) NULL,
    	[orden_visual] [int] NOT NULL,
    	[es_laborable] [bit] NOT NULL,
    	[requiere_confirmacion] [bit] NOT NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_codigo_operativo_servicio] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_horas_equivalentes]  DEFAULT ((0)) FOR [horas_equivalentes]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_orden_visual]  DEFAULT ((0)) FOR [orden_visual]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_es_laborable]  DEFAULT ((1)) FOR [es_laborable]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_requiere_confirmacion]  DEFAULT ((0)) FOR [requiere_confirmacion]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[codigo_operativo_servicio] ADD  CONSTRAINT [df_codigo_operativo_servicio_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    CREATE NONCLUSTERED INDEX [ix_codigo_operativo_servicio_configuracion_orden] ON [dbo].[codigo_operativo_servicio]
    (
    	[id_configuracion_operativa_servicio] ASC,
    	[activo] ASC,
    	[orden_visual] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_codigo_operativo_servicio_config_origen_ref] ON [dbo].[codigo_operativo_servicio]
    (
    	[id_configuracion_operativa_servicio] ASC,
    	[origen] ASC,
    	[id_turno] ASC,
    	[id_incidencia_personal] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Claves foraneas de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_turno_departamento' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno] WITH CHECK ADD CONSTRAINT [fk_turno_departamento] FOREIGN KEY([id_departamento])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_turno_servicio' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno] WITH CHECK ADD CONSTRAINT [fk_turno_servicio] FOREIGN KEY([id_servicio])
    REFERENCES [dbo].[servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_turno_tramo_turno' AND parent_object_id = OBJECT_ID('dbo.turno_tramo'))
    ALTER TABLE [dbo].[turno_tramo] WITH CHECK ADD CONSTRAINT [fk_turno_tramo_turno] FOREIGN KEY([id_turno])
    REFERENCES [dbo].[turno] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_configuracion_operativa_servicio_departamento' AND parent_object_id = OBJECT_ID('dbo.configuracion_operativa_servicio'))
    ALTER TABLE [dbo].[configuracion_operativa_servicio] WITH CHECK ADD CONSTRAINT [fk_configuracion_operativa_servicio_departamento] FOREIGN KEY([id_departamento])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_configuracion_operativa_servicio_servicio' AND parent_object_id = OBJECT_ID('dbo.configuracion_operativa_servicio'))
    ALTER TABLE [dbo].[configuracion_operativa_servicio] WITH CHECK ADD CONSTRAINT [fk_configuracion_operativa_servicio_servicio] FOREIGN KEY([id_servicio])
    REFERENCES [dbo].[servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_codigo_operativo_servicio_configuracion' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio] WITH CHECK ADD CONSTRAINT [fk_codigo_operativo_servicio_configuracion] FOREIGN KEY([id_configuracion_operativa_servicio])
    REFERENCES [dbo].[configuracion_operativa_servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_codigo_operativo_servicio_tipo_dia' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio] WITH CHECK ADD CONSTRAINT [fk_codigo_operativo_servicio_tipo_dia] FOREIGN KEY([id_incidencia_personal])
    REFERENCES [dbo].[incidencia_personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_codigo_operativo_servicio_turno' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio] WITH CHECK ADD CONSTRAINT [fk_codigo_operativo_servicio_turno] FOREIGN KEY([id_turno])
    REFERENCES [dbo].[turno] ([id])

    -- Check constraints de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_turno_duracion_horas' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno]  WITH CHECK ADD  CONSTRAINT [ck_turno_duracion_horas] CHECK  (([duracion_horas]>(0)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_turno_hora_fin' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno]  WITH CHECK ADD  CONSTRAINT [ck_turno_hora_fin] CHECK  (([hora_fin] like '[0-1][0-9]:[0-5][0-9]' OR [hora_fin] like '2[0-3]:[0-5][0-9]'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_turno_hora_inicio' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno]  WITH CHECK ADD  CONSTRAINT [ck_turno_hora_inicio] CHECK  (([hora_inicio] like '[0-1][0-9]:[0-5][0-9]' OR [hora_inicio] like '2[0-3]:[0-5][0-9]'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_turno_scope_xor' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno]  WITH CHECK ADD  CONSTRAINT [ck_turno_scope_xor] CHECK  (([id_servicio] IS NOT NULL AND [id_departamento] IS NULL OR [id_servicio] IS NULL AND [id_departamento] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_turno_tipo_horario' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno]  WITH CHECK ADD  CONSTRAINT [ck_turno_tipo_horario] CHECK  (([tipo_horario]='DISCONTINUO' OR [tipo_horario]='CONTINUO'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_turno_vigencia' AND parent_object_id = OBJECT_ID('dbo.turno'))
    ALTER TABLE [dbo].[turno]  WITH CHECK ADD  CONSTRAINT [ck_turno_vigencia] CHECK  (([vigencia_hasta] IS NULL OR [vigencia_hasta]>=[vigencia_desde]))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_tipo_dia_alcance' AND parent_object_id = OBJECT_ID('dbo.incidencia_personal'))
    ALTER TABLE [dbo].[incidencia_personal]  WITH CHECK ADD  CONSTRAINT [ck_tipo_dia_alcance] CHECK  (([alcance]='OTRO' OR [alcance]='PERSONAL' OR [alcance]='GENERAL'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_configuracion_operativa_servicio_modo_visual' AND parent_object_id = OBJECT_ID('dbo.configuracion_operativa_servicio'))
    ALTER TABLE [dbo].[configuracion_operativa_servicio]  WITH CHECK ADD  CONSTRAINT [ck_configuracion_operativa_servicio_modo_visual] CHECK  (([modo_visual_default]='NUMERICO' OR [modo_visual_default]='ETIQUETAS'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_configuracion_operativa_servicio_scope' AND parent_object_id = OBJECT_ID('dbo.configuracion_operativa_servicio'))
    ALTER TABLE [dbo].[configuracion_operativa_servicio]  WITH CHECK ADD  CONSTRAINT [ck_configuracion_operativa_servicio_scope] CHECK  (([id_servicio] IS NOT NULL AND [id_departamento] IS NULL OR [id_servicio] IS NULL AND [id_departamento] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_codigo_operativo_servicio_categoria' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio]  WITH CHECK ADD  CONSTRAINT [ck_codigo_operativo_servicio_categoria] CHECK  (([categoria]='FERIADO' OR [categoria]='VACACION' OR [categoria]='LICENCIA' OR [categoria]='DESCANSO' OR [categoria]='TRABAJO'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_codigo_operativo_servicio_exclusion' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio]  WITH CHECK ADD  CONSTRAINT [ck_codigo_operativo_servicio_exclusion] CHECK  (([origen]='TURNO' AND [id_turno] IS NOT NULL AND [id_incidencia_personal] IS NULL OR [origen]='TIPO_DIA' AND [id_turno] IS NULL AND [id_incidencia_personal] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_codigo_operativo_servicio_horas_equivalentes' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio]  WITH CHECK ADD  CONSTRAINT [ck_codigo_operativo_servicio_horas_equivalentes] CHECK  (([horas_equivalentes]>=(0)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_codigo_operativo_servicio_origen' AND parent_object_id = OBJECT_ID('dbo.codigo_operativo_servicio'))
    ALTER TABLE [dbo].[codigo_operativo_servicio]  WITH CHECK ADD  CONSTRAINT [ck_codigo_operativo_servicio_origen] CHECK  (([origen]='TIPO_DIA' OR [origen]='TURNO'))

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 004 aplicada: baseline de operacion (5 tablas).'

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
