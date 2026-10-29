import { useEffect, useState } from 'react';
import { sesionApi } from 'services/sesionApi';
import {
  clearStoredActiveSession,
  getStoredActiveSession,
  getStoredActiveSessionToken,
  SESSION_CHANGE_EVENT,
  setStoredActiveSession
} from 'services/sessionStorage';
import type { UsuarioSesion } from 'types/api';

export function useActiveSession() {
  const [session, setSession] = useState<UsuarioSesion | null>(() => getStoredActiveSession());

  useEffect(() => {
    const sync = () => {
      setSession(getStoredActiveSession());
    };

    window.addEventListener(SESSION_CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(SESSION_CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tokenSesion = getStoredActiveSessionToken();

    if (!tokenSesion) {
      return undefined;
    }

    void sesionApi
      .getActual()
      .then((nextSession) => {
        if (cancelled) {
          return;
        }
        setStoredActiveSession(nextSession);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        clearStoredActiveSession();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}
