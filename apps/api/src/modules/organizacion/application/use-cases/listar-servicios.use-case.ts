import { Injectable, Logger } from '@nestjs/common';
import { ServicioRepository } from '../../domain/repositories/servicio.repository';
import { ListarServiciosQueryDto } from '../dto/listar-servicios-query.dto';
import { ServicioResponseDto } from '../dto/servicio-response.dto';

export interface ListarServiciosFiltroAlcance {
  idsDepartamentoPermitidos?: number[];
  idsServicioPermitidos?: number[];
  soloActivos?: boolean;
}

@Injectable()
export class ListarServiciosUseCase {
  private readonly logger = new Logger(ListarServiciosUseCase.name);

  constructor(private readonly servicioRepository: ServicioRepository) {}

  async execute(
    query: ListarServiciosQueryDto,
    filtroAlcance?: ListarServiciosFiltroAlcance,
  ): Promise<ServicioResponseDto[]> {
    this.logger.log(
      `Listando servicios${query.idDepartamentoNormalizado ? ` para id_departamento=${query.idDepartamentoNormalizado}` : ''}.`,
    );

    const servicios = await this.servicioRepository.listar({
      idDepartamento: query.idDepartamentoNormalizado,
      idsDepartamentoPermitidos: filtroAlcance?.idsDepartamentoPermitidos,
      idsServicioPermitidos: filtroAlcance?.idsServicioPermitidos,
      soloActivos: filtroAlcance?.soloActivos,
    });

    this.logger.log(`Servicios encontrados: ${servicios.length}.`);

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
