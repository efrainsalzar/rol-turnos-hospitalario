import { TurnoExportCodeMapper } from './turno-export-code.mapper';
import type { CodigoExportacionRolTurnos } from '../../../domain/entities/codigo-exportacion-rol-turnos';

describe('TurnoExportCodeMapper', () => {
  it('maps system codes in etiquetas mode', () => {
    const mapper = buildMapper();

    expect(mapper.mapCodigo('M', 'etiquetas')).toBe('M');
    expect(mapper.mapCodigo('LICENCIA', 'etiquetas')).toBe('LIC');
    expect(mapper.mapCodigo('VACACION', 'etiquetas')).toBe('VAC');
  });

  it('maps special-day codes in numerico mode and keeps day-turn mapping data driven', () => {
    const mapper = buildMapper();

    expect(mapper.mapCodigo('VAC', 'numerico')).toBe('V');
    expect(mapper.mapCodigo('LIC', 'numerico')).toBe('LV');
    expect(mapper.mapCodigo('FN', 'numerico')).toBe('FN');
  });

  it('uses horasProgramadas from the matrix for turn rows in numerico mode', () => {
    const mapper = buildMapper();

    expect(
      mapper.mapRegistro(
        buildRegistro({
          tipo: 'TURNO',
          codigo: 'M',
          horasProgramadas: 6,
        }),
        'numerico',
      ),
    ).toBe('6');
    expect(
      mapper.mapRegistro(
        buildRegistro({
          tipo: 'TURNO',
          codigo: 'T',
          horasProgramadas: 6,
        }),
        'numerico',
      ),
    ).toBe('6');
    expect(
      mapper.mapRegistro(
        buildRegistro({
          tipo: 'TURNO',
          codigo: 'N',
          horasProgramadas: 12,
        }),
        'numerico',
      ),
    ).toBe('12');
  });

  it('keeps original code when no equivalence exists', () => {
    const mapper = buildMapper();

    expect(mapper.mapCodigo('X1', 'numerico')).toBe('X1');
  });

  it('omits M/T/N from numeric legend and keeps only special-day references', () => {
    const mapper = buildMapper();

    const legend = mapper.buildLegend(
      {
        planificacion: {
          id: 1,
          idServicio: 1,
          idDepartamento: null,
          codigoDepartamento: null,
          nombreDepartamento: null,
          codigoServicio: 'NEURO',
          nombreServicio: 'Neurocirugia',
          anio: 2026,
          mes: 5,
          version: 1,
          estado: 'BORRADOR',
          fechaInicio: '2026-05-01T00:00:00.000Z',
          fechaFin: '2026-05-31T00:00:00.000Z',
          fechaPublicacion: null,
          fechaCierre: null,
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z',
        },
        dias: [
          {
            idCalendario: 1,
            fecha: '2026-05-01T00:00:00.000Z',
            anio: 2026,
            mes: 5,
            diaMes: 1,
            diaSemanaNombre: 'Viernes',
            abreviaturaDiaSemana: 'V',
            esFinSemana: false,
            esFeriado: true,
            codigoFeriado: 'FN',
            nombreFeriado: 'Dia del trabajo',
          },
        ],
        filas: [
          {
            numeroFila: 1,
            idAsignacionPersonal: 1,
            idPersonal: 1,
            codigoPersonal: 'NEU-001',
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
            dias: [
              {
                idCalendario: 1,
                fecha: '2026-05-01T00:00:00.000Z',
                diaMes: 1,
                valorVisual: 'M/VAC',
                observacionDiaria: null,
                tipoObservacionDiaria: null,
                registros: [],
              },
            ],
            totalHorasMes: 0,
            horarioResumen: '',
            observacionMensual: null,
            ajustePorTraslado: null,
          },
        ],
        resumen: {
          totalPersonas: 1,
          totalDias: 1,
          totalRegistros: 0,
          totalHorasMes: 0,
        },
      },
      'numerico',
    );

    expect(legend.map((item) => item.codigo)).toEqual(['FN', 'V']);
  });
});

function buildMapper() {
  return new TurnoExportCodeMapper([
    buildCode('M', 'M', '6', 'Manana', 'TIPO_TURNO'),
    buildCode('T', 'T', '7', 'Tarde', 'TIPO_TURNO'),
    buildCode('N', 'N', '8', 'Noche', 'TIPO_TURNO'),
    buildCode('LICENCIA', 'LIC', 'LV', 'Licencia', 'TIPO_DIA'),
    buildCode('VACACION', 'VAC', 'V', 'Vacacion', 'TIPO_DIA'),
    buildCode('FERIADO', 'FN', 'FN', 'Feriado Nacional', 'TIPO_DIA'),
    buildCode('DESCANSO', 'DES', 'DES', 'Descanso', 'TIPO_DIA'),
    buildCode('BAJA_MEDICA', 'BAJA', 'BAJA', 'Baja Medica', 'TIPO_DIA'),
  ]);
}

function buildRegistro(
  override: Partial<{
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
  }>,
) {
  return {
    idRolTurno: 1,
    secuenciaDia: 1,
    tipo: 'TURNO' as const,
    idTurno: 1,
    codigo: 'M',
    nombre: 'Manana',
    horasProgramadas: 6,
    horaInicio: '08:00',
    horaFin: '14:00',
    cruzaMedianoche: false,
    tramos: [] as Array<{
      orden: number;
      horaInicio: string;
      horaFin: string;
      duracionHoras: number;
      cruzaMedianoche: boolean;
    }>,
    ...override,
  };
}

function buildCode(
  codigoInterno: string,
  codigoEtiqueta: string,
  codigoNumerico: string,
  descripcion: string,
  origen: CodigoExportacionRolTurnos['origen'],
): CodigoExportacionRolTurnos {
  return {
    codigoInterno,
    codigoEtiqueta,
    codigoNumerico,
    descripcion,
    origen,
  };
}
