# Comandos del proyecto

Referencia rápida de todos los comandos `npm run ...` disponibles, agrupados por para qué sirven.
Todos se corren desde la raíz del repositorio.

## Flujos por consola

Regla general: **`npm run doctor` después de cada paso que toca la base.** Si dice "Sistema NO listo",
corregir lo que indica antes de seguir (por ejemplo, "pendientes: 0NN_...sql" → `npm run migrate:api`).

### A. Primera instalación: armar la base oficial (`preparacion` → `produccion`)

Paso a paso con explicación: `docs/deployment/guia-instalacion.md` §5.

```powershell
npm run env:preparacion           # 1. copia de trabajo (planificacion_turnos_preparacion)
npm run reset:db                  # 2. crea la base: migraciones + catálogos base + admin.sistema
npm run seed:institution -- --id=<institución>   # 3. organigrama
npm run sync:personal:validate    # 4. personal desde el RRHH externo (staging, no crea nada)
npm run sync:personal:conflicts   #    revisar observados
npm run sync:personal:apply       #    crea solo los VALIDO
#                                   5. en la app: cambiar contraseña de admin.sistema y crear usuarios
npm run backup:api                # 6. backup de preparacion
npm run env:produccion            # 7. base oficial (planificacion_turnos)
npm run restore:api -- .\database\backups\planificacion_turnos_preparacion_AAAAMMDD-HHMMSS.bak
npm run doctor                    # 8. debe decir "Sistema listo para correr"
```

### B. Sincronizar cambios del RRHH externo (sobre la base oficial)

```powershell
npm run env:produccion
npm run doctor
npm run sync:personal:validate
npm run sync:personal:conflicts
npm run sync:personal:apply
```

### B2. Refrescar la copia de trabajo desde la base oficial

```powershell
npm run env:produccion
npm run backup:api
npm run env:preparacion
npm run restore:api -- .\database\backups\planificacion_turnos_AAAAMMDD-HHMMSS.bak
```

### C. Después de un `git pull` (cualquier perfil)

```powershell
npm install
npm --prefix apps/web install     # el frontend tiene su propia instalacion
npm run migrate:api               # aplica migraciones nuevas; las ya aplicadas se saltan
npm run doctor
```

### D. Demo desde cero

```powershell
npm run env:demo
npm run reset:db
npm run seed:demo
npm run doctor
```

> Migraciones: `reset:db`, `migrate:api` y `doctor` leen la misma carpeta, `database/migrations/`
> (`apps/api/scripts/lib/migraciones.ts`). Agregar una migración es solo crear el archivo con el número
> siguiente (`019_...sql`); no hay listas que editar.

## Base de datos y Carga de Datos en 3 Niveles

| Comando                                      | Nivel       | Qué hace                                                                                                                                                   |
| :------------------------------------------- | :---------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run reset:db`                           | Nivel 0     | Base limpia: borra/recrea la base, corre migraciones y aplica **Nivel 0 (Catálogos Base + Admin Bootstrap `admin.sistema`)**. Base limpia lista para usar. |
| `npm run seed:system`                        | Nivel 0     | Aplica los catálogos indispensables del sistema y el usuario `admin.sistema` sin recrear la base.                                                          |
| `npm run seed:demo`                          | Nivel 1A    | Carga el entorno **Demo Sintético Liviano** (17 personas, usuarios demo por rol y planificaciones de prueba) en `roles_turnos_demo`.                       |
| `npm run seed:institution`                   | Nivel 2     | Muestra la lista de instituciones/hospitales registrados disponibles para importar.                                                                        |
| `npm run seed:institution -- --id=ejemplo`   | Nivel 2     | Carga el organigrama del **Hospital de Ejemplo** (institución ficticia de referencia).                                                                     |
| `npm run migrate:api`                        | Sistema     | Corre migraciones pendientes sobre el entorno activo, sin borrar la base.                                                                                  |
| `npm run backup:api`                         | Utilidad    | Backup de la base de datos del entorno activo.                                                                                                             |
| `npm run restore:api`                        | Utilidad    | Restaura un backup de base de datos sobre el entorno activo.                                                                                               |

Detalle completo de la arquitectura y creación de nuevos cargadores por hospital: `database/seeds/README.md`.

`reset:db` solo se permite sobre `roles_turnos_demo` y `planificacion_turnos_preparacion` (`RESETTABLE_DATABASES` en
`apps/api/scripts/lib/sql-script-runner.ts`). Sobre `preparacion` borra también el personal sincronizado:
hacer `npm run backup:api` antes. Sobre `produccion` (`planificacion_turnos`) se niega siempre.

## Sincronización de personal (RRHH externo, perfiles `preparacion` y `produccion`)

| Comando                           | Qué hace                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run sync:personal:validate`  | Lee el RRHH externo, valida y deja el lote en staging. No modifica `personal`.            |
| `npm run sync:personal:conflicts` | Muestra los registros observados de la última validación. Solo lectura.                    |
| `npm run sync:personal:apply`     | Crea solo los registros `VALIDO` de la última validación; los conflictos quedan pendientes. |

La consulta de origen está en `database/integracion/rrhh-externo/persona-basico.sql` y la conexión se
configura con las variables `RRHH_DB_*` (ver `apps/api/.env.example`).

## Diagnóstico de entorno

| Comando          | Qué hace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run doctor` | Revisa de una sola pasada si la máquina tiene todo lo necesario para correr el sistema: Node/npm, dependencias instaladas (raíz + `apps/web`), perfil de entorno activo y `.env` de frontend sin placeholders, conexión real a la base configurada, perfil SQL (`DB_PROFILE`) coherente con el nivel de compatibilidad de la base, esquema migrado, catálogos sembrados, puertos libres y coherencia entre `VITE_API_BASE_URL` y `PORT`. No se detiene en el primer problema — junta todo el reporte y dice exactamente qué comando correr para cada cosa que falte. Útil antes de `npm run dev` en cualquier máquina nueva (ver `docs/deployment/guia-nueva-maquina-demo.md`). |

## Correr el sistema

| Comando                           | Qué hace                            |
| --------------------------------- | ----------------------------------- |
| `npm run dev`                     | Backend + frontend juntos.          |
| `npm run dev:api` (= `start:dev`) | Solo backend.                       |
| `npm run dev:web`                 | Solo frontend.                      |
| `npm run start:prod`              | Backend compilado, modo producción. |

## Perfil de entorno activo

Guía completa: `docs/deployment/guia-perfiles-entorno.md`.

| Comando                             | Qué hace                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `npm run env:demo`                  | Activa el perfil `demo` (`roles_turnos_demo`, datos ficticios).                 |
| `npm run env:preparacion`           | Activa `preparacion` (`planificacion_turnos_preparacion`, copia de trabajo, reseteable). |
| `npm run env:produccion`            | Activa `produccion` (`planificacion_turnos`, base oficial, no reseteable).      |
| `npm run env:status`                | Muestra qué perfil, base y perfil de acceso están activos ahora.                |
| `npm run env:access:local`          | Perfil de acceso: solo localhost (edita el archivo del perfil activo).          |
| `npm run env:access:intranet-local` | Perfil de acceso: intranet + localhost (edita el archivo del perfil activo).    |

## Calidad (antes de cerrar cualquier cambio)

| Comando                             | Qué hace                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `npm run typecheck:api`             | Typecheck del backend sin compilar (solo `src`, sin specs).               |
| `npm run lint`                      | Lint de backend y frontend.                                               |
| `npm run build`                     | Build de backend y frontend.                                              |
| `npm test`                          | Suite de pruebas unitarias del backend.                                   |
| `npm run test:e2e`                  | Suite end-to-end (deja datos de prueba en la base activa).                |

## Limpieza

| Comando                           | Qué hace                                                   |
| --------------------------------- | ---------------------------------------------------------- |
| `npm run clean`                   | Borra `dist`, `coverage`, `.temp` y el build del frontend. |
| `npm run clean:api` / `clean:web` | Igual, pero solo backend o solo frontend.                  |

## Documentos relacionados

- `docs/deployment/guia-instalacion.md` — guía de instalación (demo, instancia real, servidor).
- `database/seeds/README.md` — detalle completo del flujo de base de datos.
- `docs/deployment/guia-perfiles-entorno.md` — perfiles `demo`, `preparacion` y `produccion`, backup y restore.
- `docs/seguridad/matriz-permisos-roles.md` — qué puede hacer cada rol de usuario.
