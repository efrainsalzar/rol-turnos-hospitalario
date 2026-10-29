export interface MatrizMensualPlanificacionResponseDto {
  planificacion: {
    id: number;
    idServicio: number | null;
    idDepartamento: number | null;
    codigoDepartamento: string | null;
    nombreDepartamento: string | null;
    codigoServicio: string | null;
    nombreServicio: string | null;
    anio: number;
    mes: number;
    version: number;
    estado: 'BORRADOR' | 'REVISION' | 'APROBADA' | 'CERRADA';
    fechaInicio: string;
    fechaFin: string;
    fechaPublicacion: string | null;
    fechaCierre: string | null;
    createdAt: string;
    updatedAt: string;
  };
  dias: Array<{
    idCalendario: number;
    fecha: string;
    anio: number;
    mes: number;
    diaMes: number;
    diaSemanaNombre: string;
    abreviaturaDiaSemana: string;
    esFinSemana: boolean;
    esFeriado: boolean;
    codigoFeriado: string | null;
    nombreFeriado: string | null;
  }>;
  filas: Array<{
    numeroFila: number;
    idAsignacionPersonal: number;
    idPersonal: number;
    codigoPersonal: string | null;
    nroItem: string | null;
    cargaHorariaCodigo: string | null;
    cargaHorariaNombre: string | null;
    horasDiaBase: number | null;
    ci: string | null;
    tipoContratoCodigo: string | null;
    tipoContratoNombre: string | null;
    codigoFuenteItem: string | null;
    apellidoPaterno: string | null;
    apellidoMaterno: string | null;
    nombres: string | null;
    nombreCompleto: string;
    cargoActual: string | null;
    rolFuncionalCodigo: string | null;
    rolFuncionalNombre: string | null;
    esJefatura: boolean;
    servicioCodigo: string | null;
    servicioNombre: string | null;
    // Presente cuando esta fila es el destino de un traslado desde una
    // planificacion aprobada (docs/database/decisiones-tecnicas.md secciones
    // 139/144): permite marcar la fila en la interfaz y bloquear visualmente
    // sus celdas anteriores a fechaEfectiva, que nunca deben tener turno.
    ajustePorTraslado: {
      idCambio: number;
      fechaEfectiva: string;
    } | null;
    dias: Array<{
      idCalendario: number;
      fecha: string;
      diaMes: number;
      valorVisual: string;
      observacionDiaria: string | null;
      tipoObservacionDiaria: string | null;
      registros: Array<{
        idRolTurno: number;
        secuenciaDia: number;
        tipo: 'TURNO' | 'TIPO_DIA';
        idTurno: number | null;
        codigo: string | null;
        nombre: string | null;
        horasProgramadas: number;
        horaInicio: string | null;
        horaFin: string | null;
        cruzaMedianoche: boolean | null;
        tramos: Array<{
          orden: number;
          horaInicio: string;
          horaFin: string;
          duracionHoras: number;
          cruzaMedianoche: boolean;
        }>;
      }>;
    }>;
    totalHorasMes: number;
    horarioResumen: string;
    observacionMensual: string | null;
  }>;
  resumen: {
    totalPersonas: number;
    totalDias: number;
    totalRegistros: number;
    totalHorasMes: number;
  };
}
