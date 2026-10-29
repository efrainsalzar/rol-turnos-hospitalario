import { apiClient } from './apiClient';
import type { HealthDatabaseResponse, HealthReadyResponse } from '../types/api';

export const healthApi = {
  getReady: () => apiClient.get<HealthReadyResponse>('/health/ready'),
  getDatabase: () => apiClient.get<HealthDatabaseResponse>('/health/database')
};
