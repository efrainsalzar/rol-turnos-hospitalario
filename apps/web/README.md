# apps/web

Frontend del sistema: React 19 + Vite + TypeScript + MUI 7, con base visual adaptada de la plantilla
[Mantis Free](https://github.com/codedthemes/mantis-free-react-admin-template) (licencia MIT, ver
[`LICENSE`](LICENSE)).

Los estándares generales del proyecto, incluidos los del frontend, están en
[`ARQUITECTURA.md`](../../ARQUITECTURA.md) §13.

## Comandos

```bash
npm start           # servidor de desarrollo (puerto VITE_DEV_SERVER_PORT, 3001 por defecto)
npm run typecheck   # tsc --noEmit
npm run lint
npm run build       # build estático en dist/
```

Desde la raíz del repositorio: `npm run dev:web`, o `npm run dev` para levantar API y web juntas.

## Configuración

Copiar `.env.example` a `.env`:

| Variable | Uso |
|---|---|
| `VITE_API_BASE_URL` | URL base de la API (por defecto `http://localhost:3000`) |
| `VITE_APP_BASE_NAME` | Ruta base del router; usar `/` salvo que la app se publique en un subdirectorio |
| `VITE_DEV_SERVER_PORT` | Puerto del servidor de desarrollo |

Vite fija estos valores dentro del build: cambiarlos exige volver a correr `npm run build`.

## Estructura

```text
src/
  services/     cliente HTTP (apiClient.ts) y clientes por dominio (planificacionApi, personalApi, …)
  types/        contratos tipados de la API
  pages/        pantallas por módulo: organizacion, personal, operacion,
                planificacion, seguridad, reportes, auth, dashboard
  components/   componentes del sistema (diálogos, matriz, toolbar, chips)
  hooks/        hooks compartidos (control de acceso, sesión, edición exclusiva, validación de formularios)
  contexts/     configuración global del tema
  routes/       rutas por dominio con errorElement por sección
  layout/       shell de la aplicación (menú, cabecera)
  menu-items/   menú lateral según los permisos del rol
  themes/       tema MUI adaptado
  utils/        utilidades compartidas
```

## Estándares del frontend

* [Estándar de modales](../../docs/frontend/estandar-modales.md)
* [Estándar de notificaciones](../../docs/frontend/estandar-notificaciones.md)
* [Estándar visual operativo](../../docs/frontend/estandar-visual-operativo.md)
* [Resiliencia de red](../../docs/frontend/estrategia-resiliencia-red.md)
