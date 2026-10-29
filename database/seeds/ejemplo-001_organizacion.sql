-- ============================================================
-- ejemplo-001_organizacion.sql
-- Organigrama de una institucion ficticia (Hospital de Ejemplo):
-- 4 departamentos y 12 servicios/unidades. Sirve como plantilla para
-- agregar el organigrama de una institucion real.
-- Se carga con: npm run seed:institution -- --id=ejemplo
-- o ejecutando este archivo directo con sqlcmd/SSMS (no depende de Node).
-- Idempotente: INSERT ... WHERE NOT EXISTS. Compatible con SQL Server 2008 R2.
-- Requiere: migraciones aplicadas (dbo.departamento/dbo.servicio).
-- ============================================================
SET NOCOUNT ON
SET QUOTED_IDENTIFIER ON
SET ANSI_NULLS ON

-- Todos los codigos llevan prefijo EJ-: departamento.codigo, departamento.nombre
-- y servicio.codigo son unicos en toda la tabla, y sin prefijo un codigo comun
-- (RRHH, ADM-FIN) chocaria con otra institucion cargada en la misma base; el
-- WHERE NOT EXISTS lo saltaria en silencio y los servicios quedarian colgados
-- del departamento ajeno.
INSERT INTO dbo.departamento (codigo, nombre)
SELECT v.codigo, v.nombre
FROM (VALUES
    ('EJ-MED', N'Departamento de Medicina'),
    ('EJ-CIR', N'Departamento de Cirugia'),
    ('EJ-ENF', N'Departamento de Enfermeria'),
    ('EJ-APOYO', N'Departamento de Apoyo Diagnostico')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.departamento d WHERE d.codigo = v.codigo
)

INSERT INTO dbo.servicio (id_departamento, codigo, nombre, descripcion, tipo_servicio)
SELECT d.id, v.codigo, v.nombre, v.descripcion, v.tipo_servicio
FROM (VALUES
    ('EJ-MED', 'EJ-MED-INT', N'Servicio de Medicina Interna', NULL, 'SERVICIO'),
    ('EJ-MED', 'EJ-MED-PED', N'Servicio de Pediatria', NULL, 'SERVICIO'),
    ('EJ-MED', 'EJ-MED-EMG', N'Servicio de Emergencias', NULL, 'SERVICIO'),
    ('EJ-CIR', 'EJ-CIR-GEN', N'Servicio de Cirugia General', NULL, 'SERVICIO'),
    ('EJ-CIR', 'EJ-CIR-TRA', N'Servicio de Traumatologia', NULL, 'SERVICIO'),
    ('EJ-CIR', 'EJ-CIR-QX', N'Unidad de Quirofanos', NULL, 'UNIDAD'),
    ('EJ-ENF', 'EJ-ENF-HOSP', N'Enfermeria de Hospitalizacion', NULL, 'SERVICIO'),
    ('EJ-ENF', 'EJ-ENF-UTI', N'Unidad de Terapia Intensiva', NULL, 'UNIDAD'),
    ('EJ-ENF', 'EJ-ENF-NEO', N'Unidad de Neonatologia', NULL, 'UNIDAD'),
    ('EJ-APOYO', 'EJ-APO-LAB', N'Servicio de Laboratorio Clinico', NULL, 'SERVICIO'),
    ('EJ-APOYO', 'EJ-APO-IMG', N'Servicio de Imagenologia', NULL, 'SERVICIO'),
    ('EJ-APOYO', 'EJ-APO-FAR', N'Servicio de Farmacia', NULL, 'SERVICIO')
) AS v(depto_codigo, codigo, nombre, descripcion, tipo_servicio)
INNER JOIN dbo.departamento d ON d.codigo = v.depto_codigo
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.servicio s WHERE s.codigo = v.codigo
)

PRINT 'ejemplo-001: organigrama del Hospital de Ejemplo cargado (4 departamentos, 12 servicios/unidades).'
