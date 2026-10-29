SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '005'
SET @migration_name    = '005_baseline_planificacion.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 005.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 005 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Tabla: calendario
    IF OBJECT_ID(N'dbo.calendario', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[calendario](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[fecha] [datetime] NOT NULL,
    	[anio] [smallint] NOT NULL,
    	[mes] [smallint] NOT NULL,
    	[dia_mes] [smallint] NOT NULL,
    	[dia_semana_num] [smallint] NOT NULL,
    	[dia_semana_nombre] [nvarchar](20) NOT NULL,
    	[semana_mes] [smallint] NULL,
    	[es_fin_semana] [bit] NOT NULL,
    	[codigo_feriado] [nvarchar](4) NULL,
     CONSTRAINT [pk_calendario] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_calendario_fecha] UNIQUE NONCLUSTERED 
    (
    	[fecha] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[calendario] ADD  CONSTRAINT [df_calendario_es_fin_semana]  DEFAULT ((0)) FOR [es_fin_semana]
    CREATE NONCLUSTERED INDEX [ix_calendario_anio_mes] ON [dbo].[calendario]
    (
    	[anio] ASC,
    	[mes] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: tipo_feriado
    IF OBJECT_ID(N'dbo.tipo_feriado', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[tipo_feriado](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [nvarchar](4) NOT NULL,
    	[nombre] [nvarchar](80) NOT NULL,
    	[descripcion] [nvarchar](200) NULL,
    	[orden] [smallint] NOT NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime2](7) NOT NULL,
    	[updated_at] [datetime2](7) NOT NULL,
     CONSTRAINT [pk_tipo_feriado] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_tipo_feriado_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[tipo_feriado] ADD  CONSTRAINT [df_tipo_feriado_orden]  DEFAULT ((1)) FOR [orden]
    ALTER TABLE [dbo].[tipo_feriado] ADD  CONSTRAINT [df_tipo_feriado_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[tipo_feriado] ADD  CONSTRAINT [df_tipo_feriado_created_at]  DEFAULT (sysutcdatetime()) FOR [created_at]
    ALTER TABLE [dbo].[tipo_feriado] ADD  CONSTRAINT [df_tipo_feriado_updated_at]  DEFAULT (sysutcdatetime()) FOR [updated_at]
    END

    -- Tabla: feriado
    IF OBJECT_ID(N'dbo.feriado', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[feriado](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_tipo_feriado] [bigint] NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[anio] [smallint] NOT NULL,
    	[mes] [smallint] NOT NULL,
    	[fecha_inicio] [date] NOT NULL,
    	[fecha_fin] [date] NOT NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime2](7) NOT NULL,
    	[updated_at] [datetime2](7) NOT NULL,
     CONSTRAINT [pk_feriado] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[feriado] ADD  CONSTRAINT [df_feriado_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[feriado] ADD  CONSTRAINT [df_feriado_created_at]  DEFAULT (sysutcdatetime()) FOR [created_at]
    ALTER TABLE [dbo].[feriado] ADD  CONSTRAINT [df_feriado_updated_at]  DEFAULT (sysutcdatetime()) FOR [updated_at]
    CREATE NONCLUSTERED INDEX [ix_feriado_anio_mes] ON [dbo].[feriado]
    (
    	[anio] ASC,
    	[mes] ASC
    )
    WHERE ([activo]=(1))
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_feriado_id_tipo_feriado] ON [dbo].[feriado]
    (
    	[id_tipo_feriado] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: planificacion
    IF OBJECT_ID(N'dbo.planificacion', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[planificacion](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_servicio] [bigint] NULL,
    	[anio] [smallint] NOT NULL,
    	[mes] [smallint] NOT NULL,
    	[version] [int] NOT NULL,
    	[estado] [varchar](20) NOT NULL,
    	[fecha_inicio] [datetime] NOT NULL,
    	[fecha_fin] [datetime] NOT NULL,
    	[id_usuario_creador] [bigint] NOT NULL,
    	[id_usuario_publicador] [bigint] NULL,
    	[fecha_publicacion] [datetime] NULL,
    	[id_usuario_cierre] [bigint] NULL,
    	[fecha_cierre] [datetime] NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[activo] [bit] NOT NULL,
    	[id_departamento] [bigint] NULL,
    	[origen_cierre] [varchar](20) NULL,
     CONSTRAINT [pk_planificacion] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[planificacion] ADD  CONSTRAINT [df_planificacion_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[planificacion] ADD  CONSTRAINT [df_planificacion_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    ALTER TABLE [dbo].[planificacion] ADD  CONSTRAINT [df_planificacion_activo]  DEFAULT ((1)) FOR [activo]
    CREATE NONCLUSTERED INDEX [ix_planificacion_departamento_periodo] ON [dbo].[planificacion]
    (
    	[id_departamento] ASC,
    	[anio] ASC,
    	[mes] ASC
    )
    WHERE ([id_departamento] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_planificacion_servicio_anio_mes_estado] ON [dbo].[planificacion]
    (
    	[id_servicio] ASC,
    	[anio] ASC,
    	[mes] ASC,
    	[estado] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_planificacion_departamento_periodo_version] ON [dbo].[planificacion]
    (
    	[id_departamento] ASC,
    	[anio] ASC,
    	[mes] ASC,
    	[version] ASC
    )
    WHERE ([id_departamento] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [uq_planificacion_servicio_familia_periodo_version] ON [dbo].[planificacion]
    (
    	[id_servicio] ASC,
    	[anio] ASC,
    	[mes] ASC,
    	[version] ASC
    )
    WHERE ([id_servicio] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [ux_planificacion_departamento_anio_mes_activa] ON [dbo].[planificacion]
    (
    	[id_departamento] ASC,
    	[anio] ASC,
    	[mes] ASC
    )
    WHERE ([activo]=(1) AND [id_departamento] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [ux_planificacion_servicio_anio_mes_activa] ON [dbo].[planificacion]
    (
    	[id_servicio] ASC,
    	[anio] ASC,
    	[mes] ASC
    )
    WHERE ([activo]=(1) AND [id_servicio] IS NOT NULL)
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: planificacion_historial
    IF OBJECT_ID(N'dbo.planificacion_historial', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[planificacion_historial](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_planificacion] [bigint] NOT NULL,
    	[anio] [smallint] NOT NULL,
    	[mes] [smallint] NOT NULL,
    	[version] [int] NOT NULL,
    	[id_servicio] [bigint] NULL,
    	[codigo_servicio] [varchar](30) NULL,
    	[nombre_servicio] [nvarchar](120) NULL,
    	[id_departamento] [bigint] NULL,
    	[codigo_departamento] [varchar](30) NULL,
    	[nombre_departamento] [nvarchar](120) NULL,
    	[estado_final] [varchar](20) NOT NULL,
    	[origen_cierre] [varchar](20) NOT NULL,
    	[id_usuario_cierre] [bigint] NULL,
    	[fecha_cierre] [datetime] NOT NULL,
    	[created_at] [datetime] NOT NULL,
     CONSTRAINT [pk_planificacion_historial] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_planificacion_historial_planificacion] UNIQUE NONCLUSTERED 
    (
    	[id_planificacion] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[planificacion_historial] ADD  CONSTRAINT [df_planificacion_historial_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    CREATE NONCLUSTERED INDEX [ix_planificacion_historial_departamento_periodo] ON [dbo].[planificacion_historial]
    (
    	[id_departamento] ASC,
    	[anio] ASC,
    	[mes] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_planificacion_historial_servicio_periodo] ON [dbo].[planificacion_historial]
    (
    	[id_servicio] ASC,
    	[anio] ASC,
    	[mes] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: planificacion_sesion_edicion
    IF OBJECT_ID(N'dbo.planificacion_sesion_edicion', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[planificacion_sesion_edicion](
    	[id_planificacion] [bigint] NOT NULL,
    	[id_usuario_editor] [bigint] NOT NULL,
    	[adquirido_en] [datetime] NOT NULL,
    	[ultimo_latido] [datetime] NOT NULL,
     CONSTRAINT [pk_planificacion_sesion_edicion] PRIMARY KEY CLUSTERED 
    (
    	[id_planificacion] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[planificacion_sesion_edicion] ADD  CONSTRAINT [df_planificacion_sesion_edicion_adquirido_en]  DEFAULT (getutcdate()) FOR [adquirido_en]
    ALTER TABLE [dbo].[planificacion_sesion_edicion] ADD  CONSTRAINT [df_planificacion_sesion_edicion_ultimo_latido]  DEFAULT (getutcdate()) FOR [ultimo_latido]
    END

    -- Tabla: rol_turno
    IF OBJECT_ID(N'dbo.rol_turno', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[rol_turno](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_planificacion] [bigint] NOT NULL,
    	[id_asignacion_personal] [bigint] NOT NULL,
    	[id_calendario] [bigint] NOT NULL,
    	[secuencia_dia] [smallint] NOT NULL,
    	[id_turno] [bigint] NULL,
    	[id_incidencia_personal] [bigint] NULL,
    	[horas_programadas] [decimal](5, 2) NOT NULL,
    	[origen_registro] [varchar](20) NOT NULL,
    	[created_by] [bigint] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_by] [bigint] NULL,
    	[updated_at] [datetime] NULL,
     CONSTRAINT [pk_rol_turno] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_rol_turno_planificacion_asignacion_dia_sec] UNIQUE NONCLUSTERED 
    (
    	[id_planificacion] ASC,
    	[id_asignacion_personal] ASC,
    	[id_calendario] ASC,
    	[secuencia_dia] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[rol_turno] ADD  CONSTRAINT [df_rol_turno_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_asignacion_calendario] ON [dbo].[rol_turno]
    (
    	[id_asignacion_personal] ASC,
    	[id_calendario] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_id_tipo_dia] ON [dbo].[rol_turno]
    (
    	[id_incidencia_personal] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_id_turno] ON [dbo].[rol_turno]
    (
    	[id_turno] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_planificacion_calendario] ON [dbo].[rol_turno]
    (
    	[id_planificacion] ASC,
    	[id_calendario] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: rol_turno_historial
    IF OBJECT_ID(N'dbo.rol_turno_historial', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[rol_turno_historial](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_planificacion_historial] [bigint] NOT NULL,
    	[id_rol_turno] [bigint] NULL,
    	[id_personal] [bigint] NULL,
    	[nombre_completo_personal] [nvarchar](300) NOT NULL,
    	[codigo_personal] [varchar](30) NULL,
    	[codigo_rol_funcional] [varchar](30) NULL,
    	[nombre_rol_funcional] [nvarchar](120) NULL,
    	[fecha] [datetime] NOT NULL,
    	[secuencia_dia] [smallint] NOT NULL,
    	[tipo_registro] [varchar](20) NOT NULL,
    	[codigo_turno] [varchar](30) NULL,
    	[nombre_turno] [nvarchar](120) NULL,
    	[hora_inicio] [char](5) NULL,
    	[hora_fin] [char](5) NULL,
    	[cruza_medianoche] [bit] NULL,
    	[tramos_json] [nvarchar](max) NULL,
    	[codigo_incidencia_personal] [varchar](30) NULL,
    	[nombre_incidencia_personal] [nvarchar](120) NULL,
    	[codigo_visual] [varchar](30) NULL,
    	[etiqueta_visual] [nvarchar](120) NULL,
    	[horas_programadas] [decimal](5, 2) NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[id_asignacion_personal] [bigint] NULL,
    	[id_calendario] [bigint] NULL,
    	[nro_item] [varchar](50) NULL,
    	[codigo_carga_horaria] [varchar](30) NULL,
    	[nombre_carga_horaria] [nvarchar](120) NULL,
    	[horas_dia_base] [decimal](5, 2) NULL,
    	[documento_identidad] [varchar](30) NULL,
    	[codigo_tipo_contrato] [varchar](30) NULL,
    	[nombre_tipo_contrato] [nvarchar](120) NULL,
    	[codigo_fuente_item] [varchar](30) NULL,
    	[cargo_actual] [nvarchar](120) NULL,
    	[es_jefatura] [bit] NULL,
    	[servicio_codigo] [varchar](30) NULL,
    	[servicio_nombre] [nvarchar](120) NULL,
    	[id_turno] [bigint] NULL,
    	[id_incidencia_personal] [bigint] NULL,
    	[nombres] [nvarchar](120) NULL,
    	[apellido_paterno] [nvarchar](120) NULL,
    	[apellido_materno] [nvarchar](120) NULL,
     CONSTRAINT [pk_rol_turno_historial] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_historial_personal_fecha] ON [dbo].[rol_turno_historial]
    (
    	[id_personal] ASC,
    	[fecha] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_historial_planificacion_historial] ON [dbo].[rol_turno_historial]
    (
    	[id_planificacion_historial] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_rol_turno_historial_servicio_fecha] ON [dbo].[rol_turno_historial]
    (
    	[servicio_codigo] ASC,
    	[fecha] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: observacion_mensual
    IF OBJECT_ID(N'dbo.observacion_mensual', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[observacion_mensual](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_planificacion] [bigint] NOT NULL,
    	[id_asignacion_personal] [bigint] NOT NULL,
    	[tipo_observacion] [varchar](30) NOT NULL,
    	[descripcion] [nvarchar](1000) NOT NULL,
    	[created_by] [bigint] NOT NULL,
    	[created_at] [datetime] NOT NULL,
     CONSTRAINT [pk_observacion_mensual] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[observacion_mensual] ADD  CONSTRAINT [df_observacion_mensual_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    CREATE NONCLUSTERED INDEX [ix_observacion_mensual_planificacion_asignacion] ON [dbo].[observacion_mensual]
    (
    	[id_planificacion] ASC,
    	[id_asignacion_personal] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: observacion_historial
    IF OBJECT_ID(N'dbo.observacion_historial', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[observacion_historial](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_planificacion_historial] [bigint] NOT NULL,
    	[nombre_completo_personal] [nvarchar](300) NOT NULL,
    	[fecha] [datetime] NULL,
    	[tipo_observacion] [varchar](30) NOT NULL,
    	[descripcion] [nvarchar](1000) NOT NULL,
    	[nombre_usuario_creador] [nvarchar](300) NULL,
    	[created_at] [datetime] NOT NULL,
    	[id_asignacion_personal] [bigint] NULL,
    	[id_calendario] [bigint] NULL,
     CONSTRAINT [pk_observacion_historial] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_observacion_historial_planificacion_historial] ON [dbo].[observacion_historial]
    (
    	[id_planificacion_historial] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: observacion_mensual_historial
    IF OBJECT_ID(N'dbo.observacion_mensual_historial', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[observacion_mensual_historial](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_planificacion_historial] [bigint] NOT NULL,
    	[nombre_completo_personal] [nvarchar](300) NOT NULL,
    	[tipo_observacion] [varchar](30) NOT NULL,
    	[descripcion] [nvarchar](1000) NOT NULL,
    	[nombre_usuario_creador] [nvarchar](300) NULL,
    	[created_at] [datetime] NOT NULL,
    	[id_asignacion_personal] [bigint] NULL,
     CONSTRAINT [pk_observacion_mensual_historial] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    CREATE NONCLUSTERED INDEX [ix_observacion_mensual_historial_planificacion_historial] ON [dbo].[observacion_mensual_historial]
    (
    	[id_planificacion_historial] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Claves foraneas de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_feriado_tipo_feriado' AND parent_object_id = OBJECT_ID('dbo.feriado'))
    ALTER TABLE [dbo].[feriado] WITH CHECK ADD CONSTRAINT [fk_feriado_tipo_feriado] FOREIGN KEY([id_tipo_feriado])
    REFERENCES [dbo].[tipo_feriado] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_departamento' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion] WITH CHECK ADD CONSTRAINT [fk_planificacion_departamento] FOREIGN KEY([id_departamento])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_servicio' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion] WITH CHECK ADD CONSTRAINT [fk_planificacion_servicio] FOREIGN KEY([id_servicio])
    REFERENCES [dbo].[servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_usuario_cierre' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion] WITH CHECK ADD CONSTRAINT [fk_planificacion_usuario_cierre] FOREIGN KEY([id_usuario_cierre])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_usuario_creador' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion] WITH CHECK ADD CONSTRAINT [fk_planificacion_usuario_creador] FOREIGN KEY([id_usuario_creador])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_usuario_publicador' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion] WITH CHECK ADD CONSTRAINT [fk_planificacion_usuario_publicador] FOREIGN KEY([id_usuario_publicador])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_historial_departamento' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial] WITH CHECK ADD CONSTRAINT [fk_planificacion_historial_departamento] FOREIGN KEY([id_departamento])
    REFERENCES [dbo].[departamento] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_historial_planificacion' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial] WITH CHECK ADD CONSTRAINT [fk_planificacion_historial_planificacion] FOREIGN KEY([id_planificacion])
    REFERENCES [dbo].[planificacion] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_historial_servicio' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial] WITH CHECK ADD CONSTRAINT [fk_planificacion_historial_servicio] FOREIGN KEY([id_servicio])
    REFERENCES [dbo].[servicio] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_historial_usuario_cierre' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial] WITH CHECK ADD CONSTRAINT [fk_planificacion_historial_usuario_cierre] FOREIGN KEY([id_usuario_cierre])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_sesion_edicion_planificacion' AND parent_object_id = OBJECT_ID('dbo.planificacion_sesion_edicion'))
    ALTER TABLE [dbo].[planificacion_sesion_edicion] WITH CHECK ADD CONSTRAINT [fk_planificacion_sesion_edicion_planificacion] FOREIGN KEY([id_planificacion])
    REFERENCES [dbo].[planificacion] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_planificacion_sesion_edicion_usuario' AND parent_object_id = OBJECT_ID('dbo.planificacion_sesion_edicion'))
    ALTER TABLE [dbo].[planificacion_sesion_edicion] WITH CHECK ADD CONSTRAINT [fk_planificacion_sesion_edicion_usuario] FOREIGN KEY([id_usuario_editor])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_asignacion_personal' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_asignacion_personal] FOREIGN KEY([id_asignacion_personal])
    REFERENCES [dbo].[asignacion_personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_calendario' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_calendario] FOREIGN KEY([id_calendario])
    REFERENCES [dbo].[calendario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_created_by' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_created_by] FOREIGN KEY([created_by])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_planificacion' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_planificacion] FOREIGN KEY([id_planificacion])
    REFERENCES [dbo].[planificacion] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_tipo_dia' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_tipo_dia] FOREIGN KEY([id_incidencia_personal])
    REFERENCES [dbo].[incidencia_personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_turno' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_turno] FOREIGN KEY([id_turno])
    REFERENCES [dbo].[turno] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_updated_by' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno] WITH CHECK ADD CONSTRAINT [fk_rol_turno_updated_by] FOREIGN KEY([updated_by])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_rol_turno_historial_planificacion_historial' AND parent_object_id = OBJECT_ID('dbo.rol_turno_historial'))
    ALTER TABLE [dbo].[rol_turno_historial] WITH CHECK ADD CONSTRAINT [fk_rol_turno_historial_planificacion_historial] FOREIGN KEY([id_planificacion_historial])
    REFERENCES [dbo].[planificacion_historial] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_observacion_mensual_asignacion_personal' AND parent_object_id = OBJECT_ID('dbo.observacion_mensual'))
    ALTER TABLE [dbo].[observacion_mensual] WITH CHECK ADD CONSTRAINT [fk_observacion_mensual_asignacion_personal] FOREIGN KEY([id_asignacion_personal])
    REFERENCES [dbo].[asignacion_personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_observacion_mensual_created_by' AND parent_object_id = OBJECT_ID('dbo.observacion_mensual'))
    ALTER TABLE [dbo].[observacion_mensual] WITH CHECK ADD CONSTRAINT [fk_observacion_mensual_created_by] FOREIGN KEY([created_by])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_observacion_mensual_planificacion' AND parent_object_id = OBJECT_ID('dbo.observacion_mensual'))
    ALTER TABLE [dbo].[observacion_mensual] WITH CHECK ADD CONSTRAINT [fk_observacion_mensual_planificacion] FOREIGN KEY([id_planificacion])
    REFERENCES [dbo].[planificacion] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_observacion_historial_planificacion_historial' AND parent_object_id = OBJECT_ID('dbo.observacion_historial'))
    ALTER TABLE [dbo].[observacion_historial] WITH CHECK ADD CONSTRAINT [fk_observacion_historial_planificacion_historial] FOREIGN KEY([id_planificacion_historial])
    REFERENCES [dbo].[planificacion_historial] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_observacion_mensual_historial_planificacion_historial' AND parent_object_id = OBJECT_ID('dbo.observacion_mensual_historial'))
    ALTER TABLE [dbo].[observacion_mensual_historial] WITH CHECK ADD CONSTRAINT [fk_observacion_mensual_historial_planificacion_historial] FOREIGN KEY([id_planificacion_historial])
    REFERENCES [dbo].[planificacion_historial] ([id])

    -- Check constraints de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_calendario_codigo_feriado' AND parent_object_id = OBJECT_ID('dbo.calendario'))
    ALTER TABLE [dbo].[calendario]  WITH CHECK ADD  CONSTRAINT [ck_calendario_codigo_feriado] CHECK  (([codigo_feriado] IS NULL OR ([codigo_feriado]='FI' OR [codigo_feriado]='FR' OR [codigo_feriado]='FN' OR [codigo_feriado]='F')))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_calendario_dia_mes' AND parent_object_id = OBJECT_ID('dbo.calendario'))
    ALTER TABLE [dbo].[calendario]  WITH CHECK ADD  CONSTRAINT [ck_calendario_dia_mes] CHECK  (([dia_mes]>=(1) AND [dia_mes]<=(31)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_calendario_dia_semana' AND parent_object_id = OBJECT_ID('dbo.calendario'))
    ALTER TABLE [dbo].[calendario]  WITH CHECK ADD  CONSTRAINT [ck_calendario_dia_semana] CHECK  (([dia_semana_num]>=(1) AND [dia_semana_num]<=(7)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_calendario_mes' AND parent_object_id = OBJECT_ID('dbo.calendario'))
    ALTER TABLE [dbo].[calendario]  WITH CHECK ADD  CONSTRAINT [ck_calendario_mes] CHECK  (([mes]>=(1) AND [mes]<=(12)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_calendario_semana_mes' AND parent_object_id = OBJECT_ID('dbo.calendario'))
    ALTER TABLE [dbo].[calendario]  WITH CHECK ADD  CONSTRAINT [ck_calendario_semana_mes] CHECK  (([semana_mes] IS NULL OR [semana_mes]>=(1) AND [semana_mes]<=(6)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_feriado_fechas' AND parent_object_id = OBJECT_ID('dbo.feriado'))
    ALTER TABLE [dbo].[feriado]  WITH CHECK ADD  CONSTRAINT [ck_feriado_fechas] CHECK  (([fecha_fin]>=[fecha_inicio]))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_feriado_mes' AND parent_object_id = OBJECT_ID('dbo.feriado'))
    ALTER TABLE [dbo].[feriado]  WITH CHECK ADD  CONSTRAINT [ck_feriado_mes] CHECK  (([mes]>=(1) AND [mes]<=(12)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_feriado_pertenece_al_mes' AND parent_object_id = OBJECT_ID('dbo.feriado'))
    ALTER TABLE [dbo].[feriado]  WITH CHECK ADD  CONSTRAINT [ck_feriado_pertenece_al_mes] CHECK  ((datepart(year,[fecha_inicio])=[anio] AND datepart(month,[fecha_inicio])=[mes] AND datepart(year,[fecha_fin])=[anio] AND datepart(month,[fecha_fin])=[mes]))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_estado' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_estado] CHECK  (([estado]='CERRADA' OR [estado]='APROBADA' OR [estado]='REVISION' OR [estado]='BORRADOR'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_fechas' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_fechas] CHECK  (([fecha_fin]>=[fecha_inicio]))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_mes' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_mes] CHECK  (([mes]>=(1) AND [mes]<=(12)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_origen_cierre' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_origen_cierre] CHECK  (([origen_cierre] IS NULL OR ([origen_cierre]='AUTOMATICO' OR [origen_cierre]='MANUAL')))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_scope' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_scope] CHECK  (([id_servicio] IS NOT NULL OR [id_departamento] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_version' AND parent_object_id = OBJECT_ID('dbo.planificacion'))
    ALTER TABLE [dbo].[planificacion]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_version] CHECK  (([version]>=(1)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_historial_estado_final' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_historial_estado_final] CHECK  (([estado_final]='CERRADA'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_historial_mes' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_historial_mes] CHECK  (([mes]>=(1) AND [mes]<=(12)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_historial_origen_cierre' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_historial_origen_cierre] CHECK  (([origen_cierre]='AUTOMATICO' OR [origen_cierre]='MANUAL'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_planificacion_historial_scope' AND parent_object_id = OBJECT_ID('dbo.planificacion_historial'))
    ALTER TABLE [dbo].[planificacion_historial]  WITH CHECK ADD  CONSTRAINT [ck_planificacion_historial_scope] CHECK  (([id_servicio] IS NOT NULL AND [id_departamento] IS NULL OR [id_servicio] IS NULL AND [id_departamento] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_turno_exclusion_turno_tipo_dia' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno]  WITH CHECK ADD  CONSTRAINT [ck_rol_turno_exclusion_turno_tipo_dia] CHECK  (([id_turno] IS NOT NULL AND [id_incidencia_personal] IS NULL OR [id_turno] IS NULL AND [id_incidencia_personal] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_turno_horas' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno]  WITH CHECK ADD  CONSTRAINT [ck_rol_turno_horas] CHECK  (([horas_programadas]>=(0)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_turno_origen' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno]  WITH CHECK ADD  CONSTRAINT [ck_rol_turno_origen] CHECK  (([origen_registro]='CAMBIO' OR [origen_registro]='AJUSTE' OR [origen_registro]='PLANTILLA' OR [origen_registro]='MANUAL'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_turno_secuencia' AND parent_object_id = OBJECT_ID('dbo.rol_turno'))
    ALTER TABLE [dbo].[rol_turno]  WITH CHECK ADD  CONSTRAINT [ck_rol_turno_secuencia] CHECK  (([secuencia_dia]>=(1)))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_turno_historial_tipo' AND parent_object_id = OBJECT_ID('dbo.rol_turno_historial'))
    ALTER TABLE [dbo].[rol_turno_historial]  WITH CHECK ADD  CONSTRAINT [ck_rol_turno_historial_tipo] CHECK  (([tipo_registro]='TIPO_DIA' OR [tipo_registro]='TURNO'))

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 005 aplicada: baseline de planificacion (11 tablas).'

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
