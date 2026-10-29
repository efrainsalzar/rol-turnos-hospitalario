import { apiClient } from './apiClient';
import type {
  ApiCollectionResponse,
  Asignacion,
  CargaHoraria,
  ConflictoPlanificacionAsignacion,
  JefaturaActiva,
  NivelCargoBase,
  Personal,
  PersonalDetalle,
  PersonalVinculableUsuario,
  RolFuncionalBase,
  TipoContrato
} from '../types/api';

export const personalApi = {
  getPersonal: (params?: {
    idServicio?: number;
    idDepartamento?: number;
    idNivelCargo?: number;
    rolFuncional?: string;
    nombre?: string;
    activo?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.idServicio) {
      searchParams.set('idServicio', String(params.idServicio));
      searchParams.set('id_servicio', String(params.idServicio));
    }
    if (params?.idDepartamento) {
      searchParams.set('idDepartamento', String(params.idDepartamento));
      searchParams.set('id_departamento', String(params.idDepartamento));
    }
    if (params?.idNivelCargo) {
      searchParams.set('idNivelCargo', String(params.idNivelCargo));
      searchParams.set('id_nivel_cargo', String(params.idNivelCargo));
    }
    if (params?.rolFuncional) searchParams.set('rol_funcional', params.rolFuncional);
    if (params?.nombre) searchParams.set('nombre', params.nombre);
    if (typeof params?.activo === 'boolean') searchParams.set('activo', String(params.activo));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));
    const query = searchParams.toString();
    return apiClient.get<ApiCollectionResponse<Personal>>(`/v1/personal${query ? `?${query}` : ''}`);
  },
  getPersonalDetalle: (idPersonal: number) => apiClient.get<PersonalDetalle>(`/v1/personal/${idPersonal}/detalle`),
  // Proyeccion propia para vincular personal a un usuario (Seguridad); siempre activo,
  // sin paginacion — ver docs/database/decisiones-tecnicas.md seccion 78.
  getPersonalVinculablesUsuario: () => apiClient.get<ApiCollectionResponse<PersonalVinculableUsuario>>('/v1/personal/vinculables-usuario'),
  getAsignaciones: (params?: {
    idServicio?: number;
    idDepartamento?: number;
    idPersonal?: number;
    rolFuncional?: string;
    nombre?: string;
    activo?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.idServicio) {
      searchParams.set('idServicio', String(params.idServicio));
      searchParams.set('id_servicio', String(params.idServicio));
    }
    if (params?.idDepartamento) {
      searchParams.set('idDepartamento', String(params.idDepartamento));
      searchParams.set('id_departamento', String(params.idDepartamento));
    }
    if (params?.idPersonal) {
      searchParams.set('idPersonal', String(params.idPersonal));
      searchParams.set('id_personal', String(params.idPersonal));
    }
    if (params?.rolFuncional) searchParams.set('rol_funcional', params.rolFuncional);
    if (params?.nombre) searchParams.set('nombre', params.nombre);
    if (typeof params?.activo === 'boolean') searchParams.set('activo', String(params.activo));
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('page_size', String(params.pageSize));
    const query = searchParams.toString();
    return apiClient.get<ApiCollectionResponse<Asignacion>>(`/v1/asignaciones${query ? `?${query}` : ''}`);
  },
  getPersonalByDepartamento: (idDepartamento: number) =>
    apiClient.get<ApiCollectionResponse<Asignacion>>(`/v1/departamentos/${idDepartamento}/personal`),
  getNivelesCargo: () => apiClient.get<ApiCollectionResponse<NivelCargoBase>>('/v1/niveles-cargo'),
  createNivelCargo: (body: { codigo: string; nombre: string; descripcion?: string; activo?: boolean }) =>
    apiClient.post<NivelCargoBase>('/v1/niveles-cargo', body),
  updateNivelCargo: (
    idNivelCargo: number,
    body: {
      codigo: string;
      nombre: string;
      descripcion?: string;
      activo?: boolean;
    }
  ) => apiClient.put<NivelCargoBase>(`/v1/niveles-cargo/${idNivelCargo}`, body),
  activateNivelCargo: (idNivelCargo: number) => apiClient.post(`/v1/niveles-cargo/${idNivelCargo}/activar`, {}),
  deleteNivelCargo: (idNivelCargo: number) => apiClient.delete(`/v1/niveles-cargo/${idNivelCargo}`),
  getCargasHorarias: () => apiClient.get<ApiCollectionResponse<CargaHoraria>>('/v1/cargas-horarias'),
  createCargaHoraria: (body: { codigo: string; nombre: string; horasDiaBase: number; descripcion?: string; activo?: boolean }) =>
    apiClient.post<CargaHoraria>('/v1/cargas-horarias', body),
  updateCargaHoraria: (
    idCargaHoraria: number,
    body: {
      codigo: string;
      nombre: string;
      horasDiaBase: number;
      descripcion?: string;
      activo?: boolean;
    }
  ) => apiClient.put<CargaHoraria>(`/v1/cargas-horarias/${idCargaHoraria}`, body),
  activateCargaHoraria: (idCargaHoraria: number) => apiClient.post(`/v1/cargas-horarias/${idCargaHoraria}/activar`, {}),
  deleteCargaHoraria: (idCargaHoraria: number) => apiClient.delete(`/v1/cargas-horarias/${idCargaHoraria}`),
  getTiposContrato: () => apiClient.get<ApiCollectionResponse<TipoContrato>>('/v1/tipos-contrato'),
  createTipoContrato: (body: { codigo: string; nombre: string; descripcion?: string }) =>
    apiClient.post<TipoContrato>('/v1/tipos-contrato', body),
  updateTipoContrato: (idTipoContrato: number, body: { nombre: string; descripcion?: string }) =>
    apiClient.put<TipoContrato>(`/v1/tipos-contrato/${idTipoContrato}`, body),
  activateTipoContrato: (idTipoContrato: number) => apiClient.post(`/v1/tipos-contrato/${idTipoContrato}/activar`, {}),
  deleteTipoContrato: (idTipoContrato: number) => apiClient.delete(`/v1/tipos-contrato/${idTipoContrato}`),
  getRolesFuncionales: () => apiClient.get<ApiCollectionResponse<RolFuncionalBase>>('/v1/roles-funcionales'),
  createPersonal: (body: {
    codigoPersonal?: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    documentoIdentidad: string;
    idNivelCargo: number;
  }) => apiClient.post<Personal>('/v1/personal', body),
  updatePersonal: (
    idPersonal: number,
    body: {
      codigoPersonal?: string;
      nombres: string;
      apellidoPaterno: string;
      apellidoMaterno?: string;
      documentoIdentidad: string;
      idNivelCargo: number;
    }
  ) => apiClient.put<Personal>(`/v1/personal/${idPersonal}`, body),
  activatePersonal: (idPersonal: number) => apiClient.post(`/v1/personal/${idPersonal}/activar`, {}),
  deletePersonal: (idPersonal: number) => apiClient.delete(`/v1/personal/${idPersonal}`),
  createAsignacion: (body: {
    idPersonal: number;
    idServicio?: number;
    idDepartamento?: number;
    idTipoContrato: number;
    idCargaHoraria: number;
    idRolFuncional: number;
    nroItem?: string;
    codigoFuenteItem?: string;
    tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
    // Opcional: el backend completa fechaInicio con la fecha actual si no llega
    // (docs/database/decisiones-tecnicas.md seccion 49).
    fechaInicio?: string;
    fechaFin?: string | null;
    motivo?: string;
    regularizarPlanificacionesAbiertas?: boolean;
  }) => apiClient.post<Asignacion>('/v1/asignaciones', body),
  updateAsignacion: (
    idAsignacion: number,
    body: {
      idPersonal: number;
      idServicio?: number;
      idDepartamento?: number;
      idTipoContrato: number;
      idCargaHoraria: number;
      idRolFuncional: number;
      nroItem?: string;
      codigoFuenteItem?: string;
      tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
      // Opcional: el backend conserva la fechaInicio existente si no llega, nunca la
      // reescribe con hoy (docs/database/decisiones-tecnicas.md seccion 49).
      fechaInicio?: string;
      fechaFin?: string | null;
      motivo?: string;
      regularizarPlanificacionesAbiertas?: boolean;
    }
  ) => apiClient.put<Asignacion>(`/v1/asignaciones/${idAsignacion}`, body),
  // Unico metodo valido para cambiar idServicio/idDepartamento de una asignacion
  // (docs/database/decisiones-tecnicas.md seccion 56): el backend cierra la fila actual y
  // crea una fila nueva en una sola transaccion, nunca reescribe la unidad en el sitio.
  // No expone tipoAsignacion: PRINCIPAL/SECUNDARIA se conserva de la asignacion de origen.
  moverAsignacion: (
    idAsignacion: number,
    body: {
      idServicio?: number;
      idDepartamento?: number;
      idRolFuncional: number;
      idTipoContrato: number;
      idCargaHoraria: number;
      nroItem?: string;
      codigoFuenteItem?: string;
      // Opcional: el backend usa la fecha actual como fecha_fin de la fila vieja y
      // fecha_inicio de la fila nueva si no llega.
      fecha?: string;
      motivo?: string;
      regularizarPlanificacionesAbiertas?: boolean;
    }
  ) => apiClient.post<Asignacion>(`/v1/asignaciones/${idAsignacion}/mover`, body),
  closeAsignacion: (
    idAsignacion: number,
    body: {
      // Opcional: el backend completa fechaFin con la fecha actual si no llega.
      fechaFin?: string;
      motivo?: string;
      regularizarPlanificacionesAbiertas?: boolean;
      cerrarSecundariasActivas?: boolean;
    }
  ) => apiClient.post<Asignacion>(`/v1/asignaciones/${idAsignacion}/cerrar`, body),
  // params.idServicioDestino/idDepartamentoDestino son opcionales: solo se envian
  // cuando el dialogo de traslado ya tiene una unidad destino elegida, para que el
  // backend tambien evalue si esa unidad tiene planificacion aprobada vigente.
  getConflictoPlanificacion: (idAsignacion: number, params?: { idServicioDestino?: number; idDepartamentoDestino?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.idServicioDestino) searchParams.set('id_servicio_destino', String(params.idServicioDestino));
    if (params?.idDepartamentoDestino) searchParams.set('id_departamento_destino', String(params.idDepartamentoDestino));
    const query = searchParams.toString();
    return apiClient.get<ConflictoPlanificacionAsignacion>(
      `/v1/asignaciones/${idAsignacion}/conflicto-planificacion${query ? `?${query}` : ''}`
    );
  },
  getJefaturaActiva: (params: { idServicio?: number; idDepartamento?: number }) => {
    const searchParams = new URLSearchParams();
    if (params.idServicio) searchParams.set('idServicio', String(params.idServicio));
    if (params.idDepartamento) searchParams.set('idDepartamento', String(params.idDepartamento));
    return apiClient.get<JefaturaActiva | null>(`/v1/asignaciones/jefatura-activa?${searchParams.toString()}`);
  }
};
