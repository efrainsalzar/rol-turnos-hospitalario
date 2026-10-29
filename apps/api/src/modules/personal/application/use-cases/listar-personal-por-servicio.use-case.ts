import { Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { ServicioRepository } from '../../../organizacion/domain/repositories/servicio.repository';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { AsignacionResponseDto } from '../dto/asignacion-response.dto';

@Injectable()
export class ListarPersonalPorServicioUseCase {
  private readonly logger = new Logger(ListarPersonalPorServicioUseCase.name);

  constructor(
    private readonly servicioRepository: ServicioRepository,
    private readonly personalRepository: PersonalRepository,
  ) {}

  async execute(idServicio: number): Promise<AsignacionResponseDto[]> {
    const servicio = await this.servicioRepository.obtenerPorId(idServicio);

    if (!servicio) {
      throw noEncontrado(
        'servicio',
        idServicio,
        ListarPersonalPorServicioUseCase.name,
      );
    }

    this.logger.log(`Listando personal activo del servicio id=${idServicio}.`);

    const asignaciones = await this.personalRepository.listarAsignaciones({
      idServicio,
      activo: true,
    });

    return asignaciones.map((asignacion) => ({
      ...asignacion,
      fechaInicio: asignacion.fechaInicio.toISOString(),
      fechaFin: asignacion.fechaFin ? asignacion.fechaFin.toISOString() : null,
    }));
  }
}
