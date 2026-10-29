import { Calendario } from '../entities/calendario';

export interface ListarCalendariosFiltro {
  anio?: number;
  mes?: number;
}

export interface ResultadoGeneracionCalendario {
  anio: number;
  mes?: number;
  totalDias: number;
  diasGenerados: number;
  diasExistentes: number;
}

export abstract class CalendarioRepository {
  abstract listar(filtro: ListarCalendariosFiltro): Promise<Calendario[]>;
  abstract obtenerPorId(id: number): Promise<Calendario | null>;
  abstract existeMes(anio: number, mes: number): Promise<boolean>;
  abstract asegurarAnio(anio: number): Promise<ResultadoGeneracionCalendario>;
  abstract asegurarMes(
    anio: number,
    mes: number,
  ): Promise<ResultadoGeneracionCalendario>;
}
