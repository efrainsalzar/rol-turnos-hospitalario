import { apiClient } from './apiClient';
import { planificacionApi } from './planificacionApi';
import type { UsuarioSesion } from '../types/api';

export const sesionApi = {
  getActual: () => apiClient.get<UsuarioSesion>('/v1/sesion/actual'),
  logout: async () => {
    // Mejor esfuerzo: si esto falla (red, sesion ya vencida) no debe impedir
    // el logout real. La sesion de edicion igual expira sola por latido
    // (ver planificacion-matriz.tsx) si esta liberacion explicita no llega.
    try {
      await planificacionApi.liberarTodasMisSesionesEdicion();
    } catch {
      // intencional: liberacion best-effort, no bloquea el logout.
    }

    return apiClient.post<void>('/v1/sesion/logout');
  }
};
