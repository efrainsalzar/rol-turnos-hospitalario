import { apiClient } from './apiClient';
import type { SesionAutenticada } from '../types/api';

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<SesionAutenticada>('/v1/auth/login', {
      username,
      password
    })
};
