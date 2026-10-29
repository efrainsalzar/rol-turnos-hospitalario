-- ============================================================
-- dev-004_personal.sql
-- 14 personales iniciales para desarrollo.
-- Idempotente: MERGE por documento_identidad.
-- Requiere: dev-003_nivel_cargo.sql aplicado antes.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

DECLARE @lic  BIGINT = (SELECT id FROM dbo.nivel_cargo WHERE codigo = 'LIC')
DECLARE @aux  BIGINT = (SELECT id FROM dbo.nivel_cargo WHERE codigo = 'AUX')

IF @lic IS NULL OR @aux IS NULL
BEGIN
    RAISERROR('nivel_cargo no encontrado. Ejecutar dev-003_nivel_cargo.sql primero.', 16, 1)
    RETURN
END

MERGE dbo.personal AS t
USING (VALUES
--  codigo_personal  nombres                 apellido_paterno  apellido_materno  doc_identidad  id_nivel_cargo
    ('PER-001', N'Ana Maria',       N'Rojas',      N'Quispe',    '1001001',  @lic),
    ('PER-002', N'Carmen Rosa',     N'Mamani',     N'Flores',    '1001002',  @lic),
    ('PER-003', N'Lucia Elena',     N'Condori',    N'Huanca',    '1001003',  @lic),
    ('PER-004', N'Maria Eugenia',   N'Vargas',     N'Apaza',     '1001004',  @lic),
    ('PER-005', N'Silvia Patricia', N'Chura',      N'Mamani',    '1001005',  @lic),
    ('PER-006', N'Rosa Ines',       N'Ticona',     N'Chuquimia', '1001006',  @lic),
    ('PER-007', N'Yolanda',         N'Poma',       N'Quispe',    '1001007',  @lic),
    ('PER-008', N'Gloria Beatriz',  N'Aliaga',     N'Torrez',    '1001008',  @lic),
    ('PER-009', N'Patricia',        N'Gutierrez',  N'Medina',    '1001009',  @aux),
    ('PER-010', N'Sandra Marcela',  N'Flores',     N'Soto',      '1001010',  @aux),
    ('PER-011', N'Monica',          N'Herrera',    N'Vega',      '1001011',  @aux),
    ('PER-012', N'Nilda',           N'Espinoza',   N'Cruz',      '1001012',  @aux),
    ('PER-013', N'Elsa Viviana',    N'Romero',     N'Bernal',    '1001013',  @aux),
    ('PER-014', N'Juana',           N'Calisaya',   N'Larico',    '1001014',  @aux)
) AS s(codigo_personal, nombres, apellido_paterno, apellido_materno, documento_identidad, id_nivel_cargo)
ON t.documento_identidad = s.documento_identidad
WHEN NOT MATCHED THEN
    INSERT (codigo_personal, nombres, apellido_paterno, apellido_materno, documento_identidad, id_nivel_cargo, activo, created_at, updated_at)
    VALUES (s.codigo_personal, s.nombres, s.apellido_paterno, s.apellido_materno, s.documento_identidad, s.id_nivel_cargo, 1, GETDATE(), GETDATE());

PRINT 'dev-004: personal cargado.'
SELECT p.id, p.codigo_personal, p.nombres, p.apellido_paterno, nc.codigo AS nivel_cargo
FROM dbo.personal p
JOIN dbo.nivel_cargo nc ON nc.id = p.id_nivel_cargo
ORDER BY p.id
