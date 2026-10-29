import { TipoFeriado } from '../entities/tipo-feriado';

export interface GuardarTipoFeriadoInput {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  orden: number;
  activo: boolean;
}

export abstract class TipoFeriadoRepository {
  abstract listar(): Promise<TipoFeriado[]>;
  abstract obtenerPorCodigo(codigo: string): Promise<TipoFeriado | null>;
  abstract obtenerPorId(id: number): Promise<TipoFeriado | null>;
  abstract crear(input: GuardarTipoFeriadoInput): Promise<TipoFeriado>;
  abstract actualizar(
    id: number,
    input: GuardarTipoFeriadoInput,
  ): Promise<TipoFeriado>;
  abstract desactivar(id: number): Promise<void>;
}
