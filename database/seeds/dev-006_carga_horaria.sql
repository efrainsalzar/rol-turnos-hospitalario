-- ============================================================
-- dev-006_carga_horaria.sql
-- Modalidades de carga horaria.
-- horas_dia_base en 0 hasta que se configuren las reglas horarias.
-- Idempotente: MERGE por codigo.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

MERGE dbo.carga_horaria AS t
USING (VALUES
    ('TC', N'Tiempo Completo', 0),
    ('MT', N'Medio Tiempo',    0)
) AS s(codigo, nombre, horas_dia_base)
ON t.codigo = s.codigo
WHEN NOT MATCHED THEN
    INSERT (codigo, nombre, horas_dia_base, activo, created_at, updated_at)
    VALUES (s.codigo, s.nombre, s.horas_dia_base, 1, GETDATE(), GETDATE());

PRINT 'dev-006: carga_horaria cargado.'
SELECT id, codigo, nombre, horas_dia_base FROM dbo.carga_horaria ORDER BY id
