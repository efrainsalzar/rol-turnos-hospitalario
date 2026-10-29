:setvar DatabaseName "roles_turnos_demo"
:on error exit

USE [master]
GO

IF DB_ID(N'$(DatabaseName)') IS NOT NULL
BEGIN
    RAISERROR('La base de datos $(DatabaseName) ya existe. Si necesita recrearla, elimine la base manualmente primero.', 16, 1)
END
GO

CREATE DATABASE [$(DatabaseName)]
GO

PRINT 'Base de datos $(DatabaseName) creada correctamente.'
GO
