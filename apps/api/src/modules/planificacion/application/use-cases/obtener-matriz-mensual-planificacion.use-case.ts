import { Injectable, Logger } from '@nestjs/common';
import type { AsignacionPlanificacionDisponible } from '../../domain/entities/asignacion-planificacion-disponible';
import type {
  ConfiguracionOperativaDepartamento,
  ConfiguracionOperativaServicio,
} from '../../domain/entities/configuracion-operativa-servicio';
import type { ObservacionDiariaPlanificacion } from '../../domain/entities/observacion-diaria-planificacion';
import type { Planificacion } from '../../domain/entities/planificacion';
import type { RolTurnoPlanificacion } from '../../domain/entities/rol-turno-planificacion';
import { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import { ConfiguracionOperativaServicioRepository } from '../../domain/repositories/configuracion-operativa-servicio.repository';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { RolTurnoRepository } from '../../domain/repositories/rol-turno.repository';
import { RolTurnoPlanificacionCambioRepository } from '../../domain/repositories/rol-turno.repository';
import { MatrizMensualPlanificacionResponseDto } from '../dto/matriz-mensual-planificacion-response.dto';
import { cerrarSiVencida } from './helpers/planificacion-vencimiento.helper';
import { noEncontrado } from '../../../../common/errors/mensajes-usuario';

type DiaMatriz = MatrizMensualPlanificacionResponseDto['dias'][number];
type RegistroDia =
  MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number]['registros'][number];
type DiaFilaMatriz =
  MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number];
type FilaMatriz = Omit<
  MatrizMensualPlanificacionResponseDto['filas'][number],
  'numeroFila' | 'dias'
> & {
  diasMap: Map<number, DiaFilaMatriz>;
  horariosUsados: Map<string, string>;
  totalRegistros: number;
  ordenVisualCargo: number | null;
};

@Injectable()
export class ObtenerMatrizMensualPlanificacionUseCase {
  private readonly logger = new Logger(
    ObtenerMatrizMensualPlanificacionUseCase.name,
  );

  constructor(
    private readonly planificacionRepository: PlanificacionRepository,
    private readonly planificacionHistorialRepository: PlanificacionHistorialRepository,
    private readonly calendarioRepository: CalendarioRepository,
    private readonly rolTurnoRepository: RolTurnoRepository,
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
  ) {}

  async execute(
    idPlanificacion: number,
    vista: 'ORIGINAL' | 'EFECTIVA' = 'EFECTIVA',
  ): Promise<MatrizMensualPlanificacionResponseDto> {
    this.logger.log(
      `Construyendo matriz mensual para planificacion id=${idPlanificacion}.`,
    );

    let planificacion =
      await this.planificacionRepository.obtenerPorId(idPlanificacion);

    if (!planificacion) {
      throw noEncontrado(
        'planificacion',
        idPlanificacion,
        ObtenerMatrizMensualPlanificacionUseCase.name,
      );
    }

    planificacion = await cerrarSiVencida(
      this.planificacionHistorialRepository,
      planificacion,
    );

    // Una planificacion CERRADA nunca vuelve a leer turno/personal/
    // codigo_operativo_servicio en vivo: se reconstruye enteramente desde
    // su historial congelado, para que ningun cambio futuro en esos
    // catalogos pueda alterar lo que ya paso. El roster de filas no se
    // consulta aparte (asignacionesBase queda vacio): cada registro
    // historico ya trae sus propios datos de persona, y el mecanismo de
    // fila-de-respaldo (`createFallbackFilaMatriz`) que ya usa este mismo
    // codigo para registros huerfanos en el camino en vivo arma la fila
    // completa a partir de esos datos.
    const esCerrada = planificacion.estado === 'CERRADA';

    // Una sola consulta sirve a dos necesidades: la vista ORIGINAL excluye
    // estas asignaciones del roster (nunca estuvieron ahi cuando se aprobo);
    // la vista EFECTIVA las conserva pero marca la fila con la fecha desde la
    // que es valida, para que la interfaz bloquee visualmente los dias
    // anteriores (docs/database/decisiones-tecnicas.md secciones 139/144).
    // Una planificacion CERRADA no tiene esto: su historial ya esta congelado,
    // no hay nada pendiente de completar.
    const cambiosDestinoPorAsignacion = esCerrada
      ? new Map<number, { idCambio: number; fechaEfectiva: Date }>()
      : new Map(
          (
            await (
              this
                .rolTurnoRepository as unknown as RolTurnoPlanificacionCambioRepository
            ).listarCambiosDestinoPorPlanificacion(idPlanificacion)
          ).map((cambio) => [
            cambio.idAsignacionDestino,
            { idCambio: cambio.idCambio, fechaEfectiva: cambio.fechaEfectiva },
          ]),
        );

    const [
      diasBase,
      asignacionesBase,
      registros,
      observacionesDiarias,
      configuracionOperativa,
    ] = await Promise.all([
      this.calendarioRepository.listar({
        anio: planificacion.anio,
        mes: planificacion.mes,
      }),
      this.obtenerAsignacionesBase(
        planificacion,
        esCerrada,
        vista,
        cambiosDestinoPorAsignacion,
      ),
      this.obtenerRegistros(idPlanificacion, esCerrada, vista),
      this.obtenerObservacionesDiarias(idPlanificacion, esCerrada),
      this.obtenerConfiguracionOperativa(idPlanificacion, esCerrada),
    ]);

    const codigosVisuales = new Map<
      string,
      { codigoVisual: string; etiqueta: string }
    >();
    for (const codigo of configuracionOperativa?.codigosPermitidos || []) {
      const visual = codigo.codigoVisual.trim();
      const etiqueta = codigo.etiqueta.trim();
      if (codigo.idTurno) {
        codigosVisuales.set(`T:${codigo.idTurno}`, {
          codigoVisual: visual,
          etiqueta,
        });
      }
      if (codigo.idIncidenciaPersonal) {
        codigosVisuales.set(`D:${codigo.idIncidenciaPersonal}`, {
          codigoVisual: visual,
          etiqueta,
        });
      }
    }

    const dias = diasBase
      .slice()
      .sort((left, right) => left.diaMes - right.diaMes)
      .map((dia) => ({
        idCalendario: dia.id,
        fecha: dia.fecha.toISOString(),
        anio: dia.anio,
        mes: dia.mes,
        diaMes: dia.diaMes,
        diaSemanaNombre: dia.diaSemanaNombre,
        abreviaturaDiaSemana: buildAbreviaturaDiaSemana(dia.diaSemanaNombre),
        esFinSemana: dia.esFinSemana,
        esFeriado: dia.esFeriado,
        codigoFeriado: dia.codigoFeriado,
        nombreFeriado: dia.nombreFeriado,
      }));

    const diasPorId = new Map<number, DiaMatriz>(
      dias.map((dia) => [dia.idCalendario, dia]),
    );
    const filasMap = new Map<number, FilaMatriz>();

    for (const asignacion of asignacionesBase) {
      const cambio = cambiosDestinoPorAsignacion.get(
        asignacion.idAsignacionPersonal,
      );
      filasMap.set(asignacion.idAsignacionPersonal, {
        idAsignacionPersonal: asignacion.idAsignacionPersonal,
        ajustePorTraslado: cambio
          ? {
              idCambio: cambio.idCambio,
              fechaEfectiva: cambio.fechaEfectiva.toISOString(),
            }
          : null,
        idPersonal: asignacion.idPersonal,
        codigoPersonal: asignacion.codigoPersonal,
        nroItem: asignacion.nroItem ?? null,
        cargaHorariaCodigo: asignacion.codigoCargaHoraria ?? null,
        cargaHorariaNombre: asignacion.nombreCargaHoraria ?? null,
        horasDiaBase: asignacion.horasDiaBase ?? null,
        ci: asignacion.ci ?? null,
        tipoContratoCodigo: asignacion.codigoTipoContrato ?? null,
        tipoContratoNombre: asignacion.nombreTipoContrato ?? null,
        codigoFuenteItem: asignacion.codigoFuenteItem ?? null,
        apellidoPaterno: asignacion.apellidoPaterno ?? null,
        apellidoMaterno: asignacion.apellidoMaterno ?? null,
        nombres: asignacion.nombres ?? null,
        nombreCompleto: asignacion.nombreCompleto,
        cargoActual: asignacion.cargoActual ?? null,
        rolFuncionalCodigo: asignacion.rolFuncionalCodigo ?? null,
        rolFuncionalNombre: asignacion.rolFuncionalNombre ?? null,
        esJefatura: asignacion.esJefatura ?? false,
        servicioCodigo: asignacion.servicioCodigo ?? null,
        servicioNombre: asignacion.servicioNombre ?? null,
        ordenVisualCargo: asignacion.ordenVisualCargo ?? null,
        totalHorasMes: 0,
        horarioResumen: '',
        observacionMensual: null,
        totalRegistros: 0,
        diasMap: new Map<number, DiaFilaMatriz>(),
        horariosUsados: new Map<string, string>(),
      });
    }

    for (const registro of registros) {
      const dia = diasPorId.get(registro.idCalendario);

      if (!dia) {
        continue;
      }

      const fila =
        filasMap.get(registro.idAsignacionPersonal) ??
        createFallbackFilaMatriz(registro);

      if (!filasMap.has(registro.idAsignacionPersonal)) {
        filasMap.set(registro.idAsignacionPersonal, fila);
      }

      const diaFila =
        fila.diasMap.get(registro.idCalendario) ??
        createDiaFilaMatriz(dia.idCalendario, dia.fecha, dia.diaMes);

      if (!fila.diasMap.has(registro.idCalendario)) {
        fila.diasMap.set(registro.idCalendario, diaFila);
      }

      const tipo = registro.idIncidenciaPersonal ? 'TIPO_DIA' : 'TURNO';
      const codigo = resolveRegistroVisualCode(registro, codigosVisuales);
      const nombre = registro.idIncidenciaPersonal
        ? registro.nombreIncidenciaPersonal
        : registro.nombreTurno;

      const tramosMapeados = (registro.tramos ?? []).map((t) => ({
        orden: t.orden,
        horaInicio: t.horaInicio,
        horaFin: t.horaFin,
        duracionHoras: t.duracionHoras,
        cruzaMedianoche: t.cruzaMedianoche,
      }));

      diaFila.registros.push({
        idRolTurno: registro.id,
        secuenciaDia: registro.secuenciaDia,
        tipo,
        idTurno: registro.idTurno,
        codigo,
        nombre,
        horasProgramadas: registro.horasProgramadas,
        horaInicio: normalizeHourValue(registro.horaInicio ?? null),
        horaFin: normalizeHourValue(registro.horaFin ?? null),
        cruzaMedianoche: registro.cruzaMedianoche ?? null,
        tramos: tramosMapeados,
      });
      diaFila.valorVisual = buildValorVisual(diaFila.registros);

      fila.totalRegistros += 1;
      fila.totalHorasMes += registro.horasProgramadas;

      if (registro.observacionMensual) {
        fila.observacionMensual = registro.observacionMensual;
      }

      if (tramosMapeados.length > 0) {
        for (const tramo of tramosMapeados) {
          const horario = buildHorarioSegmento(tramo.horaInicio, tramo.horaFin);
          fila.horariosUsados.set(horario, horario);
        }
      } else if (registro.horaInicio && registro.horaFin) {
        const horario = buildHorarioSegmento(
          registro.horaInicio,
          registro.horaFin,
        );
        fila.horariosUsados.set(horario, horario);
      }
    }

    for (const observacion of observacionesDiarias) {
      const fila = filasMap.get(observacion.idAsignacionPersonal);
      const diaFila = fila?.diasMap.get(observacion.idCalendario);

      if (!fila || !diaFila) {
        continue;
      }

      diaFila.observacionDiaria = observacion.descripcion;
      diaFila.tipoObservacionDiaria = observacion.tipoObservacion;
    }

    const filas = Array.from(filasMap.values())
      .sort((left, right) => compareFilas(left, right))
      .map((fila, index) => ({
        numeroFila: index + 1,
        idAsignacionPersonal: fila.idAsignacionPersonal,
        idPersonal: fila.idPersonal,
        codigoPersonal: fila.codigoPersonal,
        nroItem: fila.nroItem,
        cargaHorariaCodigo: fila.cargaHorariaCodigo,
        cargaHorariaNombre: fila.cargaHorariaNombre,
        horasDiaBase: fila.horasDiaBase,
        ci: fila.ci,
        tipoContratoCodigo: fila.tipoContratoCodigo,
        tipoContratoNombre: fila.tipoContratoNombre,
        codigoFuenteItem: fila.codigoFuenteItem,
        apellidoPaterno: fila.apellidoPaterno,
        apellidoMaterno: fila.apellidoMaterno,
        nombres: fila.nombres,
        nombreCompleto: fila.nombreCompleto,
        cargoActual: fila.cargoActual,
        rolFuncionalCodigo: fila.rolFuncionalCodigo,
        rolFuncionalNombre: fila.rolFuncionalNombre,
        esJefatura: fila.esJefatura,
        servicioCodigo: fila.servicioCodigo,
        servicioNombre: fila.servicioNombre,
        ajustePorTraslado: fila.ajustePorTraslado,
        dias: dias.map((dia) => {
          const diaFila = fila.diasMap.get(dia.idCalendario);

          return (
            diaFila ??
            createDiaFilaMatriz(dia.idCalendario, dia.fecha, dia.diaMes)
          );
        }),
        totalHorasMes: Number(fila.totalHorasMes.toFixed(2)),
        horarioResumen: Array.from(fila.horariosUsados.values()).join(','),
        observacionMensual: fila.observacionMensual,
      }));

    const totalHorasMes = Number(
      filas
        .reduce((accumulator, fila) => accumulator + fila.totalHorasMes, 0)
        .toFixed(2),
    );
    const totalRegistros = Array.from(filasMap.values()).reduce(
      (accumulator, fila) => accumulator + fila.totalRegistros,
      0,
    );

    this.logger.log(
      `Matriz mensual construida para planificacion id=${idPlanificacion}: personas=${filas.length}, dias=${dias.length}, registros=${totalRegistros}.`,
    );

    return {
      planificacion: {
        id: planificacion.id,
        idServicio: planificacion.idServicio,
        idDepartamento: planificacion.idDepartamento,
        codigoDepartamento: planificacion.codigoDepartamento,
        nombreDepartamento: planificacion.nombreDepartamento,
        codigoServicio: planificacion.codigoServicio,
        nombreServicio: planificacion.nombreServicio,
        anio: planificacion.anio,
        mes: planificacion.mes,
        version: planificacion.version,
        estado: planificacion.estado,
        fechaInicio: planificacion.fechaInicio.toISOString(),
        fechaFin: planificacion.fechaFin.toISOString(),
        fechaPublicacion: planificacion.fechaPublicacion
          ? planificacion.fechaPublicacion.toISOString()
          : null,
        fechaCierre: planificacion.fechaCierre
          ? planificacion.fechaCierre.toISOString()
          : null,
        createdAt: planificacion.createdAt.toISOString(),
        updatedAt: planificacion.updatedAt.toISOString(),
      },
      dias,
      filas,
      resumen: {
        totalPersonas: filas.length,
        totalDias: dias.length,
        totalRegistros,
        totalHorasMes,
      },
    };
  }

  private async obtenerAsignacionesBase(
    planificacion: Planificacion,
    esCerrada: boolean,
    vista: 'ORIGINAL' | 'EFECTIVA',
    cambiosDestinoPorAsignacion: Map<
      number,
      { idCambio: number; fechaEfectiva: Date }
    >,
  ): Promise<AsignacionPlanificacionDisponible[]> {
    if (esCerrada) {
      return [];
    }

    const asignaciones = await (planificacion.idServicio !== null
      ? this.rolTurnoRepository.listarAsignacionesDisponiblesPorServicio(
          planificacion.idServicio,
        )
      : this.rolTurnoRepository.listarAsignacionesDisponiblesPorDepartamento(
          planificacion.idDepartamento!,
        ));

    if (vista === 'EFECTIVA') {
      return asignaciones;
    }

    return asignaciones.filter(
      (asignacion) =>
        !cambiosDestinoPorAsignacion.has(asignacion.idAsignacionPersonal),
    );
  }

  private async obtenerRegistros(
    idPlanificacion: number,
    esCerrada: boolean,
    vista: 'ORIGINAL' | 'EFECTIVA',
  ): Promise<RolTurnoPlanificacion[]> {
    return esCerrada
      ? this.planificacionHistorialRepository.listarRegistrosHistorial(
          idPlanificacion,
          vista,
        )
      : this.rolTurnoRepository.listarPorPlanificacion(idPlanificacion, {
          vista,
        });
  }

  private async obtenerObservacionesDiarias(
    idPlanificacion: number,
    esCerrada: boolean,
  ): Promise<ObservacionDiariaPlanificacion[]> {
    return esCerrada
      ? this.planificacionHistorialRepository.listarObservacionesDiariasHistorial(
          idPlanificacion,
        )
      : Promise.resolve([]);
  }

  private async obtenerConfiguracionOperativa(
    idPlanificacion: number,
    esCerrada: boolean,
  ): Promise<
    ConfiguracionOperativaServicio | ConfiguracionOperativaDepartamento | null
  > {
    if (esCerrada) {
      return null;
    }

    return this.configuracionOperativaServicioRepository.obtenerPorPlanificacion(
      idPlanificacion,
    );
  }
}

function createFallbackFilaMatriz(registro: {
  idAsignacionPersonal: number;
  idPersonal: number;
  codigoPersonal: string | null;
  nroItem?: string | null;
  codigoCargaHoraria?: string | null;
  nombreCargaHoraria?: string | null;
  horasDiaBase?: number | null;
  ci?: string | null;
  codigoTipoContrato?: string | null;
  nombreTipoContrato?: string | null;
  codigoFuenteItem?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  nombres?: string | null;
  nombreCompleto: string;
  cargoActual?: string | null;
  rolFuncionalCodigo?: string | null;
  rolFuncionalNombre?: string | null;
  esJefatura?: boolean;
  servicioCodigo?: string | null;
  servicioNombre?: string | null;
}): FilaMatriz {
  return {
    idAsignacionPersonal: registro.idAsignacionPersonal,
    idPersonal: registro.idPersonal,
    codigoPersonal: registro.codigoPersonal,
    nroItem: registro.nroItem ?? null,
    cargaHorariaCodigo: registro.codigoCargaHoraria ?? null,
    cargaHorariaNombre: registro.nombreCargaHoraria ?? null,
    horasDiaBase: registro.horasDiaBase ?? null,
    ci: registro.ci ?? null,
    tipoContratoCodigo: registro.codigoTipoContrato ?? null,
    tipoContratoNombre: registro.nombreTipoContrato ?? null,
    codigoFuenteItem: registro.codigoFuenteItem ?? null,
    apellidoPaterno: registro.apellidoPaterno ?? null,
    apellidoMaterno: registro.apellidoMaterno ?? null,
    nombres: registro.nombres ?? null,
    nombreCompleto: registro.nombreCompleto,
    cargoActual: registro.cargoActual ?? null,
    rolFuncionalCodigo: registro.rolFuncionalCodigo ?? null,
    rolFuncionalNombre: registro.rolFuncionalNombre ?? null,
    esJefatura: registro.esJefatura ?? false,
    servicioCodigo: registro.servicioCodigo ?? null,
    servicioNombre: registro.servicioNombre ?? null,
    // Una fila de respaldo nunca es un destino de traslado: ese siempre esta
    // activo y por lo tanto ya llega via el roster (asignacionesBase), no por
    // este camino de registros huerfanos.
    ajustePorTraslado: null,
    ordenVisualCargo: null,
    totalHorasMes: 0,
    horarioResumen: '',
    observacionMensual: null,
    totalRegistros: 0,
    diasMap: new Map<number, DiaFilaMatriz>(),
    horariosUsados: new Map<string, string>(),
  };
}

function createDiaFilaMatriz(
  idCalendario: number,
  fecha: string,
  diaMes: number,
): DiaFilaMatriz {
  return {
    idCalendario,
    fecha,
    diaMes,
    valorVisual: '',
    observacionDiaria: null,
    tipoObservacionDiaria: null,
    registros: [],
  };
}

function buildAbreviaturaDiaSemana(diaSemanaNombre: string): string {
  const normalized = diaSemanaNombre.toLowerCase();

  if (normalized.startsWith('lunes')) {
    return 'L';
  }
  if (normalized.startsWith('martes')) {
    return 'M';
  }
  if (normalized.startsWith('miercoles')) {
    return 'M';
  }
  if (normalized.startsWith('jueves')) {
    return 'J';
  }
  if (normalized.startsWith('viernes')) {
    return 'V';
  }
  if (normalized.startsWith('sabado')) {
    return 'S';
  }
  if (normalized.startsWith('domingo')) {
    return 'D';
  }

  return diaSemanaNombre.charAt(0).toUpperCase();
}

function buildValorVisual(registros: RegistroDia[]): string {
  const codigos = registros
    .slice()
    .sort((left, right) => left.secuenciaDia - right.secuenciaDia)
    .map((registro) => registro.codigo)
    .filter((codigo): codigo is string => Boolean(codigo));

  return codigos.join('/');
}

function resolveRegistroVisualCode(
  registro: {
    idTurno: number | null;
    idIncidenciaPersonal: number | null;
    codigoTurno: string | null;
    codigoIncidenciaPersonal: string | null;
    horasProgramadas: number;
    codigoVisualCongelado?: string | null;
    etiquetaVisualCongelada?: string | null;
  },
  codigosVisuales: Map<string, { codigoVisual: string; etiqueta: string }>,
): string | null {
  if (
    registro.codigoVisualCongelado !== undefined ||
    registro.etiquetaVisualCongelada !== undefined
  ) {
    return (
      registro.codigoVisualCongelado ||
      registro.etiquetaVisualCongelada ||
      registro.codigoIncidenciaPersonal ||
      registro.codigoTurno ||
      (registro.idTurno
        ? `${formatNumberToken(registro.horasProgramadas)} h`
        : null)
    );
  }

  if (registro.idIncidenciaPersonal) {
    const configuracion = codigosVisuales.get(
      `D:${registro.idIncidenciaPersonal}`,
    );
    return (
      configuracion?.codigoVisual ||
      configuracion?.etiqueta ||
      registro.codigoIncidenciaPersonal
    );
  }

  if (registro.idTurno) {
    const configuracion = codigosVisuales.get(`T:${registro.idTurno}`);
    if (configuracion?.codigoVisual) {
      return configuracion.codigoVisual;
    }

    if (configuracion?.etiqueta) {
      return configuracion.etiqueta;
    }

    return `${formatNumberToken(registro.horasProgramadas)} h`;
  }

  return registro.codigoIncidenciaPersonal || registro.codigoTurno;
}

function formatNumberToken(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function normalizeHourValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.slice(0, 5);
}

export function buildHorarioSegmento(
  horaInicio: string,
  horaFin: string,
): string {
  return `${compactHour(horaInicio)}-${compactHour(horaFin)}`;
}

function compactHour(value: string): string {
  const normalized = normalizeHourValue(value) ?? value;
  return normalized.endsWith(':00')
    ? normalized.slice(0, 2)
    : normalized.replace(':', '.');
}

function compareFilas(left: FilaMatriz, right: FilaMatriz): number {
  const rolOrder = compareNumber(
    resolveRolOrder(left.rolFuncionalCodigo),
    resolveRolOrder(right.rolFuncionalCodigo),
  );

  if (rolOrder !== 0) {
    return rolOrder;
  }

  const cargoOrder = compareNumber(
    left.ordenVisualCargo ?? 99,
    right.ordenVisualCargo ?? 99,
  );

  if (cargoOrder !== 0) {
    return cargoOrder;
  }

  const apellidoPaternoOrder = compareOptionalText(
    left.apellidoPaterno,
    right.apellidoPaterno,
  );
  if (apellidoPaternoOrder !== 0) {
    return apellidoPaternoOrder;
  }

  const apellidoMaternoOrder = compareOptionalText(
    left.apellidoMaterno,
    right.apellidoMaterno,
  );
  if (apellidoMaternoOrder !== 0) {
    return apellidoMaternoOrder;
  }

  const nombresOrder = compareOptionalText(left.nombres, right.nombres);
  if (nombresOrder !== 0) {
    return nombresOrder;
  }

  const codigoPersonalOrder = compareOptionalText(
    left.codigoPersonal,
    right.codigoPersonal,
  );
  if (codigoPersonalOrder !== 0) {
    return codigoPersonalOrder;
  }

  return compareNumber(left.idPersonal, right.idPersonal);
}

function resolveRolOrder(
  rolFuncionalCodigo: string | null | undefined,
): number {
  const normalized = normalizeSortText(rolFuncionalCodigo);

  if (normalized === 'JEFE_SERVICIO') {
    return 0;
  }

  return 99;
}

function compareOptionalText(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftNormalized = normalizeSortText(left);
  const rightNormalized = normalizeSortText(right);

  if (!leftNormalized && !rightNormalized) {
    return 0;
  }

  if (!leftNormalized) {
    return 1;
  }

  if (!rightNormalized) {
    return -1;
  }

  return leftNormalized.localeCompare(rightNormalized, 'es');
}

function compareNumber(left: number, right: number): number {
  return left - right;
}

function normalizeSortText(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}
