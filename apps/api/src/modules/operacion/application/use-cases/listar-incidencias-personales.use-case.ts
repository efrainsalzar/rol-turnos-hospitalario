import { Injectable, Logger } from '@nestjs/common';
import { ListarIncidenciasPersonalesQueryDto } from '../dto/listar-incidencias-personales-query.dto';
import { IncidenciaPersonalRepository } from '../../domain/repositories/incidencia-personal.repository';
import { IncidenciaPersonalResponseDto } from '../dto/incidencia-personal-response.dto';

@Injectable()
export class ListarIncidenciasPersonalesUseCase {
  private readonly logger = new Logger(ListarIncidenciasPersonalesUseCase.name);

  constructor(
    private readonly incidenciaPersonalRepository: IncidenciaPersonalRepository,
  ) {}

  async execute(
    query: ListarIncidenciasPersonalesQueryDto = {},
  ): Promise<IncidenciaPersonalResponseDto[]> {
    this.logger.log(
      `Listando tipos de dia${query.alcance ? ` con alcance=${query.alcance}` : ''}.`,
    );
    const incidenciasPersonales =
      await this.incidenciaPersonalRepository.listar({
        alcance: query.alcance,
      });
    this.logger.log(
      `Tipos de dia encontrados: ${incidenciasPersonales.length}.`,
    );

    return incidenciasPersonales.map((incidenciaPersonal) => ({
      id: incidenciaPersonal.id,
      codigo: incidenciaPersonal.codigo,
      nombre: incidenciaPersonal.nombre,
      descripcion: incidenciaPersonal.descripcion,
      alcance: incidenciaPersonal.alcance,
      esLaborable: incidenciaPersonal.esLaborable,
      generaHorasTrabajadas: incidenciaPersonal.generaHorasTrabajadas,
      computaParaMetaHoras: incidenciaPersonal.computaParaMetaHoras,
      requiereRespaldo: incidenciaPersonal.requiereRespaldo,
      activo: incidenciaPersonal.activo,
    }));
  }
}
