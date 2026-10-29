import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfiguracionOperativaPlanificacionResponseDto } from '../dto/configuracion-operativa-planificacion-response.dto';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import {
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
} from '../../domain/entities/configuracion-operativa-servicio';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

@Injectable()
export class ObtenerConfiguracionOperativaPlanificacionUseCase {
  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
  ) {}

  async execute(
    idPlanificacion: number,
  ): Promise<ConfiguracionOperativaPlanificacionResponseDto> {
    const planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ObtenerConfiguracionOperativaPlanificacionUseCase.name,
      );
    }

    const configuracion =
      await this.configuracionOperativaServicioRepository.obtenerPorPlanificacion(
        idPlanificacion,
      );

    if (!configuracion) {
      const unidad =
        planificacion.idServicio !== null
          ? `el servicio "${planificacion.nombreServicio}"`
          : `el departamento "${planificacion.nombreDepartamento}"`;
      throw new NotFoundException(
        `${unidad.charAt(0).toUpperCase()}${unidad.slice(1)} no tiene configuracion operativa. Configurala en Operacion antes de editar la matriz.`,
      );
    }

    const esScopeServicio = isConfiguracionServicio(configuracion);
    const infoUnidad = esScopeServicio
      ? {
          id: configuracion.idServicio,
          codigo: configuracion.codigoServicio,
          nombre: configuracion.nombreServicio,
        }
      : {
          id: null,
          codigo: configuracion.codigoDepartamento,
          nombre: configuracion.nombreDepartamento,
        };

    return {
      planificacion: {
        id: planificacion.id,
        idServicio: planificacion.idServicio,
        codigoServicio: planificacion.codigoServicio,
        nombreServicio: planificacion.nombreServicio,
      },
      servicio: infoUnidad,
      modoVisual: configuracion.modoVisualDefault,
      permiteMultiRegistroDia: configuracion.permiteMultiRegistroDia,
      usaEquivalenciaHorariaExportacion:
        configuracion.usaEquivalenciaHorariaExportacion,
      codigosPermitidos: configuracion.codigosPermitidos.map((codigo) => ({
        id: codigo.id,
        origen: codigo.origen,
        idTurno: codigo.idTurno,
        idIncidenciaPersonal: codigo.idIncidenciaPersonal,
        alcanceIncidenciaPersonal: codigo.alcanceIncidenciaPersonal,
        codigo: codigo.codigoVisual,
        etiqueta: codigo.etiqueta,
        descripcion: codigo.descripcion,
        horas: codigo.horasEquivalentes,
        horaInicio: codigo.horaInicio,
        horaFin: codigo.horaFin,
        tramos: codigo.tramos,
        categoria: codigo.categoria,
        color: codigo.color,
        esLaborable: codigo.esLaborable,
        requiereConfirmacion: codigo.requiereConfirmacion,
      })),
    };
  }
}

function isConfiguracionServicio(
  config: ConfiguracionOperativaServicio | ConfiguracionOperativaDepartamento,
): config is ConfiguracionOperativaServicio {
  return 'idServicio' in config;
}
