import { IncidenciaPersonalScope } from '../entities/incidencia-personal-scope';
import { IncidenciaPersonal } from '../entities/incidencia-personal';
import {
  ImpactoUsoCatalogo,
  ResultadoLimpiezaCeldas,
} from '../entities/impacto-uso-catalogo';

export interface GuardarIncidenciaPersonalInput {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  esLaborable: boolean;
  generaHorasTrabajadas: boolean;
  computaParaMetaHoras: boolean;
  requiereRespaldo: boolean;
  activo: boolean;
}

export interface ListarIncidenciasPersonalesFiltro {
  alcance?: IncidenciaPersonalScope;
}

export abstract class IncidenciaPersonalRepository {
  abstract listar(
    filtro?: ListarIncidenciasPersonalesFiltro,
  ): Promise<IncidenciaPersonal[]>;
  abstract obtenerPorId(id: number): Promise<IncidenciaPersonal | null>;
  abstract crear(
    input: GuardarIncidenciaPersonalInput,
  ): Promise<IncidenciaPersonal>;
  abstract actualizar(
    id: number,
    input: GuardarIncidenciaPersonalInput,
  ): Promise<IncidenciaPersonal>;
  abstract desactivar(id: number): Promise<void>;

  /** Cuenta celdas de rol_turno que referencian este incidencia_personal en planificaciones no CERRADA. */
  abstract obtenerImpactoUso(id: number): Promise<ImpactoUsoCatalogo>;

  /** Elimina fisicamente las celdas afectadas (no se puede dejar una celda sin turno ni incidencia_personal). */
  abstract limpiarCeldasAsociadas(id: number): Promise<ResultadoLimpiezaCeldas>;
}
