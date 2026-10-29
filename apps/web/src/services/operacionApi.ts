import { apiClient } from './apiClient';
import type {
  ApiCollectionResponse,
  CargaHoraria,
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
  GuardarConfiguracionOperativaServicioInput,
  GuardarIncidenciaPersonalInput,
  GuardarTipoFeriadoInput,
  GuardarTurnoInput,
  ImpactoUsoCatalogo,
  PatchCodigoVisualInput,
  IncidenciaPersonal,
  TipoFeriado,
  Turno
} from '../types/api';

interface ListarTurnosParams {
  idDepartamento?: number;
  idServicio?: number;
  activo?: boolean;
  page?: number;
  pageSize?: number;
}

interface ListarIncidenciasPersonalesParams {
  alcance?: 'GENERAL' | 'PERSONAL' | 'OTRO';
}

const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const operacionApi = {
  getIncidenciasPersonales: (params: ListarIncidenciasPersonalesParams = {}) =>
    apiClient.get<ApiCollectionResponse<IncidenciaPersonal>>(
      `/v1/incidencias-personales${buildQueryString({
        alcance: params.alcance
      })}`
    ),
  getTiposFeriado: () => apiClient.get<ApiCollectionResponse<TipoFeriado>>('/v1/tipos-feriado'),
  createTipoFeriado: (input: GuardarTipoFeriadoInput) => apiClient.post<TipoFeriado>('/v1/tipos-feriado', input),
  updateTipoFeriado: (id: number, input: GuardarTipoFeriadoInput) => apiClient.put<TipoFeriado>(`/v1/tipos-feriado/${id}`, input),
  deleteTipoFeriado: (id: number) => apiClient.delete(`/v1/tipos-feriado/${id}`),
  createIncidenciaPersonal: (input: GuardarIncidenciaPersonalInput) =>
    apiClient.post<IncidenciaPersonal>('/v1/incidencias-personales', input),
  updateIncidenciaPersonal: (id: number, input: GuardarIncidenciaPersonalInput) =>
    apiClient.put<IncidenciaPersonal>(`/v1/incidencias-personales/${id}`, input),
  deleteIncidenciaPersonal: (id: number, confirmarLimpieza = false) =>
    apiClient.delete(`/v1/incidencias-personales/${id}${buildQueryString({ confirmar_limpieza: confirmarLimpieza || undefined })}`),
  getImpactoUsoIncidenciaPersonal: (id: number) => apiClient.get<ImpactoUsoCatalogo>(`/v1/incidencias-personales/${id}/impacto`),
  getCargasHorarias: () => apiClient.get<ApiCollectionResponse<CargaHoraria>>('/v1/cargas-horarias'),
  getTurnos: (params: ListarTurnosParams = {}) =>
    apiClient.get<ApiCollectionResponse<Turno>>(
      `/v1/turnos${buildQueryString({
        id_departamento: params.idDepartamento,
        id_servicio: params.idServicio,
        activo: params.activo,
        page: params.page,
        page_size: params.pageSize
      })}`
    ),
  getConfiguracionOperativaServicio: (idServicio: number) =>
    apiClient.get<ConfiguracionOperativaServicio>(`/v1/configuracion-operativa-servicios/${idServicio}`),
  updateConfiguracionOperativaServicio: (idServicio: number, input: GuardarConfiguracionOperativaServicioInput) =>
    apiClient.put<ConfiguracionOperativaServicio>(`/v1/configuracion-operativa-servicios/${idServicio}`, input),
  getConfiguracionOperativaDepartamento: (idDepartamento: number) =>
    apiClient.get<ConfiguracionOperativaDepartamento>(`/v1/configuracion-operativa-departamentos/${idDepartamento}`),
  updateConfiguracionOperativaDepartamento: (idDepartamento: number, input: GuardarConfiguracionOperativaServicioInput) =>
    apiClient.put<ConfiguracionOperativaDepartamento>(`/v1/configuracion-operativa-departamentos/${idDepartamento}`, input),
  getTurnoById: (id: number) => apiClient.get<Turno>(`/v1/turnos/${id}`),
  createTurno: (input: GuardarTurnoInput) => apiClient.post<Turno>('/v1/turnos', input),
  updateTurno: (id: number, input: GuardarTurnoInput) => apiClient.put<Turno>(`/v1/turnos/${id}`, input),
  activateTurno: (id: number) => apiClient.post(`/v1/turnos/${id}/activar`, {}),
  deleteTurno: (id: number, confirmarLimpieza = false) =>
    apiClient.delete(`/v1/turnos/${id}${buildQueryString({ confirmar_limpieza: confirmarLimpieza || undefined })}`),
  getImpactoUsoTurno: (id: number) => apiClient.get<ImpactoUsoCatalogo>(`/v1/turnos/${id}/impacto`),
  patchCodigoVisual: (idServicio: number, idCodigo: number, input: PatchCodigoVisualInput) =>
    apiClient.patch(`/v1/configuracion-operativa-servicios/${idServicio}/codigos/${idCodigo}`, input),
  patchCodigoVisualDepartamento: (idDepartamento: number, idCodigo: number, input: PatchCodigoVisualInput) =>
    apiClient.patch(`/v1/configuracion-operativa-departamentos/${idDepartamento}/codigos/${idCodigo}`, input)
};
