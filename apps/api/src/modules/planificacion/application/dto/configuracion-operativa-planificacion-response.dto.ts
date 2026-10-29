export interface ConfiguracionOperativaPlanificacionResponseDto {
  planificacion: {
    id: number;
    idServicio: number | null;
    codigoServicio: string | null;
    nombreServicio: string | null;
  };
  servicio: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  modoVisual: 'ETIQUETAS' | 'NUMERICO';
  permiteMultiRegistroDia: boolean;
  usaEquivalenciaHorariaExportacion: boolean;
  codigosPermitidos: Array<{
    id: number;
    origen: 'TURNO' | 'TIPO_DIA';
    idTurno: number | null;
    idIncidenciaPersonal: number | null;
    alcanceIncidenciaPersonal: 'GENERAL' | 'PERSONAL' | 'OTRO' | null;
    codigo: string;
    etiqueta: string;
    descripcion: string | null;
    horas: number;
    horaInicio: string | null;
    horaFin: string | null;
    tramos: Array<{
      orden: number;
      horaInicio: string;
      horaFin: string;
      duracionHoras: number;
      cruzaMedianoche: boolean;
    }>;
    categoria: 'TRABAJO' | 'DESCANSO' | 'LICENCIA' | 'VACACION' | 'FERIADO';
    color: string | null;
    esLaborable: boolean;
    requiereConfirmacion: boolean;
  }>;
}
