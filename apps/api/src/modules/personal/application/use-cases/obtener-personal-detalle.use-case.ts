import { Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { PersonalDetalleResponseDto } from '../dto/personal-detalle-response.dto';

@Injectable()
export class ObtenerPersonalDetalleUseCase {
  private readonly logger = new Logger(ObtenerPersonalDetalleUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(idPersonal: number): Promise<PersonalDetalleResponseDto> {
    this.logger.log(`Obteniendo detalle de personal id=${idPersonal}.`);

    const personal = await this.personalRepository.obtenerDetalle(idPersonal);

    if (!personal) {
      throw noEncontrado(
        'personal',
        idPersonal,
        ObtenerPersonalDetalleUseCase.name,
      );
    }

    return {
      ...personal,
      asignacionesVigentes: personal.asignacionesVigentes.map((asignacion) => ({
        ...asignacion,
        fechaInicio: asignacion.fechaInicio.toISOString(),
        fechaFin: asignacion.fechaFin
          ? asignacion.fechaFin.toISOString()
          : null,
      })),
      asignacionesHistoricas: personal.asignacionesHistoricas.map((item) => ({
        ...item,
        fechaEvento: item.fechaEvento.toISOString(),
        fechaInicioAsignacion: item.fechaInicioAsignacion.toISOString(),
        fechaFinAsignacion: item.fechaFinAsignacion
          ? item.fechaFinAsignacion.toISOString()
          : null,
      })),
    };
  }
}
