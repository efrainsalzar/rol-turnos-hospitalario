-- ============================================================
-- dev-003_nivel_cargo.sql
-- Niveles de cargo base.
-- Idempotente: MERGE por codigo.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

MERGE dbo.nivel_cargo AS t
USING (VALUES
    ('LIC', N'Licenciado'),
    ('AUX', N'Auxiliar')
) AS s(codigo, nombre)
ON t.codigo = s.codigo
WHEN NOT MATCHED THEN
    INSERT (codigo, nombre, activo, created_at, updated_at)
    VALUES (s.codigo, s.nombre, 1, GETDATE(), GETDATE());

PRINT 'dev-003: nivel_cargo cargado.'
SELECT id, codigo, nombre FROM dbo.nivel_cargo ORDER BY id
