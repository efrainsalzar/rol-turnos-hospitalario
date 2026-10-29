import { Turno, TipoHorario } from '../entities/turno';
import {
  ImpactoUsoCatalogo,
  ResultadoLimpiezaCeldas,
  ResultadoPropagacionHorario,
} from '../entities/impacto-uso-catalogo';

export interface ListarTurnosFiltro {
  idDepartamento?: number;
  idServicio?: number;
  activo?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GuardarTramoInput {
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
}

export interface GuardarTurnoInput {
  idServicio: number | null;
  idDepartamento: number | null;
  codigo: string;
  nombre: string;
  tipoHorario: TipoHorario;
  horaInicio: string;
  horaFin: string;
  cruzaMedianoche: boolean;
  duracionHoras: number;
  tramos: GuardarTramoInput[];
  vigenciaDesde: string;
  vigenciaHasta: string | null;
  activo: boolean;
  codigoVisual?: string;
  etiqueta?: string;
}

export abstract class TurnoRepository {
  abstract listar(filtro: ListarTurnosFiltro): Promise<Turno[]>;
  abstract contar(filtro: ListarTurnosFiltro): Promise<number>;
  abstract obtenerPorId(id: number): Promise<Turno | null>;
  abstract crear(input: GuardarTurnoInput): Promise<Turno>;
  abstract actualizar(id: number, input: GuardarTurnoInput): Promise<Turno>;
  abstract activar(id: number): Promise<void>;
  abstract desactivar(id: number): Promise<void>;

  /** Cuenta celdas de rol_turno que referencian este turno en planificaciones no CERRADA. */
  abstract obtenerImpactoUso(id: number): Promise<ImpactoUsoCatalogo>;

  /** Actualiza horas_programadas de las celdas afectadas al nuevo valor del turno. */
  abstract propagarHorarioACeldas(
    id: number,
    duracionHoras: number,
    idUsuarioOperacion: number,
  ): Promise<ResultadoPropagacionHorario>;

  /** Elimina fisicamente las celdas afectadas (no se puede dejar una celda sin turno ni incidencia_personal). */
  abstract limpiarCeldasAsociadas(id: number): Promise<ResultadoLimpiezaCeldas>;
}
