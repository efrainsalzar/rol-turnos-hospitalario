# Despliegue

Esta carpeta fija la estrategia de despliegue del monorepo con el frontend operativo actual.

## Principio base

En producción, `apps/api` y `apps/web` deben mantenerse separados.

Eso significa:

* la API se compila y despliega como servicio backend independiente
* el frontend se compila y despliega como artefacto o servicio independiente
* la unión entre ambos se resuelve por proxy inverso o gateway

## Qué sí se comparte

Se comparte el repositorio y la documentación.

También puede compartirse:

* pipeline CI
* versionado
* reglas de calidad

## Qué no debe compartirse

No deben compartirse en producción:

* el mismo proceso Node
* el mismo archivo de entorno
* el mismo comando de arranque operativo
* secretos mezclados entre API y frontend

## Modelo recomendado

Ejemplo razonable:

* `apps/api` escuchando internamente en `3000`
* `apps/web` servido internamente en `8080`
* `nginx` o equivalente publicando:
  * `/api` -> `apps/api`
  * `/` -> `apps/web`

## Artefactos preparados

Referencias actuales:

* [guia-instalacion.md](/docs/deployment/guia-instalacion.md) — **punto de entrada**: instalacion demo, instancia real y servidor de una institucion
* [apps/api/.env.production.example](/apps/api/.env.production.example)
* [apps/web/.env.example](/apps/web/.env.example)
* [deploy/nginx/roles-turnos-app.conf.example](/deploy/nginx/roles-turnos-app.conf.example)
* [guia-perfiles-entorno.md](/docs/deployment/guia-perfiles-entorno.md) (perfiles, backup y restore)
* [guia-nueva-maquina-demo.md](/docs/deployment/guia-nueva-maquina-demo.md)
* `npm run doctor` — diagnostico de entorno (Node/npm, dependencias, `.env`, conexion a base de datos,
  puertos) antes de arrancar el sistema en una maquina nueva. Ver `docs/comandos.md`.

Variables clave:

* backend: `DB_*`
* frontend: `VITE_API_BASE_URL=/api`

## Flujo profesional esperado

Desarrollo:

* `api` y `web` separados técnicamente
* scripts coordinados desde la raíz solo por comodidad

Producción:

* build separado de `api`
* build separado de `web`
* despliegue separado
* health checks de backend publicados de forma controlada

## Estado actual

Hoy ya existen `apps/api` y `apps/web` como aplicaciones reales del monorepo.

Por eso:

* `npm run dev` desde la raíz puede orquestar `api` y el frontend operativo
* `npm run dev:api` y `npm run dev:web` permiten desarrollo independiente
* `npm run start:dev` en la raíz sigue reservado a la API por compatibilidad
* el backend y el frontend deben compilarse separados aunque la raíz pueda coordinar ambos
* `apps/web` se construye como artefacto estático con `npm run build:web`
* el backend se compila con `npm run build:api` (siempre limpia `dist/apps/api` antes; `build:api:clean` queda como alias) y se arranca con `npm run start:prod`, que ejecuta `dist/apps/api/src/main.js`
* `start:prod` puede lanzarse con un directorio de trabajo fuera del repositorio (por ejemplo, como servicio de Windows): la raíz del proyecto y el `.env` se resuelven también desde la ubicación del archivo compilado
