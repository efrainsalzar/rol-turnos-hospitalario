import { agruparFilaPorHorario } from './rol-turnos-agrupacion-horario';
import type { MatrizMensualPlanificacionResponseDto } from '../../dto/matriz-mensual-planificacion-response.dto';

type FilaMatriz = MatrizMensualPlanificacionResponseDto['filas'][number];
type DiaFilaMatriz = FilaMatriz['dias'][number];
type RegistroDia = DiaFilaMatriz['registros'][number];

describe('agruparFilaPorHorario', () => {
  it('mantiene tipo simple cuando la persona no tiene turnos en el mes', () => {
    const fila = buildFila([buildDia(1, [])]);

    const resultado = agruparFilaPorHorario(fila);

    expect(resultado.tipo).toBe('simple');
  });

  it('mantiene tipo simple cuando la persona tiene un solo turno en el mes', () => {
    const fila = buildFila([
      buildDia(1, [buildRegistroTurno(10, '07:00', '14:00')]),
      buildDia(2, [buildRegistroTurno(10, '07:00', '14:00')]),
    ]);

    const resultado = agruparFilaPorHorario(fila);

    expect(resultado.tipo).toBe('simple');
  });

  it('mantiene tipo simple para un turno discontinuo (varios tramos, un solo idTurno)', () => {
    const fila = buildFila([
      buildDia(1, [
        buildRegistroTurno(20, null, null, [
          {
            orden: 1,
            horaInicio: '08:00',
            horaFin: '12:00',
            duracionHoras: 4,
            cruzaMedianoche: false,
          },
          {
            orden: 2,
            horaInicio: '15:00',
            horaFin: '18:00',
            duracionHoras: 3,
            cruzaMedianoche: false,
          },
        ]),
      ]),
    ]);

    const resultado = agruparFilaPorHorario(fila);

    expect(resultado.tipo).toBe('simple');
  });

  it('arma un grupo por cada turno unico distinto en el mes', () => {
    const diaTurnoA = buildDia(1, [buildRegistroTurno(10, '07:00', '14:00')]);
    const diaTurnoB = buildDia(2, [buildRegistroTurno(11, '14:00', '20:00')]);
    const fila = buildFila([diaTurnoA, diaTurnoB]);

    const resultado = agruparFilaPorHorario(fila);

    expect(resultado.tipo).toBe('multiple');
    if (resultado.tipo !== 'multiple') {
      return;
    }
    expect(resultado.grupos).toHaveLength(2);
    expect(resultado.grupos[0].idTurno).toBe(10);
    expect(resultado.grupos[0].horarioResumen).toBe('07-14');
    expect(resultado.grupos[0].dias.has(1)).toBe(true);
    expect(resultado.grupos[1].idTurno).toBe(11);
    expect(resultado.grupos[1].horarioResumen).toBe('14-20');
    expect(resultado.grupos[1].dias.has(2)).toBe(true);
  });

  it('deja los dias de incidencia (sin turno) en un bloque separado para fusionar', () => {
    const diaTurnoA = buildDia(1, [buildRegistroTurno(10, '07:00', '14:00')]);
    const diaTurnoB = buildDia(2, [buildRegistroTurno(11, '14:00', '20:00')]);
    const diaVacacion = buildDia(3, [buildRegistroIncidencia('VAC')]);
    const fila = buildFila([diaTurnoA, diaTurnoB, diaVacacion]);

    const resultado = agruparFilaPorHorario(fila);

    expect(resultado.tipo).toBe('multiple');
    if (resultado.tipo !== 'multiple') {
      return;
    }
    expect(resultado.diasIncidencia.has(3)).toBe(true);
    expect(resultado.grupos.some((grupo) => grupo.dias.has(3))).toBe(false);
  });
});

function buildFila(dias: DiaFilaMatriz[]): FilaMatriz {
  return {
    numeroFila: 1,
    idAsignacionPersonal: 1,
    idPersonal: 1,
    codigoPersonal: 'COD-1',
    nroItem: '1',
    cargaHorariaCodigo: 'TC',
    cargaHorariaNombre: 'Tiempo Completo',
    horasDiaBase: 6,
    ci: '123',
    tipoContratoCodigo: 'TGN',
    tipoContratoNombre: 'Tesoro General',
    codigoFuenteItem: 'TGN',
    apellidoPaterno: 'Perez',
    apellidoMaterno: 'Lopez',
    nombres: 'Ana',
    nombreCompleto: 'Perez Lopez, Ana',
    cargoActual: 'Lic. Enfermeria',
    rolFuncionalCodigo: 'ASISTENCIAL',
    rolFuncionalNombre: 'Asistencial',
    esJefatura: false,
    servicioCodigo: 'NEURO',
    servicioNombre: 'Neurocirugia',
    dias,
    totalHorasMes: 0,
    horarioResumen: '',
    observacionMensual: null,
    ajustePorTraslado: null,
  };
}

function buildDia(
  idCalendario: number,
  registros: RegistroDia[],
): DiaFilaMatriz {
  return {
    idCalendario,
    fecha: `2026-05-${String(idCalendario).padStart(2, '0')}T00:00:00.000Z`,
    diaMes: idCalendario,
    valorVisual: registros.map((registro) => registro.codigo ?? '').join('/'),
    observacionDiaria: null,
    tipoObservacionDiaria: null,
    registros,
  };
}

function buildRegistroTurno(
  idTurno: number,
  horaInicio: string | null,
  horaFin: string | null,
  tramos: RegistroDia['tramos'] = [],
): RegistroDia {
  return {
    idRolTurno: idTurno * 100,
    secuenciaDia: 1,
    tipo: 'TURNO',
    idTurno,
    codigo: `T${idTurno}`,
    nombre: `Turno ${idTurno}`,
    horasProgramadas: 6,
    horaInicio,
    horaFin,
    cruzaMedianoche: false,
    tramos,
  };
}

function buildRegistroIncidencia(codigo: string): RegistroDia {
  return {
    idRolTurno: 999,
    secuenciaDia: 1,
    tipo: 'TIPO_DIA',
    idTurno: null,
    codigo,
    nombre: codigo,
    horasProgramadas: 0,
    horaInicio: null,
    horaFin: null,
    cruzaMedianoche: null,
    tramos: [],
  };
}
