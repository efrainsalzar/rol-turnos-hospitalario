/*
  Contrato de lectura de personal desde un sistema de RRHH externo.
  Ejecutar conectado a la base de origen con permisos SELECT solamente.
  No contiene INSERT, UPDATE, DELETE, MERGE ni llamadas a procedimientos.

  Plantilla de ejemplo: cada institucion adapta el FROM y las columnas de
  origen a su propio esquema, manteniendo los alias de salida, que son el
  contrato que espera RrhhExternoPersonalAdapter.
*/

SELECT
    codigo_persona     AS codigo_externo,
    nombres            AS nombres,
    apellido_paterno   AS apellido_paterno,
    apellido_materno   AS apellido_materno,
    documento_identidad AS documento_identidad
FROM dbo.persona;
