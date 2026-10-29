-- ============================================================
-- dev-007_usuario.sql
-- Usuario administrador inicial para desarrollo.
-- Password: Admin1234!
-- Idempotente: MERGE por username.
-- Requiere: rol cargado (viene de migración 008).
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @id_rol_admin BIGINT = (SELECT id FROM dbo.rol_seguridad WHERE codigo = 'ADMIN_SISTEMA')

IF @id_rol_admin IS NULL
BEGIN
    RAISERROR('Rol ADMIN_SISTEMA no encontrado. Las migraciones deben estar aplicadas.', 16, 1)
    RETURN
END

MERGE dbo.usuario AS t
USING (VALUES
    ('admin.sistema', '$2b$10$f45Amv5JH1yijPHkDtE6f.0XPAUnbyjyo2gtkxxhfPEqecZk/EL4S', 'ADMINISTRATIVO', 'LOCAL', @id_rol_admin)
) AS s(username, password_hash, tipo_usuario, proveedor_autenticacion, id_rol_seguridad)
ON t.username = s.username
WHEN NOT MATCHED THEN
    INSERT (username, password_hash, tipo_usuario, proveedor_autenticacion, id_rol_seguridad, id_personal, activo, created_at, updated_at)
    VALUES (s.username, s.password_hash, s.tipo_usuario, s.proveedor_autenticacion, s.id_rol_seguridad, NULL, 1, GETDATE(), GETDATE());

PRINT 'dev-007: usuario admin cargado.'
PRINT '  username : admin.sistema'
PRINT '  password : Admin1234!'
SELECT u.id, u.username, u.tipo_usuario, r.codigo AS rol FROM dbo.usuario u
JOIN dbo.rol_seguridad r ON r.id = u.id_rol_seguridad ORDER BY u.id
