SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '003'
SET @migration_name    = '003_baseline_seguridad.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 003.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 003 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Tabla: rol_seguridad
    IF OBJECT_ID(N'dbo.rol_seguridad', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[rol_seguridad](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [varchar](30) NOT NULL,
    	[nombre] [nvarchar](120) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
    	[alcance_planificacion] [varchar](20) NOT NULL,
    	[puede_ver_organizacion] [bit] NOT NULL,
    	[puede_ver_personal] [bit] NOT NULL,
    	[puede_gestionar_personal] [bit] NOT NULL,
    	[puede_ver_asignaciones] [bit] NOT NULL,
    	[puede_gestionar_asignaciones] [bit] NOT NULL,
    	[puede_ver_seguridad] [bit] NOT NULL,
    	[puede_gestionar_usuarios] [bit] NOT NULL,
    	[puede_ver_operacion] [bit] NOT NULL,
    	[puede_ver_planificacion] [bit] NOT NULL,
    	[puede_editar_planificacion] [bit] NOT NULL,
    	[puede_aprobar_planificacion] [bit] NOT NULL,
    	[ver_calendarios] [bit] NOT NULL,
    	[gestionar_calendarios] [bit] NOT NULL,
    	[ver_incidencias_personales] [bit] NOT NULL,
    	[gestionar_incidencias_personales] [bit] NOT NULL,
    	[gestionar_tipos_feriado] [bit] NOT NULL,
    	[ver_cargas_horarias] [bit] NOT NULL,
    	[gestionar_cargas_horarias] [bit] NOT NULL,
    	[ver_turnos] [bit] NOT NULL,
    	[crear_planificacion] [bit] NOT NULL,
    	[editar_planificacion] [bit] NOT NULL,
    	[enviar_revision_planificacion] [bit] NOT NULL,
    	[volver_borrador_planificacion] [bit] NOT NULL,
    	[aprobar_planificacion] [bit] NOT NULL,
    	[cerrar_planificacion] [bit] NOT NULL,
    	[exportar_planificacion] [bit] NOT NULL,
    	[exportar_planificacion_lote] [bit] NOT NULL,
    	[gestionar_codigos_operativos] [bit] NOT NULL,
    	[gestionar_turnos] [bit] NOT NULL,
    	[gestionar_servicios] [bit] NOT NULL,
    	[puede_ver_reportes] [bit] NOT NULL,
     CONSTRAINT [pk_rol] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_rol_codigo] UNIQUE NONCLUSTERED 
    (
    	[codigo] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_alcance_planificacion]  DEFAULT ('LECTURA') FOR [alcance_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_organizacion]  DEFAULT ((0)) FOR [puede_ver_organizacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_personal]  DEFAULT ((0)) FOR [puede_ver_personal]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_gestionar_personal]  DEFAULT ((0)) FOR [puede_gestionar_personal]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_asignaciones]  DEFAULT ((0)) FOR [puede_ver_asignaciones]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_gestionar_asignaciones]  DEFAULT ((0)) FOR [puede_gestionar_asignaciones]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_seguridad]  DEFAULT ((0)) FOR [puede_ver_seguridad]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_gestionar_usuarios]  DEFAULT ((0)) FOR [puede_gestionar_usuarios]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_operacion]  DEFAULT ((0)) FOR [puede_ver_operacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_planificacion]  DEFAULT ((0)) FOR [puede_ver_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_editar_planificacion]  DEFAULT ((0)) FOR [puede_editar_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_aprobar_planificacion]  DEFAULT ((0)) FOR [puede_aprobar_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_ver_calendarios]  DEFAULT ((0)) FOR [ver_calendarios]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_calendarios]  DEFAULT ((0)) FOR [gestionar_calendarios]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_ver_tipos_dia]  DEFAULT ((0)) FOR [ver_incidencias_personales]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_tipos_dia]  DEFAULT ((0)) FOR [gestionar_incidencias_personales]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_tipos_feriado]  DEFAULT ((0)) FOR [gestionar_tipos_feriado]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_ver_cargas_horarias]  DEFAULT ((0)) FOR [ver_cargas_horarias]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_cargas_horarias]  DEFAULT ((0)) FOR [gestionar_cargas_horarias]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_ver_turnos]  DEFAULT ((0)) FOR [ver_turnos]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_crear_planificacion]  DEFAULT ((0)) FOR [crear_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_editar_planificacion]  DEFAULT ((0)) FOR [editar_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_enviar_revision_planificacion]  DEFAULT ((0)) FOR [enviar_revision_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_volver_borrador_planificacion]  DEFAULT ((0)) FOR [volver_borrador_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_aprobar_planificacion]  DEFAULT ((0)) FOR [aprobar_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_cerrar_planificacion]  DEFAULT ((0)) FOR [cerrar_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_exportar_planificacion]  DEFAULT ((0)) FOR [exportar_planificacion]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_exportar_planificacion_lote]  DEFAULT ((0)) FOR [exportar_planificacion_lote]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_codigos_operativos]  DEFAULT ((0)) FOR [gestionar_codigos_operativos]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_turnos]  DEFAULT ((0)) FOR [gestionar_turnos]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_gestionar_servicios]  DEFAULT ((0)) FOR [gestionar_servicios]
    ALTER TABLE [dbo].[rol_seguridad] ADD  CONSTRAINT [df_rol_puede_ver_reportes]  DEFAULT ((0)) FOR [puede_ver_reportes]
    END

    -- Tabla: usuario
    IF OBJECT_ID(N'dbo.usuario', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[usuario](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_personal] [bigint] NULL,
    	[id_rol_seguridad] [bigint] NULL,
    	[tipo_usuario] [varchar](20) NOT NULL,
    	[proveedor_autenticacion] [varchar](30) NOT NULL,
    	[sujeto_autenticacion] [varchar](150) NULL,
    	[username] [varchar](80) NOT NULL,
    	[password_hash] [varchar](255) NULL,
    	[ultimo_acceso_at] [datetime] NULL,
    	[activo] [bit] NOT NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_usuario] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_usuario_username] UNIQUE NONCLUSTERED 
    (
    	[username] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[usuario] ADD  CONSTRAINT [df_usuario_activo]  DEFAULT ((1)) FOR [activo]
    ALTER TABLE [dbo].[usuario] ADD  CONSTRAINT [df_usuario_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[usuario] ADD  CONSTRAINT [df_usuario_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    CREATE NONCLUSTERED INDEX [ix_usuario_id_personal] ON [dbo].[usuario]
    (
    	[id_personal] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Tabla: sesion_usuario
    IF OBJECT_ID(N'dbo.sesion_usuario', N'U') IS NULL
    BEGIN
    CREATE TABLE [dbo].[sesion_usuario](
    	[id] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_usuario] [bigint] NOT NULL,
    	[token_hash] [varchar](128) NOT NULL,
    	[ip_origen] [varchar](64) NULL,
    	[user_agent] [nvarchar](255) NULL,
    	[last_seen_at] [datetime] NULL,
    	[expires_at] [datetime] NULL,
    	[revocada] [bit] NOT NULL,
    	[revocada_at] [datetime] NULL,
    	[motivo_revocacion] [nvarchar](255) NULL,
    	[created_at] [datetime] NOT NULL,
    	[updated_at] [datetime] NOT NULL,
     CONSTRAINT [pk_sesion_usuario] PRIMARY KEY CLUSTERED 
    (
    	[id] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
     CONSTRAINT [uq_sesion_usuario_token_hash] UNIQUE NONCLUSTERED 
    (
    	[token_hash] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    ) ON [PRIMARY]
    ALTER TABLE [dbo].[sesion_usuario] ADD  CONSTRAINT [df_sesion_usuario_revocada]  DEFAULT ((0)) FOR [revocada]
    ALTER TABLE [dbo].[sesion_usuario] ADD  CONSTRAINT [df_sesion_usuario_created_at]  DEFAULT (getutcdate()) FOR [created_at]
    ALTER TABLE [dbo].[sesion_usuario] ADD  CONSTRAINT [df_sesion_usuario_updated_at]  DEFAULT (getutcdate()) FOR [updated_at]
    CREATE NONCLUSTERED INDEX [ix_sesion_usuario_id_usuario] ON [dbo].[sesion_usuario]
    (
    	[id_usuario] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    CREATE UNIQUE NONCLUSTERED INDEX [ux_sesion_usuario_usuario_activa] ON [dbo].[sesion_usuario]
    (
    	[id_usuario] ASC
    )
    WHERE ([revocada]=(0))
    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
    END

    -- Claves foraneas de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_usuario_personal' AND parent_object_id = OBJECT_ID('dbo.usuario'))
    ALTER TABLE [dbo].[usuario] WITH CHECK ADD CONSTRAINT [fk_usuario_personal] FOREIGN KEY([id_personal])
    REFERENCES [dbo].[personal] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_usuario_rol' AND parent_object_id = OBJECT_ID('dbo.usuario'))
    ALTER TABLE [dbo].[usuario] WITH CHECK ADD CONSTRAINT [fk_usuario_rol] FOREIGN KEY([id_rol_seguridad])
    REFERENCES [dbo].[rol_seguridad] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_sesion_usuario_usuario' AND parent_object_id = OBJECT_ID('dbo.sesion_usuario'))
    ALTER TABLE [dbo].[sesion_usuario] WITH CHECK ADD CONSTRAINT [fk_sesion_usuario_usuario] FOREIGN KEY([id_usuario])
    REFERENCES [dbo].[usuario] ([id])
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_historial_asignacion_usuario' AND parent_object_id = OBJECT_ID('dbo.historial_asignacion'))
    ALTER TABLE [dbo].[historial_asignacion] WITH CHECK ADD CONSTRAINT [fk_historial_asignacion_usuario] FOREIGN KEY([id_usuario])
    REFERENCES [dbo].[usuario] ([id])

    -- Check constraints de este modulo
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_rol_alcance_planificacion' AND parent_object_id = OBJECT_ID('dbo.rol_seguridad'))
    ALTER TABLE [dbo].[rol_seguridad]  WITH CHECK ADD  CONSTRAINT [ck_rol_alcance_planificacion] CHECK  (([alcance_planificacion]='LECTURA' OR [alcance_planificacion]='SERVICIO' OR [alcance_planificacion]='DEPARTAMENTO' OR [alcance_planificacion]='SISTEMA'))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_usuario_password_local' AND parent_object_id = OBJECT_ID('dbo.usuario'))
    ALTER TABLE [dbo].[usuario]  WITH CHECK ADD  CONSTRAINT [ck_usuario_password_local] CHECK  (([proveedor_autenticacion]<>'LOCAL' OR [password_hash] IS NOT NULL))
    IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_usuario_tipo' AND parent_object_id = OBJECT_ID('dbo.usuario'))
    ALTER TABLE [dbo].[usuario]  WITH CHECK ADD  CONSTRAINT [ck_usuario_tipo] CHECK  (([tipo_usuario]='INTEGRACION' OR [tipo_usuario]='ADMINISTRATIVO' OR [tipo_usuario]='PERSONAL'))

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 003 aplicada: baseline de seguridad (3 tablas).'

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
