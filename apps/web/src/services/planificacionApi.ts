import { apiClient, withBoundedRetryOnPoolSaturation } from './apiClient';
import type {
  ApiCollectionResponse,
  AsignacionPlanificacionDisponible,
  Calendario,
  ConfiguracionOperativaPlanificacion,
  CeldaMatrizPlanificacionPersistida,
  EstadoPlanificacion,
  Feriado,
  GuardarFeriadoInput,
  MatrizMensualPlanificacion,
  ResultadoGeneracionCalendario,
  Planificacion,
  ObservacionMensualPlanificacion,
  ResumenPlanificacionCalendario,
  ResumenPlanificacionPersonal,
  RolTurnoPlanificacion,
  SesionEdicionPlanificacion,
  EstiloExportacionRolTurnos,
  FormatoExportacionRolTurnos,
  ModoExportacionRolTurnos
} from '../types/api';

interface ListarCalendariosParams {
  anio?: number;
  mes?: number;
}

interface GenerarCalendarioInput {
  anio: number;
  mes?: number;
}

interface ListarFeriadosParams {
  anio?: number;
  mes?: number;
}

interface ListarPlanificacionesParams {
  idServicio?: number;
  idDepartamento?: number;
  idPersonal?: number;
  anio?: number;
  mes?: number;
  estado?: EstadoPlanificacion;
  page?: number;
  pageSize?: number;
}

interface CrearPlanificacionInput {
  idServicio?: number;
  idDepartamento?: number;
  anio: number;
  mes: number;
  idUsuarioCreador: number;
}

interface CambiarEstadoPlanificacionInput {
  estado: EstadoPlanificacion;
}

interface DuplicarPlanificacionInput {
  anio: number;
  mes: number;
  copiarRolTurno?: boolean;
}

interface CrearRolTurnoInput {
  idAsignacionPersonal: number;
  idCalendario: number;
  secuenciaDia: number;
  idCodigoOperativoServicio?: number | null;
  idTurno?: number | null;
  idIncidenciaPersonal?: number | null;
  horasProgramadas?: number;
  idUsuarioOperacion: number;
}

type ActualizarRolTurnoInput = CrearRolTurnoInput;

interface AplicarCeldaMatrizInput {
  idAsignacionPersonal: number;
  idCalendario: number;
  secuenciaDia?: number;
  idCodigoOperativoServicio?: number | null;
  idTurno?: number | null;
  idIncidenciaPersonal?: number | null;
  horasProgramadas?: number;
  limpiar?: boolean;
}

interface PublicarPlanificacionInput {
  idUsuarioPublicador: number;
}

interface CerrarPlanificacionInput {
  idUsuarioCierre: number;
}

interface ActualizarObservacionMensualInput {
  tipoObservacion?: string;
  descripcion: string;
}

interface ExportarPlanificacionesLoteInput {
  idsPlanificacion: number[];
  modo?: ModoExportacionRolTurnos;
  estilo?: EstiloExportacionRolTurnos;
  formato?: FormatoExportacionRolTurnos;
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

const buildExportQuery = (modo?: ModoExportacionRolTurnos, estilo?: EstiloExportacionRolTurnos, formato?: FormatoExportacionRolTurnos) =>
  buildQueryString({
    modo,
    estilo,
    formato
  });

export const planificacionApi = {
  getCalendarios: (params: ListarCalendariosParams = {}) =>
    apiClient.get<ApiCollectionResponse<Calendario>>(
      `/v1/calendarios${buildQueryString({
        anio: params.anio,
        mes: params.mes
      })}`
    ),
  generarCalendario: (input: GenerarCalendarioInput) => apiClient.post<ResultadoGeneracionCalendario>('/v1/calendarios/generar', input),
  getFeriados: (params: ListarFeriadosParams = {}) =>
    apiClient.get<ApiCollectionResponse<Feriado>>(
      `/v1/feriados${buildQueryString({
        anio: params.anio,
        mes: params.mes
      })}`
    ),
  createFeriado: (input: GuardarFeriadoInput) => apiClient.post<Feriado>('/v1/feriados', input),
  updateFeriado: (id: number, input: GuardarFeriadoInput) => apiClient.put<Feriado>(`/v1/feriados/${id}`, input),
  deleteFeriado: (id: number) => apiClient.delete(`/v1/feriados/${id}`),
  getPlanificaciones: (params: ListarPlanificacionesParams = {}) =>
    apiClient.get<ApiCollectionResponse<Planificacion>>(
      `/v1/planificaciones${buildQueryString({
        id_servicio: params.idServicio,
        id_departamento: params.idDepartamento,
        id_personal: params.idPersonal,
        anio: params.anio,
        mes: params.mes,
        estado: params.estado,
        page: params.page,
        page_size: params.pageSize
      })}`
    ),
  getPlanificacion: (idPlanificacion: number) => apiClient.get<Planificacion>(`/v1/planificaciones/${idPlanificacion}`),
  getAsignacionesDisponibles: (idPlanificacion: number) =>
    apiClient.get<ApiCollectionResponse<AsignacionPlanificacionDisponible>>(
      `/v1/planificaciones/${idPlanificacion}/asignaciones-disponibles`
    ),
  getRolTurnos: (idPlanificacion: number) =>
    apiClient.get<ApiCollectionResponse<RolTurnoPlanificacion>>(`/v1/planificaciones/${idPlanificacion}/rol-turnos`),
  getResumenPersonal: (idPlanificacion: number) =>
    apiClient.get<ApiCollectionResponse<ResumenPlanificacionPersonal>>(`/v1/planificaciones/${idPlanificacion}/resumen-personal`),
  getResumenCalendario: (idPlanificacion: number) =>
    apiClient.get<ApiCollectionResponse<ResumenPlanificacionCalendario>>(`/v1/planificaciones/${idPlanificacion}/resumen-calendario`),
  getMatrizMensual: (idPlanificacion: number, vista: 'ORIGINAL' | 'EFECTIVA' = 'EFECTIVA') =>
    apiClient.get<MatrizMensualPlanificacion>(`/v1/planificaciones/${idPlanificacion}/matriz-mensual${buildQueryString({ vista })}`),
  getConfiguracionOperativa: (idPlanificacion: number) =>
    apiClient.get<ConfiguracionOperativaPlanificacion>(`/v1/planificaciones/${idPlanificacion}/configuracion-operativa`),
  createPlanificacion: (input: CrearPlanificacionInput) => apiClient.post<Planificacion>('/v1/planificaciones', input),
  deletePlanificacion: (idPlanificacion: number) => apiClient.delete(`/v1/planificaciones/${idPlanificacion}`),
  changePlanificacionEstado: (idPlanificacion: number, input: CambiarEstadoPlanificacionInput) =>
    apiClient.patch<Planificacion>(`/v1/planificaciones/${idPlanificacion}/estado`, input),
  duplicarPlanificacion: (idPlanificacion: number, input: DuplicarPlanificacionInput) =>
    apiClient.post<Planificacion>(`/v1/planificaciones/${idPlanificacion}/duplicar`, input),
  createRolTurno: (idPlanificacion: number, input: CrearRolTurnoInput) =>
    apiClient.post<RolTurnoPlanificacion>(`/v1/planificaciones/${idPlanificacion}/rol-turnos`, input),
  updateRolTurno: (idPlanificacion: number, idRolTurno: number, input: ActualizarRolTurnoInput) =>
    apiClient.patch<RolTurnoPlanificacion>(`/v1/planificaciones/${idPlanificacion}/rol-turnos/${idRolTurno}`, input),
  deleteRolTurno: (idPlanificacion: number, idRolTurno: number, idUsuarioOperacion: number) =>
    apiClient.delete(
      `/v1/planificaciones/${idPlanificacion}/rol-turnos/${idRolTurno}${buildQueryString({
        id_usuario_operacion: idUsuarioOperacion
      })}`
    ),
  applyMatrizCell: (idPlanificacion: number, input: AplicarCeldaMatrizInput) =>
    apiClient.put<CeldaMatrizPlanificacionPersistida>(`/v1/planificaciones/${idPlanificacion}/matriz/celdas`, input),
  // Junta las celdas tocadas en un gesto de arrastre en un solo request: evita
  // que arrastrar el mouse sobre varias decenas de celdas dispare esa misma
  // cantidad de requests HTTP concurrentes (ver decisiones-tecnicas.md).
  // Reintento acotado si el pool de conexiones esta momentaneamente saturado:
  // aplicar-celda-matriz-lote resuelve el mismo estado final sin importar
  // cuantas veces se reintente (upsert por dia/asignacion), asi que reintentar
  // el lote completo es seguro — el usuario no debe notar el bache ni volver
  // a pintar la celda a mano (capa 4 de la estrategia de escalabilidad).
  applyMatrizCeldaLote: (idPlanificacion: number, celdas: AplicarCeldaMatrizInput[]) =>
    withBoundedRetryOnPoolSaturation(() =>
      apiClient.put<CeldaMatrizPlanificacionPersistida[]>(`/v1/planificaciones/${idPlanificacion}/matriz/celdas/lote`, { celdas })
    ),
  getSesionEdicion: (idPlanificacion: number) =>
    apiClient.get<SesionEdicionPlanificacion>(`/v1/planificaciones/${idPlanificacion}/sesion-edicion`),
  latidoSesionEdicion: (idPlanificacion: number) =>
    apiClient.post<SesionEdicionPlanificacion>(`/v1/planificaciones/${idPlanificacion}/sesion-edicion/latido`),
  tomarControlSesionEdicion: (idPlanificacion: number) =>
    apiClient.post<SesionEdicionPlanificacion>(`/v1/planificaciones/${idPlanificacion}/sesion-edicion/tomar-control`),
  liberarSesionEdicion: (idPlanificacion: number) => apiClient.delete(`/v1/planificaciones/${idPlanificacion}/sesion-edicion`),
  liberarTodasMisSesionesEdicion: () => apiClient.delete('/v1/planificaciones/sesiones-edicion/mias'),
  publicarPlanificacion: (idPlanificacion: number, input: PublicarPlanificacionInput) =>
    apiClient.post<Planificacion>(`/v1/planificaciones/${idPlanificacion}/publicar`, input),
  cerrarPlanificacion: (idPlanificacion: number, input: CerrarPlanificacionInput) =>
    apiClient.post<Planificacion>(`/v1/planificaciones/${idPlanificacion}/cerrar`, input),
  updateObservacionMensual: (idPlanificacion: number, idAsignacionPersonal: number, input: ActualizarObservacionMensualInput) =>
    apiClient.put<ObservacionMensualPlanificacion | null>(
      `/v1/planificaciones/${idPlanificacion}/observaciones-mensuales/${idAsignacionPersonal}`,
      input
    ),
  exportPlanificacionExcel: (
    idPlanificacion: number,
    modo: ModoExportacionRolTurnos = 'numerico',
    estilo: EstiloExportacionRolTurnos = 'color',
    formato: FormatoExportacionRolTurnos = 'una-fila'
  ) => apiClient.getBlob(`/v1/planificaciones/${idPlanificacion}/export/excel${buildExportQuery(modo, estilo, formato)}`),
  exportPlanificacionPdf: (
    idPlanificacion: number,
    modo: ModoExportacionRolTurnos = 'numerico',
    estilo: EstiloExportacionRolTurnos = 'color'
  ) => apiClient.getBlob(`/v1/planificaciones/${idPlanificacion}/export/pdf${buildExportQuery(modo, estilo)}`),
  getExportPreviewHtml: (
    idPlanificacion: number,
    modo: ModoExportacionRolTurnos = 'numerico',
    estilo: EstiloExportacionRolTurnos = 'color',
    formato: FormatoExportacionRolTurnos = 'una-fila'
  ) => apiClient.getText(`/v1/planificaciones/${idPlanificacion}/export/preview${buildExportQuery(modo, estilo, formato)}`),
  exportReportePersonalPdf: (idPlanificacion: number, idAsignacion: number) =>
    apiClient.getBlob(`/v1/planificaciones/${idPlanificacion}/reportes/personal/${idAsignacion}/pdf`),
  exportPlanificacionesExcelLote: (input: ExportarPlanificacionesLoteInput) =>
    apiClient.postBlob('/v1/planificaciones/export/excel-lote', input),
  exportPlanificacionesPdfLote: (input: ExportarPlanificacionesLoteInput) =>
    apiClient.postBlob('/v1/planificaciones/export/pdf-lote', input)
};

export type {
  ActualizarRolTurnoInput,
  ActualizarObservacionMensualInput,
  AplicarCeldaMatrizInput,
  CambiarEstadoPlanificacionInput,
  CerrarPlanificacionInput,
  CrearPlanificacionInput,
  CrearRolTurnoInput,
  DuplicarPlanificacionInput,
  GenerarCalendarioInput,
  ExportarPlanificacionesLoteInput,
  ListarCalendariosParams,
  ListarFeriadosParams,
  ListarPlanificacionesParams,
  PublicarPlanificacionInput
};
