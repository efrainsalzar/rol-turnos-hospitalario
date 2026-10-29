import { lazy } from 'react';

// ==============================|| LAZY CON RECARGA ANTE CHUNK OBSOLETO ||============================== //

const RELOAD_FLAG_KEY = 'roles-turnos:chunk-reload-attempted';

function isChunkLoadError(error) {
  const message = String((error && error.message) || error || '');
  return /dynamically imported module|importing a module script failed|error loading dynamically imported module/i.test(message);
}

function hasAlreadyAttemptedReload() {
  try {
    return window.sessionStorage.getItem(RELOAD_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function markReloadAttempted() {
  try {
    window.sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
  } catch {
    // sessionStorage no disponible (modo privado, etc.); se intenta igual el reload.
  }
}

function clearReloadAttempted() {
  try {
    window.sessionStorage.removeItem(RELOAD_FLAG_KEY);
  } catch {
    // sessionStorage no disponible; no hay nada que limpiar.
  }
}

// Con chunks con hash de contenido (ver vite.config.mjs), un chunk referenciado por una
// pestana abierta puede dejar de existir tras un nuevo build/deploy. React.lazy no distingue
// esto de un error de render real, asi que se intercepta el rechazo del import() aqui, antes
// de que llegue a React, y se fuerza una unica recarga automatica en vez del modal de error.
export function lazyWithReload(factory) {
  return lazy(() =>
    factory()
      .then((module) => {
        clearReloadAttempted();
        return module;
      })
      .catch((error) => {
        if (!isChunkLoadError(error) || hasAlreadyAttemptedReload()) {
          throw error;
        }

        markReloadAttempted();
        window.location.reload();

        // Evita que React intente renderizar con el modulo fallido mientras se recarga la pagina.
        return new Promise(() => {});
      })
  );
}
