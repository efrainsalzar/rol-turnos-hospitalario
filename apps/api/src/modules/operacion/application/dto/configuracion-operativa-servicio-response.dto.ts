export interface CodigoOperativoServicioResponseDto {
  id: number;
  origen: 'TURNO' | 'TIPO_DIA';
  idTurno: number | null;
  idIncidenciaPersonal: number | null;
  codigo: string;
  etiqueta: string;
  descripcion: string | null;
  horas: number;
  horaInicio: string | null;
  horaFin: string | null;
  categoria: 'TRABAJO' | 'DESCANSO' | 'LICENCIA' | 'VACACION' | 'FERIADO';
  color: string | null;
  ordenVisual: number;
  esLaborable: boolean;
  requiereConfirmacion: boolean;
  activo: boolean;
}

export interface ConfiguracionOperativaServicioResponseDto {
  servicio: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  };
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: CodigoOperativoServicioResponseDto[];
}

export interface ConfiguracionOperativaDepartamentoResponseDto {
  departamento: {
    id: number;
    codigo: string | null;
    nombre: string | null;
  };
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigos: CodigoOperativoServicioResponseDto[];
}
