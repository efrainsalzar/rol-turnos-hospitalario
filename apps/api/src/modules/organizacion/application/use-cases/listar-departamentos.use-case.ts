import { Injectable, Logger } from '@nestjs/common';
import { DepartamentoResponseDto } from '../dto/departamento-response.dto';
import { DepartamentoRepository } from '../../domain/repositories/departamento.repository';

@Injectable()
export class ListarDepartamentosUseCase {
  private readonly logger = new Logger(ListarDepartamentosUseCase.name);

  constructor(
    private readonly departamentoRepository: DepartamentoRepository,
  ) {}

  async execute(idsPermitidos?: number[]): Promise<DepartamentoResponseDto[]> {
    this.logger.log(
      `Listando departamentos${idsPermitidos ? ` acotado a ids=[${idsPermitidos.join(', ')}]` : ''}.`,
    );
    const departamentos =
      await this.departamentoRepository.listar(idsPermitidos);
    this.logger.log(`Departamentos encontrados: ${departamentos.length}.`);

    return departamentos.map((departamento) => ({
      id: departamento.id,
      codigo: departamento.codigo,
      nombre: departamento.nombre,
      descripcion: departamento.descripcion,
      activo: departamento.activo,
      cantidadPersonalActivo: departamento.cantidadPersonalActivo,
    }));
  }
}
