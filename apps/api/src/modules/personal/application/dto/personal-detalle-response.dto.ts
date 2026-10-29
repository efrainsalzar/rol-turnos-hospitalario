import { AsignacionResponseDto } from './asignacion-response.dto';

export interface PersonalDetalleResponseDto {
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
  asignacionesVigentes: AsignacionResponseDto[];
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
