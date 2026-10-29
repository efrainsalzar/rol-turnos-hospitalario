import {
  CodigoOperativoServicio,
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
} from '../entities/configuracion-operativa-servicio';

export interface ActualizarConfiguracionOperativaServicioInput {
  idServicio: number;
  modoVisualDefault: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: Array<{
    id: number;
    codigoVisual: string;
    etiqueta: string;
    descripcion: string | null;
    color: string | null;
    ordenVisual: number;
    activo: boolean;
  }>;
}

export interface ActualizarConfiguracionOperativaDepartamentoInput {
  idDepartamento: number;
  modoVisualDefault: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: Array<{
    id: number;
    codigoVisual: string;
    etiqueta: string;
    descripcion: string | null;
    color: string | null;
    ordenVisual: number;
    activo: boolean;
  }>;
}

export abstract class ConfiguracionOperativaServicioRepository {
  abstract obtenerPorPlanificacion(
    idPlanificacion: number,
  ): Promise<
    ConfiguracionOperativaServicio | ConfiguracionOperativaDepartamento | null
  >;

  abstract obtenerPorServicio(
    idServicio: number,
  ): Promise<ConfiguracionOperativaServicio | null>;

  abstract obtenerPorDepartamento(
    idDepartamento: number,
  ): Promise<ConfiguracionOperativaDepartamento | null>;

  abstract resolverCodigoOperativoEnPlanificacion(
    idPlanificacion: number,
    idCodigoOperativoServicio: number,
  ): Promise<CodigoOperativoServicio | null>;

  abstract guardarConfiguracionServicio(
    input: ActualizarConfiguracionOperativaServicioInput,
  ): Promise<ConfiguracionOperativaServicio>;

  abstract guardarConfiguracionDepartamento(
    input: ActualizarConfiguracionOperativaDepartamentoInput,
  ): Promise<ConfiguracionOperativaDepartamento>;

  abstract actualizarCodigoVisual(
    id: number,
    patch: { codigoVisual?: string; etiqueta?: string; color?: string },
  ): Promise<void>;
}
