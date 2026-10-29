import { EstadoPlanificacion, Planificacion } from '../entities/planificacion';

export interface ListarPlanificacionesFiltro {
  idServicio?: number;
  idDepartamento?: number;
  /** Filtra planificaciones donde este personal tiene turnos registrados (vigentes o en historial). */
  idPersonal?: number;
  anio?: number;
  mes?: number;
  estado?: EstadoPlanificacion;
  /**
   * Restringe el resultado a esta lista de periodos (anio+mes) cuando el
   * actor es una jefatura sin anio/mes explicito en el filtro — reemplaza en
   * SQL la ventana de "mes anterior/actual/siguiente" que antes se aplicaba
   * en memoria via PlanificacionAccessPolicyService.
   */
  periodosPermitidos?: { anio: number; mes: number }[];
  page?: number;
  pageSize?: number;
}

export abstract class PlanificacionRepository {
  abstract listar(
    filtro: ListarPlanificacionesFiltro,
  ): Promise<Planificacion[]>;

  abstract obtenerPorId(id: number): Promise<Planificacion | null>;

  abstract obtenerNombreServicio(idServicio: number): Promise<string | null>;

  abstract obtenerNombreDepartamento(
    idDepartamento: number,
  ): Promise<string | null>;

  abstract existePersonalActivoEnServicio(idServicio: number): Promise<boolean>;

  abstract existePersonalActivoEnDepartamento(
    idDepartamento: number,
  ): Promise<boolean>;

  abstract existeUsuario(idUsuario: number): Promise<boolean>;

  abstract obtenerSiguienteVersion(
    idServicio: number | null,
    idDepartamento: number | null,
    anio: number,
    mes: number,
  ): Promise<number>;

  abstract existePlanificacionActivaPeriodo(input: {
    idServicio: number | null;
    idDepartamento: number | null;
    anio: number;
    mes: number;
    excluirIdPlanificacion?: number;
  }): Promise<boolean>;

  abstract crearBorrador(input: {
    idServicio: number | null;
    idDepartamento: number | null;
    anio: number;
    mes: number;
    version: number;
    fechaInicio: Date;
    fechaFin: Date;
    idUsuarioCreador: number;
  }): Promise<Planificacion>;

  abstract cambiarEstado(
    idPlanificacion: number,
    estado: EstadoPlanificacion,
    idUsuarioOperacion: number,
  ): Promise<Planificacion>;

  abstract eliminarLogico(idPlanificacion: number): Promise<void>;

  abstract publicar(
    idPlanificacion: number,
    idUsuarioPublicador: number,
  ): Promise<Planificacion>;

  abstract cerrar(
    idPlanificacion: number,
    idUsuarioCierre: number,
  ): Promise<Planificacion>;
}
