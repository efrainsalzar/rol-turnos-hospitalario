import type { GuardarDepartamentoDto } from '../../application/dto/guardar-departamento.dto';
import { Departamento } from '../entities/departamento';

export abstract class DepartamentoRepository {
  abstract listar(idsPermitidos?: number[]): Promise<Departamento[]>;

  abstract obtenerPorId(id: number): Promise<Departamento | null>;

  abstract crear(input: GuardarDepartamentoDto): Promise<Departamento>;

  abstract actualizar(
    id: number,
    input: GuardarDepartamentoDto,
  ): Promise<Departamento>;

  abstract activar(id: number): Promise<void>;

  abstract desactivar(id: number): Promise<void>;
}
