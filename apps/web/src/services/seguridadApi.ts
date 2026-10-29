import { apiClient } from './apiClient';
import type { ApiCollectionResponse, GuardarRolSeguridadInput, RolSeguridad, Usuario } from '../types/api';

export const seguridadApi = {
  getRoles: () => apiClient.get<ApiCollectionResponse<RolSeguridad>>('/v1/roles'),
  createRol: (body: GuardarRolSeguridadInput) => apiClient.post<RolSeguridad>('/v1/roles', body),
  updateRol: (idRolSeguridad: number, body: GuardarRolSeguridadInput) => apiClient.put<RolSeguridad>(`/v1/roles/${idRolSeguridad}`, body),
  activateRol: (idRolSeguridad: number) => apiClient.post(`/v1/roles/${idRolSeguridad}/activar`, {}),
  deleteRol: (idRolSeguridad: number) => apiClient.delete(`/v1/roles/${idRolSeguridad}`),
  getUsuarios: () => apiClient.get<ApiCollectionResponse<Usuario>>('/v1/usuarios'),
  createUsuario: (body: { idPersonal?: number; idRolSeguridad?: number; tipoUsuario: string; username: string; password: string }) =>
    apiClient.post<Usuario>('/v1/usuarios', body),
  updateUsuario: (
    idUsuario: number,
    body: {
      idPersonal?: number;
      idRolSeguridad?: number;
      tipoUsuario: string;
      username: string;
      password?: string;
    }
  ) => apiClient.put<Usuario>(`/v1/usuarios/${idUsuario}`, body),
  activateUsuario: (idUsuario: number) => apiClient.post(`/v1/usuarios/${idUsuario}/activar`, {}),
  deleteUsuario: (idUsuario: number) => apiClient.delete(`/v1/usuarios/${idUsuario}`)
};
