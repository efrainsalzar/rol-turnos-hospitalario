export interface ApiCollectionResponse<T> {
  data: T[];
  meta: {
    total: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
}

export interface HealthReadyResponse {
  status: string;
  server: string;
  database: string;
  dialect: string;
  details: {
    currentDatabase: string;
    hasSchemaMigrationTable: boolean;
    appliedMigrations: number;
    baselineTableCount: number;
  };
}

export interface HealthDatabaseResponse {
  status: string;
  server: string;
  database: string;
  dialect: string;
  details: {
    sqlServerVersion: string;
    currentDatabase: string;
    systemUser: string;
    currentUser: string;
  };
}

export interface Departamento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  cantidadPersonalActivo?: number;
}

export interface JefaturaActiva {
  idAsignacion: number;
  idPersonal: number;
  nombreCompleto: string;
}

export type TipoServicio = 'SERVICIO' | 'UNIDAD';

export interface Servicio {
  id: number;
  idDepartamento: number;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipoServicio: TipoServicio;
  cantidadPersonalActivo: number;
  activo: boolean;
}

export interface ServicioDetalle {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  tipoServicio: TipoServicio;
  activo: boolean;
  departamento: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  };
  cantidadPersonalActivo: number;
  jefaServicio: {
    idPersonal: number;
    codigoPersonal: string | null;
    nombreCompleto: string;
    codigoRolFuncional: string | null;
    nombreRolFuncional: string | null;
  } | null;
  turnos: Turno[];
}

export interface GuardarDepartamentoInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface GuardarServicioInput {
  idDepartamento: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoServicio: TipoServicio;
  activo?: boolean;
}

export interface Personal {
  id: number;
  codigoPersonal: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  idNivelCargo: number;
  codigoNivelCargo: string | null;
  nombreNivelCargo: string | null;
  // El detalle de asignacion (servicio, rol, item, carga horaria) vive solo en
  // /personal/asignaciones y en la Ficha de personal, no en este listado — ver
  // docs/database/decisiones-tecnicas.md seccion 78.
  tieneAsignacionActiva: boolean;
  activo: boolean;
  nombreCompleto: string;
}

// Proyeccion propia de Seguridad/Usuarios para vincular personal a un usuario;
// no confundir con Personal (identidad, catalogo base) — ver
// docs/database/decisiones-tecnicas.md seccion 78.
export interface PersonalVinculableUsuario {
  id: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  idServicioPrincipal: number | null;
  nombreServicioPrincipal: string | null;
  idDepartamentoPrincipal: number | null;
  nombreDepartamentoPrincipal: string | null;
  esJefaturaRolFuncional: boolean;
}

export interface Asignacion {
  id: number;
  idPersonal: number;
  codigoPersonal: string | null;
  ci: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  nombres: string;
  nombreCompleto: string;
  idServicio: number | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  idDepartamento: number | null;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  nombreNivelCargo: string | null;
  idTipoContrato: number;
  codigoTipoContrato: string | null;
  nombreTipoContrato: string | null;
  idRolFuncional: number | null;
  codigoRolFuncional: string | null;
  nombreRolFuncional: string | null;
  esJefaturaRolFuncional: boolean;
  codigoFuenteItem: string | null;
  idCargaHoraria: number | null;
  codigoCargaHoraria: string | null;
  nombreCargaHoraria: string | null;
  nroItem: string | null;
  tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
  fechaInicio: string;
  fechaFin: string | null;
  activo: boolean;
  tieneUsuario: boolean;
}

// Usado por AsignacionEditDialog (traslado) y AsignacionCloseDialog (cierre): un
// solo tipo compartido en vez de duplicarlo en cada componente, para que agregar
// un campo (como `destino`) no desalinee silenciosamente una de las copias.
export interface ConflictoPlanificacionAsignacion {
  idAsignacion: number;
  tieneConflicto: boolean;
  unidadNombre: string | null;
  periodo: string | null;
  tienePlanificacionAprobada: boolean;
  planificacionAprobada: {
    id: number;
    unidadNombre: string;
    periodo: string;
  } | null;
  // null mientras no se evalua el destino (todavia no se elige una unidad
  // distinta a la actual, o el origen no tiene planificacion aprobada que
  // proteger). Si se evalua, tienePlanificacionAprobada siempre viene resuelto.
  destino: {
    tienePlanificacionAprobada: boolean;
    planificacionAprobada: {
      id: number;
      unidadNombre: string;
      periodo: string;
    } | null;
  } | null;
}

export interface NivelCargoBase {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CargaHoraria {
  id: number;
  codigo: string;
  nombre: string;
  horasDiaBase: number;
  descripcion: string | null;
  activo: boolean;
}

export interface TipoContrato {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface RolFuncionalBase {
  id: number;
  codigo: string;
  nombre: string;
  alcanceOrganizativo: string;
  esJefatura: boolean;
  activo: boolean;
}

export interface PersonalDetalle {
  id: number;
  codigoPersonal: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  nombreCompleto: string;
  activo: boolean;
  cargoActual: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  } | null;
  usuario: {
    id: number;
    username: string;
    tipoUsuario: string;
    activo: boolean;
    rolSeguridad: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    } | null;
  } | null;
  rolFuncionalActual: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
    esJefatura: boolean;
  } | null;
  servicioActual: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  } | null;
  departamentoActual: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  } | null;
  asignacionesVigentes: Asignacion[];
  asignacionesHistoricas: Array<{
    id: number;
    idAsignacionPersonal: number;
    fechaEvento: string;
    tipoEvento: string;
    fechaInicioAsignacion: string;
    fechaFinAsignacion: string | null;
    servicioOrigen: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    };
    servicioDestino: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    };
    departamentoOrigen: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    };
    departamentoDestino: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    };
    rolFuncionalOrigen: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    };
    rolFuncionalDestino: {
      id: number | null;
      codigo: string | null;
      nombre: string | null;
    };
    motivo: string | null;
    usuario: {
      id: number;
      username: string | null;
    } | null;
  }>;
}

export interface RolSeguridad {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  alcancePlanificacion: AlcancePlanificacionUsuario;
  permisos: UsuarioPermisosOperativos;
  capacidades: UsuarioCapacidadesOperativas;
}

export interface Usuario {
  id: number;
  username: string;
  tipoUsuario: string;
  proveedorAutenticacion: string;
  sujetoAutenticacion: string;
  identidadLocalHabilitada: boolean;
  activo: boolean;
  rolSeguridad: {
    id: number;
    codigo: string;
    nombre: string;
  } | null;
  personal: {
    id: number | null;
    codigoPersonal: string | null;
    nombreCompleto: string | null;
  } | null;
}

export interface OpcionLoginLocal {
  idUsuario: number;
  username: string;
  nombreCompleto: string | null;
  codigoRol: string | null;
  nombreRol: string | null;
}

export interface SesionAutenticada {
  tokenSesion: string;
  sesion: UsuarioSesion;
}

export type AlcancePlanificacionUsuario = 'SISTEMA' | 'DEPARTAMENTO' | 'SERVICIO' | 'LECTURA';

export interface UsuarioSesion {
  id: number;
  username: string;
  tipoUsuario: string;
  proveedorAutenticacion: string;
  sujetoAutenticacion: string | null;
  identidadLocalHabilitada: boolean;
  activo: boolean;
  rolSeguridad: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  personal: {
    id: number | null;
    codigoPersonal: string | null;
    nombreCompleto: string | null;
  };
  alcancePlanificacion: AlcancePlanificacionUsuario;
  puedeGestionarPlanificacion: boolean;
  puedeGestionarTodo: boolean;
  permisos: UsuarioPermisosOperativos;
  capacidades?: UsuarioCapacidadesOperativas;
  departamentosGestionables: Array<{
    id: number;
    codigo: string;
    nombre: string;
  }>;
  serviciosGestionables: Array<{
    id: number;
    idDepartamento: number;
    codigo: string;
    nombre: string;
    codigoDepartamento: string | null;
    nombreDepartamento: string | null;
  }>;
}

export interface IncidenciaPersonal {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  alcance: 'GENERAL' | 'PERSONAL' | 'OTRO';
  esLaborable: boolean;
  generaHorasTrabajadas: boolean;
  computaParaMetaHoras: boolean;
  requiereRespaldo: boolean;
  activo: boolean;
}

export interface GuardarIncidenciaPersonalInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  alcance?: 'GENERAL' | 'PERSONAL';
  esLaborable?: boolean;
  generaHorasTrabajadas?: boolean;
  computaParaMetaHoras?: boolean;
  requiereRespaldo?: boolean;
  activo?: boolean;
}

export interface TramoDto {
  id: number;
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
  activo: boolean;
}

export interface Turno {
  id: number;
  idServicio: number | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  idDepartamento: number | null;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  codigo: string;
  nombre: string;
  codigoVisual: string | null;
  etiquetaVisual: string | null;
  tipoHorario: 'CONTINUO' | 'DISCONTINUO';
  horaInicio: string;
  horaFin: string;
  cruzaMedianoche: boolean;
  duracionHoras: number;
  tramos: TramoDto[];
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  activo: boolean;
}

export interface ConfiguracionOperativaPlanificacion {
  planificacion: {
    id: number;
    idServicio: number | null;
    codigoServicio: string | null;
    nombreServicio: string | null;
  };
  servicio: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigosPermitidos: Array<{
    id: number;
    origen: 'TURNO' | 'TIPO_DIA';
    idTurno: number | null;
    idIncidenciaPersonal: number | null;
    alcanceIncidenciaPersonal: 'GENERAL' | 'PERSONAL' | 'OTRO' | null;
    codigo: string;
    etiqueta: string;
    descripcion: string | null;
    horas: number;
    horaInicio: string | null;
    horaFin: string | null;
    tramos: Array<{
      orden: number;
      horaInicio: string;
      horaFin: string;
      duracionHoras: number;
      cruzaMedianoche: boolean;
    }>;
    categoria: 'TRABAJO' | 'DESCANSO' | 'LICENCIA' | 'VACACION' | 'FERIADO';
    color: string | null;
    esLaborable: boolean;
    requiereConfirmacion: boolean;
  }>;
}

export interface ConfiguracionOperativaServicio {
  servicio: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  };
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: Array<{
    id: number;
    origen: 'TURNO' | 'TIPO_DIA';
    idTurno: number | null;
    idIncidenciaPersonal: number | null;
    codigo: string;
    etiqueta: string;
    descripcion: string | null;
    horas: number;
    horaInicio: string | null;
    horaFin: string | null;
    categoria: 'TRABAJO' | 'DESCANSO' | 'LICENCIA' | 'VACACION' | 'FERIADO';
    color: string | null;
    ordenVisual: number;
    esLaborable: boolean;
    requiereConfirmacion: boolean;
    activo: boolean;
  }>;
}

export interface GuardarConfiguracionOperativaServicioInput {
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: Array<{
    id: number;
    codigoVisual: string;
    etiqueta: string;
    descripcion?: string;
    color?: string;
    ordenVisual: number;
    activo: boolean;
  }>;
}

export interface GuardarTurnoInput {
  idServicio?: number | null;
  idDepartamento?: number | null;
  codigo: string;
  nombre: string;
  tipoHorario?: 'CONTINUO' | 'DISCONTINUO';
  horaInicio?: string;
  horaFin?: string;
  tramos?: Array<{ horaInicio: string; horaFin: string }>;
  // Opcional: el backend completa/conserva vigenciaDesde (crear = hoy, editar =
  // conserva la existente) si no llega (docs/database/decisiones-tecnicas.md
  // seccion 49).
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  activo?: boolean;
  codigoVisual?: string;
  etiqueta?: string;
  estrategiaCeldasExistentes?: 'PROPAGAR' | 'LIMPIAR';
}

export interface ImpactoUsoPlanificacion {
  id: number;
  anio: number;
  mes: number;
  estado: string;
  totalCeldas: number;
}

export interface ImpactoUsoCatalogo {
  totalCeldas: number;
  totalPlanificaciones: number;
  planificaciones: ImpactoUsoPlanificacion[];
}

export interface ConfiguracionOperativaDepartamento {
  departamento: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  };
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: Array<{
    id: number;
    origen: 'TURNO' | 'TIPO_DIA';
    idTurno: number | null;
    idIncidenciaPersonal: number | null;
    codigo: string;
    etiqueta: string;
    descripcion: string | null;
    horas: number;
    horaInicio: string | null;
    horaFin: string | null;
    categoria: 'TRABAJO' | 'DESCANSO' | 'LICENCIA' | 'VACACION' | 'FERIADO';
    color: string | null;
    ordenVisual: number;
    esLaborable: boolean;
    requiereConfirmacion: boolean;
    activo: boolean;
  }>;
}

export interface PatchCodigoVisualInput {
  codigoVisual?: string;
  etiqueta?: string;
  color?: string;
}

export type EstadoPlanificacion = 'BORRADOR' | 'REVISION' | 'APROBADA' | 'CERRADA';
export type ModoExportacionRolTurnos = 'etiquetas' | 'numerico';
export type EstiloExportacionRolTurnos = 'color' | 'texto';
export type FormatoExportacionRolTurnos = 'una-fila' | 'multi-horario';

export interface Calendario {
  id: number;
  fecha: string;
  anio: number;
  mes: number;
  diaMes: number;
  diaSemanaNum: number;
  diaSemanaNombre: string;
  semanaMes: number | null;
  esFinSemana: boolean;
  esFeriado: boolean;
  codigoFeriado: string | null;
  nombreFeriado: string | null;
}

export interface UsuarioPermisosOperativos {
  puedeVerOrganizacion: boolean;
  puedeVerPersonal: boolean;
  puedeGestionarPersonal: boolean;
  puedeVerAsignaciones: boolean;
  puedeGestionarAsignaciones: boolean;
  puedeVerSeguridad: boolean;
  puedeGestionarUsuarios: boolean;
  puedeVerOperacion: boolean;
  puedeVerPlanificacion: boolean;
  puedeEditarPlanificacion: boolean;
  puedeAprobarPlanificacion: boolean;
  puedeVerReportes: boolean;
}

export interface UsuarioCapacidadesOperativas {
  verCalendarios: boolean;
  gestionarCalendarios: boolean;
  verIncidenciasPersonales: boolean;
  gestionarIncidenciasPersonales: boolean;
  gestionarTiposFeriado: boolean;
  verCargasHorarias: boolean;
  gestionarCargasHorarias: boolean;
  verTurnos: boolean;
  crearPlanificacion: boolean;
  editarPlanificacion: boolean;
  enviarRevisionPlanificacion: boolean;
  volverBorradorPlanificacion: boolean;
  aprobarPlanificacion: boolean;
  cerrarPlanificacion: boolean;
  exportarPlanificacion: boolean;
  exportarPlanificacionLote: boolean;
  gestionarCodigosOperativos: boolean;
  gestionarTurnos: boolean;
  gestionarServicios: boolean;
}

export interface GuardarRolSeguridadInput {
  codigo: string;
  nombre: string;
  activo?: boolean;
  alcancePlanificacion: AlcancePlanificacionUsuario;
  permisos: UsuarioPermisosOperativos;
  capacidades: UsuarioCapacidadesOperativas;
}

export interface TipoFeriado {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
  activo: boolean;
}

export interface GuardarTipoFeriadoInput {
  codigo: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
}

// Entidad real: un feriado puede abarcar varios dias consecutivos y un mes
// puede tener varios feriados, del mismo tipo o de tipos distintos
// (docs/database/decisiones-tecnicas.md seccion 58).
export interface Feriado {
  id: number;
  idTipoFeriado: number;
  codigoTipoFeriado: string;
  nombreTipoFeriado: string;
  nombre: string;
  anio: number;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface GuardarFeriadoInput {
  idTipoFeriado: number;
  nombre: string;
  anio: number;
  mes: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

export interface ResultadoGeneracionCalendario {
  anio: number;
  mes?: number;
  totalDias: number;
  diasGenerados: number;
  diasExistentes: number;
}

export interface Planificacion {
  id: number;
  idServicio: number | null;
  idDepartamento: number | null;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  cantidadPersonalPlanificable: number;
  anio: number;
  mes: number;
  version: number;
  estado: EstadoPlanificacion;
  activo: boolean;
  fechaInicio: string;
  fechaFin: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AsignacionPlanificacionDisponible {
  idAsignacionPersonal: number;
  idPersonal: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  esPrincipal: boolean;
  nroItem?: string | null;
  cargaHorariaCodigo?: string | null;
  cargaHorariaNombre?: string | null;
  horasDiaBase?: number | null;
  ci?: string | null;
  tipoContratoCodigo?: string | null;
  tipoContratoNombre?: string | null;
  codigoFuenteItem?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  nombres?: string | null;
  cargoActual?: string | null;
  rolFuncionalCodigo?: string | null;
  rolFuncionalNombre?: string | null;
  esJefatura?: boolean;
  servicioCodigo?: string | null;
  servicioNombre?: string | null;
}

export interface RolTurnoPlanificacion {
  id: number;
  idPlanificacion: number;
  idAsignacionPersonal: number;
  idCalendario: number;
  fecha: string;
  diaMes: number;
  diaSemanaNombre: string;
  secuenciaDia: number;
  idTurno: number | null;
  codigoTurno: string | null;
  nombreTurno: string | null;
  idIncidenciaPersonal: number | null;
  codigoIncidenciaPersonal: string | null;
  nombreIncidenciaPersonal: string | null;
  horasProgramadas: number;
  origenRegistro: string;
  idPersonal: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  cruzaMedianoche?: boolean | null;
}

export interface CeldaMatrizPlanificacionPersistida {
  idRolTurno: number | null;
  secuenciaDia: number | null;
  idTurno: number | null;
  codigoTurno: string | null;
  nombreTurno: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  cruzaMedianoche: boolean | null;
  idIncidenciaPersonal: number | null;
  codigoIncidenciaPersonal: string | null;
  nombreIncidenciaPersonal: string | null;
  horasProgramadas: number | null;
}

export interface SesionEdicionPlanificacion {
  ocupada: boolean;
  codigoRolEditor: string | null;
  etiquetaRolEditor: string | null;
  adquiridoEn: string | null;
  ultimoLatido: string | null;
  esPropia: boolean;
  puedeTomarControl: boolean;
}

export interface ResumenPlanificacionPersonal {
  idAsignacionPersonal: number;
  idPersonal: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  idServicio: number | null;
  codigoServicio: string | null;
  nombreServicio: string | null;
  totalRegistros: number;
  totalTurnos: number;
  totalIncidenciasPersonales: number;
  totalDiasProgramados: number;
  totalHorasProgramadas: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
}

export interface ResumenPlanificacionCalendario {
  idCalendario: number;
  fecha: string;
  anio: number;
  mes: number;
  diaMes: number;
  diaSemanaNombre: string;
  esFinSemana: boolean;
  esFeriado: boolean;
  codigoFeriado: string | null;
  nombreFeriado: string | null;
  totalRegistros: number;
  totalTurnos: number;
  totalIncidenciasPersonales: number;
  totalPersonasProgramadas: number;
  totalHorasProgramadas: number;
}

export interface MatrizMensualPlanificacion {
  planificacion: Pick<
    Planificacion,
    | 'id'
    | 'idServicio'
    | 'idDepartamento'
    | 'codigoDepartamento'
    | 'nombreDepartamento'
    | 'codigoServicio'
    | 'nombreServicio'
    | 'anio'
    | 'mes'
    | 'version'
    | 'estado'
    | 'fechaInicio'
    | 'fechaFin'
    | 'fechaPublicacion'
    | 'fechaCierre'
    | 'createdAt'
    | 'updatedAt'
  >;
  dias: Array<{
    idCalendario: number;
    fecha: string;
    anio: number;
    mes: number;
    diaMes: number;
    diaSemanaNombre: string;
    abreviaturaDiaSemana: string;
    esFinSemana: boolean;
    esFeriado: boolean;
    codigoFeriado: string | null;
    nombreFeriado: string | null;
  }>;
  filas: Array<{
    numeroFila: number;
    idAsignacionPersonal: number;
    idPersonal: number;
    codigoPersonal: string | null;
    nroItem: string | null;
    cargaHorariaCodigo: string | null;
    cargaHorariaNombre: string | null;
    horasDiaBase: number | null;
    ci: string | null;
    tipoContratoCodigo: string | null;
    tipoContratoNombre: string | null;
    codigoFuenteItem: string | null;
    apellidoPaterno: string | null;
    apellidoMaterno: string | null;
    nombres: string | null;
    nombreCompleto: string;
    cargoActual: string | null;
    rolFuncionalCodigo: string | null;
    rolFuncionalNombre: string | null;
    esJefatura: boolean;
    servicioCodigo: string | null;
    servicioNombre: string | null;
    // Presente cuando esta fila es destino de un traslado desde una
    // planificacion aprobada: sus celdas antes de fechaEfectiva no pueden
    // tener turno (la persona aun no estaba aqui).
    ajustePorTraslado: {
      idCambio: number;
      fechaEfectiva: string;
    } | null;
    dias: Array<{
      idCalendario: number;
      fecha: string;
      diaMes: number;
      valorVisual: string;
      observacionDiaria: string | null;
      tipoObservacionDiaria: string | null;
      registros: Array<{
        idRolTurno: number;
        secuenciaDia: number;
        tipo: 'TURNO' | 'TIPO_DIA';
        codigo: string | null;
        nombre: string | null;
        horasProgramadas: number;
        horaInicio: string | null;
        horaFin: string | null;
        cruzaMedianoche: boolean | null;
        tramos: Array<{
          orden: number;
          horaInicio: string;
          horaFin: string;
          duracionHoras: number;
          cruzaMedianoche: boolean;
        }>;
      }>;
    }>;
    totalHorasMes: number;
    horarioResumen: string;
    observacionMensual: string | null;
  }>;
  resumen: {
    totalPersonas: number;
    totalDias: number;
    totalRegistros: number;
    totalHorasMes: number;
  };
}

export interface ObservacionMensualPlanificacion {
  id: number;
  idPlanificacion: number;
  idAsignacionPersonal: number;
  tipoObservacion: string;
  descripcion: string;
  createdBy: number;
  createdAt: string;
}
