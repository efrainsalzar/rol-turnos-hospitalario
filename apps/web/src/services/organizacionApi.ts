import { apiClient } from './apiClient';
import type {
  ApiCollectionResponse,
  Asignacion,
  Departamento,
  GuardarDepartamentoInput,
  GuardarServicioInput,
  Servicio,
  ServicioDetalle
} from '../types/api';

export const organizacionApi = {
  getDepartamentos: () => apiClient.get<ApiCollectionResponse<Departamento>>('/v1/departamentos'),
  createDepartamento: (input: GuardarDepartamentoInput) => apiClient.post<Departamento>('/v1/departamentos', input),
  updateDepartamento: (idDepartamento: number, input: GuardarDepartamentoInput) =>
    apiClient.put<Departamento>(`/v1/departamentos/${idDepartamento}`, input),
  activateDepartamento: (idDepartamento: number) => apiClient.post(`/v1/departamentos/${idDepartamento}/activar`, {}),
  deleteDepartamento: (idDepartamento: number) => apiClient.delete(`/v1/departamentos/${idDepartamento}`),
  getServicios: (idDepartamento?: number) =>
    apiClient.get<ApiCollectionResponse<Servicio>>(`/v1/servicios${idDepartamento ? `?id_departamento=${idDepartamento}` : ''}`),
  createServicio: (input: GuardarServicioInput) => apiClient.post<Servicio>('/v1/servicios', input),
  updateServicio: (idServicio: number, input: GuardarServicioInput) => apiClient.put<Servicio>(`/v1/servicios/${idServicio}`, input),
  activateServicio: (idServicio: number) => apiClient.post(`/v1/servicios/${idServicio}/activar`, {}),
  deleteServicio: (idServicio: number) => apiClient.delete(`/v1/servicios/${idServicio}`),
  getServiciosByDepartamento: (idDepartamento: number) =>
    apiClient.get<ApiCollectionResponse<Servicio>>(`/v1/departamentos/${idDepartamento}/servicios`),
  getServicioDetalle: (idServicio: number) => apiClient.get<ServicioDetalle>(`/v1/servicios/${idServicio}/detalle`),
  getServicioPersonal: (idServicio: number) => apiClient.get<ApiCollectionResponse<Asignacion>>(`/v1/servicios/${idServicio}/personal`)
};
