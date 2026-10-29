import { Personal } from '../entities/personal';
import { PersonalVinculable } from '../entities/personal-vinculable';
import { AsignacionConsulta } from '../entities/asignacion-consulta';
import { CargaHoraria } from '../entities/carga-horaria';
import { NivelCargoBase } from '../entities/nivel-cargo-base';
import { PersonalDetalle } from '../entities/personal-detalle';
import { RolFuncionalBase } from '../entities/rol-funcional-base';
import { TipoContrato } from '../entities/tipo-contrato';

export interface ListarPersonalFiltro {
  idServicio?: number;
  idDepartamento?: number;
  idNivelCargo?: number;
  rolFuncionalCodigo?: string;
  nombre?: string;
  activo?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ListarAsignacionesFiltro {
  idDepartamento?: number;
  idServicio?: number;
  idPersonal?: number;
  rolFuncionalCodigo?: string;
  nombre?: string;
  activo?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GuardarAsignacionInput {
  idPersonal: number;
  idServicio?: number;
  idDepartamento?: number;
  idTipoContrato: number;
  idCargaHoraria: number;
  idRolFuncional: number;
  nroItem?: string;
  codigoFuenteItem?: string;
  tipoAsignacion: 'PRINCIPAL' | 'SECUNDARIA';
  fechaInicio: string;
  fechaFin?: string | null;
  motivo?: string | null;
  regularizarPlanificacionesAbiertas?: boolean;
  idUsuarioOperacion: number;
}

export type ActualizarAsignacionInput = GuardarAsignacionInput;

// "Mover" es el unico flujo valido para cambiar id_servicio/id_departamento de una
// asignacion (docs/database/decisiones-tecnicas.md seccion 56): cierra la fila actual y
// crea una fila nueva con fecha_inicio propia, en una sola transaccion — nunca reescribe
// la unidad de una fila existente in-place. tipoAsignacion (PRINCIPAL/SECUNDARIA) se
// conserva de la fila de origen, no es configurable aqui.
export interface MoverAsignacionInput {
  idServicio?: number;
  idDepartamento?: number;
  idTipoContrato: number;
  idCargaHoraria: number;
  idRolFuncional: number;
  nroItem?: string;
  codigoFuenteItem?: string;
  fecha?: string;
  motivo?: string | null;
  regularizarPlanificacionesAbiertas?: boolean;
  idUsuarioOperacion: number;
}

export interface CerrarAsignacionInput {
  fechaFin: string;
  motivo?: string | null;
  regularizarPlanificacionesAbiertas?: boolean;
  cerrarSecundariasActivas?: boolean;
  idUsuarioOperacion: number;
}

export interface GuardarPersonalInput {
  codigoPersonal?: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno?: string | null;
  documentoIdentidad: string;
  idNivelCargo: number;
}

export interface GuardarNivelCargoInput {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface CrearTipoContratoInput {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface ActualizarTipoContratoInput {
  nombre: string;
  descripcion: string | null;
}

export interface GuardarCargaHorariaInput {
  codigo: string;
  nombre: string;
  horasDiaBase: number;
  descripcion?: string | null;
  activo?: boolean;
}

export abstract class PersonalRepository {
  abstract listar(filtro: ListarPersonalFiltro): Promise<Personal[]>;

  abstract obtenerPorId(idPersonal: number): Promise<Personal | null>;

  // Proyeccion minima para vincular personal a un usuario (Seguridad); ver
  // domain/entities/personal-vinculable.ts.
  abstract listarVinculablesUsuario(): Promise<PersonalVinculable[]>;

  abstract obtenerDetalle(idPersonal: number): Promise<PersonalDetalle | null>;

  abstract obtenerAsignacionPorId(
    idAsignacion: number,
  ): Promise<AsignacionConsulta | null>;

  abstract obtenerJefaturaActivaEnUnidad(params: {
    idServicio?: number | null;
    idDepartamento?: number | null;
  }): Promise<AsignacionConsulta | null>;

  abstract listarAsignaciones(
    filtro: ListarAsignacionesFiltro,
  ): Promise<AsignacionConsulta[]>;

  abstract crearAsignacion(
    input: GuardarAsignacionInput,
  ): Promise<AsignacionConsulta>;

  abstract actualizarAsignacion(
    idAsignacion: number,
    input: ActualizarAsignacionInput,
  ): Promise<AsignacionConsulta>;

  abstract moverAsignacion(
    idAsignacion: number,
    input: MoverAsignacionInput,
  ): Promise<AsignacionConsulta>;

  abstract cerrarAsignacion(
    idAsignacion: number,
    input: CerrarAsignacionInput,
  ): Promise<AsignacionConsulta>;

  abstract crearPersonal(input: GuardarPersonalInput): Promise<Personal>;

  abstract actualizarPersonal(
    idPersonal: number,
    input: GuardarPersonalInput,
  ): Promise<Personal>;

  abstract activarPersonal(idPersonal: number): Promise<void>;

  abstract desactivarPersonal(idPersonal: number): Promise<void>;

  abstract listarNivelesCargo(): Promise<NivelCargoBase[]>;

  abstract crearNivelCargo(
    input: GuardarNivelCargoInput,
  ): Promise<NivelCargoBase>;

  abstract actualizarNivelCargo(
    idNivelCargo: number,
    input: GuardarNivelCargoInput,
  ): Promise<NivelCargoBase>;

  abstract activarNivelCargo(idNivelCargo: number): Promise<void>;

  abstract desactivarNivelCargo(idNivelCargo: number): Promise<void>;

  abstract listarCargasHorarias(): Promise<CargaHoraria[]>;

  abstract crearCargaHoraria(
    input: GuardarCargaHorariaInput,
  ): Promise<CargaHoraria>;

  abstract actualizarCargaHoraria(
    idCargaHoraria: number,
    input: GuardarCargaHorariaInput,
  ): Promise<CargaHoraria>;

  abstract activarCargaHoraria(idCargaHoraria: number): Promise<void>;

  abstract desactivarCargaHoraria(idCargaHoraria: number): Promise<void>;

  abstract listarTiposContrato(): Promise<TipoContrato[]>;

  abstract obtenerTipoContratoPorId(
    idTipoContrato: number,
  ): Promise<TipoContrato | null>;

  abstract existeTipoContratoConCodigo(codigo: string): Promise<boolean>;

  abstract crearTipoContrato(
    input: CrearTipoContratoInput,
  ): Promise<TipoContrato>;

  abstract actualizarTipoContrato(
    idTipoContrato: number,
    input: ActualizarTipoContratoInput,
  ): Promise<TipoContrato>;

  abstract cambiarEstadoTipoContrato(
    idTipoContrato: number,
    activo: boolean,
  ): Promise<void>;

  abstract listarRolesFuncionales(): Promise<RolFuncionalBase[]>;

  abstract obtenerRolFuncionalPorId(
    idRolFuncional: number,
  ): Promise<RolFuncionalBase | null>;

  abstract existePlanificacionAbiertaParaAsignacion(
    idAsignacion: number,
  ): Promise<boolean>;

  // Version publica de la misma deteccion, para exponer el conflicto (si
  // existe) al frontend antes de que el usuario intente cerrar/mover una
  // asignacion (docs/database/decisiones-tecnicas.md seccion 50).
  abstract obtenerConflictoPlanificacionAbiertaParaAsignacion(
    idAsignacion: number,
  ): Promise<ConflictoPlanificacionAsignacion | null>;

  // Misma busqueda que usa moverAsignacion para decidir si el destino de un
  // traslado tiene planificacion aprobada vigente, expuesta aparte para que
  // el frontend pueda consultarla antes de confirmar (docs/integracion/
  // estrategia-integracion-asistencia-y-cambios-planificacion.md seccion 12).
  abstract obtenerPlanificacionAprobadaPorUnidadYFecha(params: {
    idServicio?: number | null;
    idDepartamento?: number | null;
    fecha: string;
  }): Promise<EstadoPlanificacionAprobadaUnidad | null>;
}

export interface ConflictoPlanificacionAsignacion {
  idPlanificacion: number;
  unidadNombre: string;
  periodo: string;
  estado: 'BORRADOR' | 'REVISION' | 'APROBADA';
}

export interface EstadoPlanificacionAprobadaUnidad {
  idPlanificacion: number;
  unidadNombre: string;
  periodo: string;
}
