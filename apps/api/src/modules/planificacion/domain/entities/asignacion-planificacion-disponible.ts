export interface AsignacionPlanificacionDisponible {
  idAsignacionPersonal: number;
  idPersonal: number;
  codigoPersonal: string | null;
  nroItem?: string | null;
  idCargaHoraria?: number | null;
  codigoCargaHoraria?: string | null;
  nombreCargaHoraria?: string | null;
  horasDiaBase?: number | null;
  ci?: string | null;
  idTipoContrato?: number | null;
  codigoTipoContrato?: string | null;
  nombreTipoContrato?: string | null;
  codigoFuenteItem?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  nombres?: string | null;
  nombreCompleto: string;
  cargoActual?: string | null;
  rolFuncionalCodigo?: string | null;
  rolFuncionalNombre?: string | null;
  esJefatura?: boolean;
  servicioCodigo?: string | null;
  servicioNombre?: string | null;
  esPrincipal: boolean;
  ordenVisualCargo?: number | null;
}
