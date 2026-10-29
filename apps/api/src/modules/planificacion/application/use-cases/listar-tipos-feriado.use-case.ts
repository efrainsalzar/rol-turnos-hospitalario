import { Injectable } from '@nestjs/common';
import { TipoFeriadoResponseDto } from '../dto/tipo-feriado-response.dto';
import { TipoFeriadoRepository } from '../../domain/repositories/tipo-feriado.repository';

@Injectable()
export class ListarTiposFeriadoUseCase {
  constructor(private readonly tipoFeriadoRepository: TipoFeriadoRepository) {}

  async execute(): Promise<TipoFeriadoResponseDto[]> {
    const tipos = await this.tipoFeriadoRepository.listar();

    return tipos.map((item) => ({
      id: item.id,
      codigo: item.codigo,
      nombre: item.nombre,
      descripcion: item.descripcion,
      orden: item.orden,
      activo: item.activo,
    }));
  }
}
