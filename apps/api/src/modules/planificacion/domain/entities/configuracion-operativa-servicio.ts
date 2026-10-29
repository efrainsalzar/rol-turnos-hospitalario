export interface TramoCodigoOperativo {
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
}

export type ModoVisualConfiguracionOperativaServicio = 'ETIQUETAS' | 'NUMERICO';

export type OrigenCodigoOperativoServicio = 'TURNO' | 'TIPO_DIA';

export type CategoriaCodigoOperativoServicio =
  | 'TRABAJO'
  | 'DESCANSO'
  | 'LICENCIA'
  | 'VACACION'
  | 'FERIADO';

export type AlcanceIncidenciaPersonalOperativo =
  | 'GENERAL'
  | 'PERSONAL'
  | 'OTRO';

export interface CodigoOperativoServicio {
  id: number;
  origen: OrigenCodigoOperativoServicio;
  idTurno: number | null;
  idIncidenciaPersonal: number | null;
  alcanceIncidenciaPersonal: AlcanceIncidenciaPersonalOperativo | null;
  codigoInterno: string;
  codigoVisual: string;
  etiqueta: string;
  descripcion: string | null;
  horasEquivalentes: number;
  horaInicio: string | null;
  horaFin: string | null;
  tramos: TramoCodigoOperativo[];
  categoria: CategoriaCodigoOperativoServicio;
  color: string | null;
  ordenVisual: number;
  esLaborable: boolean;
  requiereConfirmacion: boolean;
  activo: boolean;
}

export interface ConfiguracionOperativaServicio {
  id: number | null;
  idServicio: number;
  codigoServicio: string | null;
  nombreServicio: string | null;
  modoVisualDefault: ModoVisualConfiguracionOperativaServicio;
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigosPermitidos: CodigoOperativoServicio[];
}

export interface ConfiguracionOperativaDepartamento {
  id: number | null;
  idDepartamento: number;
  codigoDepartamento: string | null;
  nombreDepartamento: string | null;
  modoVisualDefault: ModoVisualConfiguracionOperativaServicio;
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigosPermitidos: CodigoOperativoServicio[];
}
