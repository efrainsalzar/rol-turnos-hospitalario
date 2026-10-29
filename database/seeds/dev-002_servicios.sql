-- ============================================================
-- dev-002_servicios.sql
-- Servicios iniciales para desarrollo.
-- ENF: 2 servicios. AMB: 2 servicios. RRHH: sin servicio.
-- Idempotente: MERGE por codigo.
-- Requiere: dev-001_departamentos.sql aplicado antes.
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

MERGE dbo.servicio AS t
USING (
    SELECT d.id AS id_departamento, s.codigo, s.nombre
    FROM (VALUES
        ('ENF',  'ENF-S1', N'Servicio 1 de Enfermeria'),
        ('ENF',  'ENF-S2', N'Servicio 2 de Enfermeria'),
        ('AMB',  'AMB-S1', N'Servicio 1 Ambulatorio'),
        ('AMB',  'AMB-S2', N'Servicio 2 Ambulatorio')
    ) AS s(dep_codigo, codigo, nombre)
    JOIN dbo.departamento d ON d.codigo = s.dep_codigo
) AS s
ON t.codigo = s.codigo
WHEN NOT MATCHED THEN
    INSERT (id_departamento, codigo, nombre, activo, created_at, updated_at)
    VALUES (s.id_departamento, s.codigo, s.nombre, 1, GETDATE(), GETDATE());

PRINT 'dev-002: servicios cargados.'

-- Unidades del departamento de Administracion (tipo_servicio = 'UNIDAD').
-- Requiere: dev-001_departamentos.sql con el departamento ADM ya aplicado.
MERGE dbo.servicio AS t
USING (
    SELECT d.id AS id_departamento, s.codigo, s.nombre
    FROM (VALUES
        ('ADM', 'ADM-SIS',  N'Sistemas'),
        ('ADM', 'ADM-CONT', N'Contabilidad')
    ) AS s(dep_codigo, codigo, nombre)
    JOIN dbo.departamento d ON d.codigo = s.dep_codigo
) AS s
ON t.codigo = s.codigo
WHEN NOT MATCHED THEN
    INSERT (id_departamento, codigo, nombre, tipo_servicio, activo, created_at, updated_at)
    VALUES (s.id_departamento, s.codigo, s.nombre, 'UNIDAD', 1, GETDATE(), GETDATE());

PRINT 'dev-002: unidades de Administracion cargadas.'
SELECT s.id, s.codigo, s.nombre, s.tipo_servicio, d.codigo AS departamento
FROM dbo.servicio s
JOIN dbo.departamento d ON d.id = s.id_departamento
ORDER BY s.id
