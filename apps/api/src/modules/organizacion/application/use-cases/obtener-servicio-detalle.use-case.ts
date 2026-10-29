import { Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';
import { ServicioDetalleResponseDto } from '../dto/servicio-detalle-response.dto';
import { mapTurnoToResponse } from '../../../operacion/application/mappers/operacion-response.mappers';

@Injectable()
export class ObtenerServicioDetalleUseCase {
  private readonly logger = new Logger(ObtenerServicioDetalleUseCase.name);

  constructor(private readonly servicioRepository: ServicioRepository) {}

  async execute(idServicio: number): Promise<ServicioDetalleResponseDto> {
    this.logger.log(`Obteniendo detalle de servicio id=${idServicio}.`);

    const servicio = await this.servicioRepository.obtenerDetalle(idServicio);

    if (!servicio) {
      throw noEncontrado(
        'servicio',
        idServicio,
        ObtenerServicioDetalleUseCase.name,
      );
    }

    return {
      id: servicio.id,
      codigo: servicio.codigo,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      tipoServicio: servicio.tipoServicio,
      activo: servicio.activo,
      departamento: servicio.departamento,
      cantidadPersonalActivo: servicio.cantidadPersonalActivo,
      jefaServicio: servicio.jefaServicio,
      turnos: servicio.turnos.map(mapTurnoToResponse),
    };
  }
}
