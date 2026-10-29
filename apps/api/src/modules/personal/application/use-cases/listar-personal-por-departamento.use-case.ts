import { Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { DepartamentoRepository } from '../../../organizacion/domain/repositories/departamento.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';

@Injectable()
export class ListarPersonalPorDepartamentoUseCase {
  private readonly logger = new Logger(
    ListarPersonalPorDepartamentoUseCase.name,
  );

  constructor(
    private readonly departamentoRepository: DepartamentoRepository,
    private readonly personalRepository: PersonalRepository,
  ) {}

  async execute(idDepartamento: number): Promise<AsignacionResponseDto[]> {
    const departamento =
      await this.departamentoRepository.obtenerPorId(idDepartamento);

    if (!departamento) {
      throw noEncontrado(
        'departamento',
        idDepartamento,
        ListarPersonalPorDepartamentoUseCase.name,
      );
    }

    this.logger.log(`Listando personal del departamento id=${idDepartamento}.`);

    const asignaciones = await this.personalRepository.listarAsignaciones({
      idDepartamento,
      activo: true,
    });

    return asignaciones.map((asignacion) => ({
      ...asignacion,
      fechaInicio: asignacion.fechaInicio.toISOString(),
      fechaFin: asignacion.fechaFin ? asignacion.fechaFin.toISOString() : null,
    }));
  }
}
