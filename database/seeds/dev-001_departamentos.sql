-- ============================================================
-- dev-001_departamentos.sql
-- 3 departamentos iniciales para desarrollo.
-- Idempotente: MERGE por codigo.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

MERGE dbo.departamento AS t
USING (VALUES
    ('ENF',  N'Departamento de Enfermeria',                    N'Departamento de Enfermeria'),
    ('AMB',  N'Departamento Ambulatorio',                      N'Departamento Ambulatorio'),
    ('RRHH', N'Departamento de Gestion de Recursos Humanos',   N'Departamento de Gestion de Recursos Humanos'),
    ('ADM',  N'Departamento de Administracion',                N'Departamento de Administracion')
) AS s(codigo, nombre, descripcion)
ON t.codigo = s.codigo
WHEN NOT MATCHED THEN
    INSERT (codigo, nombre, descripcion, activo, created_at, updated_at)
    VALUES (s.codigo, s.nombre, s.descripcion, 1, GETDATE(), GETDATE());

PRINT 'dev-001: departamentos cargados.'
SELECT id, codigo, nombre FROM dbo.departamento ORDER BY id
