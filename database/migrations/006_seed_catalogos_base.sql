SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @migration_version VARCHAR(50)
DECLARE @migration_name    VARCHAR(255)

SET @migration_version = '006'
SET @migration_name    = '006_seed_catalogos_base.sql'

IF OBJECT_ID(N'dbo.schema_migration', N'U') IS NULL
BEGIN
    RAISERROR('La tabla dbo.schema_migration es obligatoria antes de ejecutar 006.', 16, 1)
    RETURN
END

IF EXISTS (
    SELECT 1 FROM dbo.schema_migration
    WHERE version = @migration_version AND estado = 'APLICADO'
)
BEGIN
    PRINT 'Migracion 006 ya aplicada. Se omite.'
    RETURN
END

BEGIN TRY
    BEGIN TRANSACTION

    -- Catalogos base estructurales del sistema (no son datos reales del
    -- hospital, son la base de seguridad/operacion con la que arranca
    -- cualquier entorno). Contenido tomado tal cual del estado final real de
    -- roles_turnos_dev (no de una migracion vieja): las 58
    -- migraciones originales sembraban estos mismos roles/catalogos, pero
    -- varios de sus permisos concretos se fueron ajustando en migraciones
    -- posteriores (017, 039, 045, 050, 051, 056) -- se consolida directo el
    -- resultado final ya verificado, sin repetir esa cadena de ajustes.

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'ADMIN_SISTEMA')
        INSERT INTO dbo.rol_seguridad (
            codigo, nombre, descripcion, alcance_planificacion,
            puede_ver_organizacion, puede_ver_personal, puede_gestionar_personal,
            puede_ver_asignaciones, puede_gestionar_asignaciones, puede_ver_seguridad,
            puede_gestionar_usuarios, puede_ver_operacion, puede_ver_planificacion,
            puede_editar_planificacion, puede_aprobar_planificacion, ver_calendarios,
            gestionar_calendarios, ver_incidencias_personales, gestionar_incidencias_personales,
            gestionar_tipos_feriado, ver_cargas_horarias, gestionar_cargas_horarias, ver_turnos,
            crear_planificacion, editar_planificacion, enviar_revision_planificacion,
            volver_borrador_planificacion, aprobar_planificacion, cerrar_planificacion,
            exportar_planificacion, exportar_planificacion_lote, gestionar_codigos_operativos,
            gestionar_turnos, gestionar_servicios, puede_ver_reportes
        )
        VALUES (
            'ADMIN_SISTEMA', N'Administrador del sistema', N'Soporte excepcional, parametrizacion y contingencias.', 'SISTEMA',
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1
        )

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'RRHH')
        INSERT INTO dbo.rol_seguridad (
            codigo, nombre, descripcion, alcance_planificacion,
            puede_ver_organizacion, puede_ver_personal, puede_gestionar_personal,
            puede_ver_asignaciones, puede_gestionar_asignaciones, puede_ver_seguridad,
            puede_gestionar_usuarios, puede_ver_operacion, puede_ver_planificacion,
            puede_editar_planificacion, puede_aprobar_planificacion, ver_calendarios,
            gestionar_calendarios, ver_incidencias_personales, gestionar_incidencias_personales,
            gestionar_tipos_feriado, ver_cargas_horarias, gestionar_cargas_horarias, ver_turnos,
            crear_planificacion, editar_planificacion, enviar_revision_planificacion,
            volver_borrador_planificacion, aprobar_planificacion, cerrar_planificacion,
            exportar_planificacion, exportar_planificacion_lote, gestionar_codigos_operativos,
            gestionar_turnos, gestionar_servicios, puede_ver_reportes
        )
        VALUES (
            -- RRHH: alcance amplio de gestion operativa/administrativa, igual
            -- que Admin en casi todo -- la unica limitacion real es la gestion
            -- de la organizacion (crear/editar departamentos y servicios,
            -- gestionar_servicios), que queda fuera. Decision 2026-07-22, ver
            -- docs/database/decisiones-tecnicas.md.
            'RRHH', N'Recursos humanos', N'Gestion formal de altas, traslados, cierres, reactivaciones y planificacion de todos los servicios.', 'SISTEMA',
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            1, 0, 1
        )

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'JEFE_DEPARTAMENTO')
        INSERT INTO dbo.rol_seguridad (
            codigo, nombre, descripcion, alcance_planificacion,
            puede_ver_organizacion, puede_ver_personal, puede_gestionar_personal,
            puede_ver_asignaciones, puede_gestionar_asignaciones, puede_ver_seguridad,
            puede_gestionar_usuarios, puede_ver_operacion, puede_ver_planificacion,
            puede_editar_planificacion, puede_aprobar_planificacion, ver_calendarios,
            gestionar_calendarios, ver_incidencias_personales, gestionar_incidencias_personales,
            gestionar_tipos_feriado, ver_cargas_horarias, gestionar_cargas_horarias, ver_turnos,
            crear_planificacion, editar_planificacion, enviar_revision_planificacion,
            volver_borrador_planificacion, aprobar_planificacion, cerrar_planificacion,
            exportar_planificacion, exportar_planificacion_lote, gestionar_codigos_operativos,
            gestionar_turnos, gestionar_servicios, puede_ver_reportes
        )
        VALUES (
            'JEFE_DEPARTAMENTO', N'Jefe de departamento', N'Aprueba movimientos organizativos dentro de su estructura.', 'DEPARTAMENTO',
            1, 0, 0,
            1, 1, 0,
            0, 1, 1,
            1, 1, 1,
            0, 1, 0,
            0, 0, 0, 1,
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
            0, 0, 0
        )

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'JEFE_SERVICIO')
        INSERT INTO dbo.rol_seguridad (
            codigo, nombre, descripcion, alcance_planificacion,
            puede_ver_organizacion, puede_ver_personal, puede_gestionar_personal,
            puede_ver_asignaciones, puede_gestionar_asignaciones, puede_ver_seguridad,
            puede_gestionar_usuarios, puede_ver_operacion, puede_ver_planificacion,
            puede_editar_planificacion, puede_aprobar_planificacion, ver_calendarios,
            gestionar_calendarios, ver_incidencias_personales, gestionar_incidencias_personales,
            gestionar_tipos_feriado, ver_cargas_horarias, gestionar_cargas_horarias, ver_turnos,
            crear_planificacion, editar_planificacion, enviar_revision_planificacion,
            volver_borrador_planificacion, aprobar_planificacion, cerrar_planificacion,
            exportar_planificacion, exportar_planificacion_lote, gestionar_codigos_operativos,
            gestionar_turnos, gestionar_servicios, puede_ver_reportes
        )
        VALUES (
            'JEFE_SERVICIO', N'Jefe de servicio', N'Solicita incorporaciones, retiros, coberturas y rotaciones dentro del servicio.', 'SERVICIO',
            0, 0, 0,
            1, 0, 0,
            0, 1, 1,
            1, 0, 1,
            0, 1, 0,
            0, 0, 0, 1,
            1, 1, 1,
            0, 0, 0,
            1, 0, 1,
            0, 0, 0
        )

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_seguridad WHERE codigo = 'PLANIFICADOR')
        INSERT INTO dbo.rol_seguridad (
            codigo, nombre, descripcion, alcance_planificacion,
            puede_ver_organizacion, puede_ver_personal, puede_gestionar_personal,
            puede_ver_asignaciones, puede_gestionar_asignaciones, puede_ver_seguridad,
            puede_gestionar_usuarios, puede_ver_operacion, puede_ver_planificacion,
            puede_editar_planificacion, puede_aprobar_planificacion, ver_calendarios,
            gestionar_calendarios, ver_incidencias_personales, gestionar_incidencias_personales,
            gestionar_tipos_feriado, ver_cargas_horarias, gestionar_cargas_horarias, ver_turnos,
            crear_planificacion, editar_planificacion, enviar_revision_planificacion,
            volver_borrador_planificacion, aprobar_planificacion, cerrar_planificacion,
            exportar_planificacion, exportar_planificacion_lote, gestionar_codigos_operativos,
            gestionar_turnos, gestionar_servicios, puede_ver_reportes
        )
        VALUES (
            'PLANIFICADOR', N'Planificador', N'Utiliza asignaciones vigentes para construir planificaciones y rol diario.', 'SERVICIO',
            1, 1, 0,
            0, 0, 0,
            0, 1, 1,
            1, 0, 0,
            0, 0, 0,
            0, 0, 0, 1,
            1, 1, 1,
            0, 0, 0,
            1, 0, 1,
            0, 0, 1
        )

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_funcional WHERE codigo = 'ASISTENCIAL')
        INSERT INTO dbo.rol_funcional (codigo, nombre, alcance_organizativo, es_jefatura, descripcion)
        VALUES ('ASISTENCIAL', N'Asistencial', 'NINGUNO', 0, N'Funcion operativa asistencial sin jefatura formal.')

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_funcional WHERE codigo = 'JEFE_SERVICIO')
        INSERT INTO dbo.rol_funcional (codigo, nombre, alcance_organizativo, es_jefatura, descripcion)
        VALUES ('JEFE_SERVICIO', N'Jefe de servicio', 'SERVICIO', 1, N'Jefatura formal de servicio.')

    IF NOT EXISTS (SELECT 1 FROM dbo.rol_funcional WHERE codigo = 'JEFE_DEPARTAMENTO')
        INSERT INTO dbo.rol_funcional (codigo, nombre, alcance_organizativo, es_jefatura, descripcion)
        VALUES ('JEFE_DEPARTAMENTO', N'Jefe de departamento', 'DEPARTAMENTO', 1, N'Jefatura formal de departamento.')

    IF NOT EXISTS (SELECT 1 FROM dbo.incidencia_personal WHERE codigo = 'VACACION')
        INSERT INTO dbo.incidencia_personal (codigo, nombre, descripcion, alcance, es_laborable, genera_horas_trabajadas, computa_para_meta_horas, requiere_respaldo, codigo_exportacion_etiqueta, codigo_exportacion_numerico)
        VALUES ('VACACION', N'Vacacion', N'Ausencia por vacacion.', 'PERSONAL', 0, 0, 0, 1, 'VAC', 'V')

    IF NOT EXISTS (SELECT 1 FROM dbo.incidencia_personal WHERE codigo = 'LICENCIA')
        INSERT INTO dbo.incidencia_personal (codigo, nombre, descripcion, alcance, es_laborable, genera_horas_trabajadas, computa_para_meta_horas, requiere_respaldo, codigo_exportacion_etiqueta, codigo_exportacion_numerico)
        VALUES ('LICENCIA', N'Licencia', N'Ausencia administrativa o institucional.', 'PERSONAL', 0, 0, 0, 1, 'LIC', 'LV')

    IF NOT EXISTS (SELECT 1 FROM dbo.incidencia_personal WHERE codigo = 'BAJA_MEDICA')
        INSERT INTO dbo.incidencia_personal (codigo, nombre, descripcion, alcance, es_laborable, genera_horas_trabajadas, computa_para_meta_horas, requiere_respaldo, codigo_exportacion_etiqueta, codigo_exportacion_numerico)
        VALUES ('BAJA_MEDICA', N'Baja medica', N'Ausencia por incapacidad o respaldo clinico.', 'PERSONAL', 0, 0, 0, 1, 'BAJA', 'BAJA')

    IF NOT EXISTS (SELECT 1 FROM dbo.incidencia_personal WHERE codigo = 'FERIADO')
        INSERT INTO dbo.incidencia_personal (codigo, nombre, descripcion, alcance, es_laborable, genera_horas_trabajadas, computa_para_meta_horas, requiere_respaldo, codigo_exportacion_etiqueta, codigo_exportacion_numerico)
        VALUES ('FERIADO', N'Feriado Nacional', N'Codigo de referencia para exportacion e impresion de feriados del calendario institucional.', 'GENERAL', 0, 0, 0, 0, 'FN', 'FN')

    IF NOT EXISTS (SELECT 1 FROM dbo.tipo_feriado WHERE codigo = 'F')
        INSERT INTO dbo.tipo_feriado (codigo, nombre, descripcion, orden)
        VALUES ('F', N'Feriado general', N'Feriado comun sin clasificacion especifica.', 1)

    IF NOT EXISTS (SELECT 1 FROM dbo.tipo_feriado WHERE codigo = 'FN')
        INSERT INTO dbo.tipo_feriado (codigo, nombre, descripcion, orden)
        VALUES ('FN', N'Feriado nacional', N'Feriado reconocido a nivel nacional.', 2)

    IF NOT EXISTS (SELECT 1 FROM dbo.tipo_feriado WHERE codigo = 'FR')
        INSERT INTO dbo.tipo_feriado (codigo, nombre, descripcion, orden)
        VALUES ('FR', N'Feriado regional', N'Feriado aplicable a un departamento, municipio o region.', 3)

    IF NOT EXISTS (SELECT 1 FROM dbo.tipo_feriado WHERE codigo = 'FI')
        INSERT INTO dbo.tipo_feriado (codigo, nombre, descripcion, orden)
        VALUES ('FI', N'Feriado institucional', N'Feriado propio de la institucion u hospital.', 4)

    IF EXISTS (SELECT 1 FROM dbo.schema_migration WHERE version = @migration_version)
        UPDATE dbo.schema_migration
        SET nombre = @migration_name, aplicado_at = GETDATE(), estado = 'APLICADO'
        WHERE version = @migration_version
    ELSE
        INSERT INTO dbo.schema_migration (version, nombre, aplicado_at, estado)
        VALUES (@migration_version, @migration_name, GETDATE(), 'APLICADO')

    COMMIT TRANSACTION
    PRINT 'Migracion 006 aplicada: catalogos base de seguridad/operacion sembrados (5 roles, 3 roles funcionales, 4 incidencias, 4 tipos de feriado).'

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
