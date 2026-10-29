import type {
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
} from '../../../planificacion/domain/entities/configuracion-operativa-servicio';
import type {
  ConfiguracionOperativaDepartamentoResponseDto,
  ConfiguracionOperativaServicioResponseDto,
  CodigoOperativoServicioResponseDto,
} from '../dto/configuracion-operativa-servicio-response.dto';
import type { CodigoOperativoServicio } from '../../../planificacion/domain/entities/configuracion-operativa-servicio';

function mapCodigos(
  codigos: CodigoOperativoServicio[],
): CodigoOperativoServicioResponseDto[] {
  return codigos.map((item) => ({
    id: item.id,
    origen: item.origen,
    idTurno: item.idTurno,
    idIncidenciaPersonal: item.idIncidenciaPersonal,
    codigo: item.codigoVisual,
    etiqueta: item.etiqueta,
    descripcion: item.descripcion,
    horas: item.horasEquivalentes,
    horaInicio: item.horaInicio,
    horaFin: item.horaFin,
    categoria: item.categoria,
    color: item.color,
    ordenVisual: item.ordenVisual,
    esLaborable: item.esLaborable,
    requiereConfirmacion: item.requiereConfirmacion,
    activo: item.activo,
  }));
}

export function mapConfiguracionOperativaServicioToResponse(
  configuracion: ConfiguracionOperativaServicio,
): ConfiguracionOperativaServicioResponseDto {
  return {
    servicio: {
      id: configuracion.idServicio,
      codigo: configuracion.codigoServicio,
      nombre: configuracion.nombreServicio,
    },
    modoVisual: configuracion.modoVisualDefault,
    permiteMultiRegistroDia: configuracion.permiteMultiRegistroDia,
    usaEquivalenciaHorariaExportacion:
      configuracion.usaEquivalenciaHorariaExportacion,
    codigos: mapCodigos(configuracion.codigosPermitidos),
  };
}

export function mapConfiguracionOperativaDepartamentoToResponse(
  configuracion: ConfiguracionOperativaDepartamento,
): ConfiguracionOperativaDepartamentoResponseDto {
  return {
    departamento: {
      id: configuracion.idDepartamento,
      codigo: configuracion.codigoDepartamento,
      nombre: configuracion.nombreDepartamento,
    },
    modoVisual: configuracion.modoVisualDefault,
    permiteMultiRegistroDia: configuracion.permiteMultiRegistroDia,
    usaEquivalenciaHorariaExportacion:
      configuracion.usaEquivalenciaHorariaExportacion,
    codigos: mapCodigos(configuracion.codigosPermitidos),
  };
}
