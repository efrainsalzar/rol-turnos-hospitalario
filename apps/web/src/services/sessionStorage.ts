import type { UsuarioSesion } from '../types/api';

const ACTIVE_SESSION_KEY = 'roles-turnos.activeSession';
const ACTIVE_SESSION_TOKEN_KEY = 'roles-turnos.activeSessionToken';
const SESSION_CHANGE_EVENT = 'roles-turnos-session-change';

export function getStoredActiveSession(): UsuarioSesion | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(ACTIVE_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as UsuarioSesion;
  } catch {
    window.localStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }
}

export function getStoredActiveUserId(): number | null {
  return getStoredActiveSession()?.id ?? null;
}

export function getStoredActiveSessionToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_SESSION_TOKEN_KEY);
}

export function setStoredActiveSession(session: UsuarioSesion, tokenSesion?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  if (typeof tokenSesion === 'string' && tokenSesion.trim()) {
    window.localStorage.setItem(ACTIVE_SESSION_TOKEN_KEY, tokenSesion.trim());
  }
  window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
}

export function clearStoredActiveSession() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(ACTIVE_SESSION_KEY);
  window.localStorage.removeItem(ACTIVE_SESSION_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_CHANGE_EVENT));
}

export { SESSION_CHANGE_EVENT };
