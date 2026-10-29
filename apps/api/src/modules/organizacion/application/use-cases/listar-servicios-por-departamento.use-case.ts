import { Injectable, Logger } from '@nestjs/common';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';
import { DepartamentoRepository } from '../../domain/repositories/departamento.repository';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';
import { ServicioResponseDto } from '../dto/servicio-response.dto';

@Injectable()
export class ListarServiciosPorDepartamentoUseCase {
  private readonly logger = new Logger(
    ListarServiciosPorDepartamentoUseCase.name,
  );

  constructor(
    private readonly departamentoRepository: DepartamentoRepository,
    private readonly servicioRepository: ServicioRepository,
  ) {}

  async execute(idDepartamento: number): Promise<ServicioResponseDto[]> {
    const departamento =
      await this.departamentoRepository.obtenerPorId(idDepartamento);

    if (!departamento) {
      throw noEncontrado(
        'departamento',
        idDepartamento,
        ListarServiciosPorDepartamentoUseCase.name,
      );
    }

    this.logger.log(
      `Listando servicios del departamento id=${idDepartamento}.`,
    );

    const servicios = await this.servicioRepository.listar({ idDepartamento });

    return servicios.map((servicio) => ({
      id: servicio.id,
      idDepartamento: servicio.idDepartamento,
      codigoDepartamento: servicio.codigoDepartamento,
      nombreDepartamento: servicio.nombreDepartamento,
      codigo: servicio.codigo,
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      tipoServicio: servicio.tipoServicio,
      cantidadPersonalActivo: servicio.cantidadPersonalActivo,
      activo: servicio.activo,
    }));
  }
}
