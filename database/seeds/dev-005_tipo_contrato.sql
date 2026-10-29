-- ============================================================
-- dev-005_tipo_contrato.sql
-- Tipos de contrato / fuente de financiamiento.
-- Idempotente: MERGE por codigo.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

MERGE dbo.tipo_contrato AS t
USING (VALUES
    ('TGN', N'Tesoro General de la Nacion'),
    ('MIN', N'Ministerio de Salud'),
    ('IDH', N'Impuesto Directo a los Hidrocarburos'),
    ('FP',  N'Fondos Propios'),
    ('OTR', N'Otro')
) AS s(codigo, nombre)
ON t.codigo = s.codigo
WHEN NOT MATCHED THEN
    INSERT (codigo, nombre, activo, created_at, updated_at)
    VALUES (s.codigo, s.nombre, 1, GETDATE(), GETDATE());

PRINT 'dev-005: tipo_contrato cargado.'
SELECT id, codigo, nombre FROM dbo.tipo_contrato ORDER BY id
