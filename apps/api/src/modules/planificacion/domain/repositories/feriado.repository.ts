import { Feriado } from '../entities/feriado';

export interface ListarFeriadosFiltro {
  anio?: number;
  mes?: number;
  activo?: boolean;
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

export abstract class FeriadoRepository {
  abstract listar(filtro: ListarFeriadosFiltro): Promise<Feriado[]>;
  abstract obtenerPorId(id: number): Promise<Feriado | null>;
  abstract crear(input: GuardarFeriadoInput): Promise<Feriado>;
  abstract actualizar(id: number, input: GuardarFeriadoInput): Promise<Feriado>;
  abstract desactivar(id: number): Promise<void>;
}
