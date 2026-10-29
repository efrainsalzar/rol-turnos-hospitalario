import { PlanificacionMatrizExportService } from './planificacion-matriz-export.service';
import { PlanificacionExcelExportService } from './export/planificacion-excel-export.service';
import { TurnoExportCodeCatalogService } from './export/turno-export-code-catalog.service';
import { TurnoExportCodeMapper } from './export/turno-export-code.mapper';
import type { CodigoExportacionRolTurnos } from '../../domain/entities/codigo-exportacion-rol-turnos';
import type { MatrizMensualPlanificacionResponseDto } from '../dto/matriz-mensual-planificacion-response.dto';

describe('PlanificacionMatrizExportService.buildPrintableHtml', () => {
  it('renders one <tr> per person in formato=una-fila (default)', async () => {
    const service = buildService();

    const html = await service.buildPrintableHtml(buildMatrizFixture());

    expect(countOccurrences(html, '<tr>')).toBe(1);
    expect(html).toContain('08-14,14-20');
  });

  it('splits a person with 2 distinct turnos into 2 <tr> with rowspan in formato=multi-horario', async () => {
    const service = buildService();

    const html = await service.buildPrintableHtml(buildMatrizFixture(), {
      formato: 'multi-horario',
    });

    expect(countOccurrences(html, '<tr>')).toBe(2);
    // Las columnas de identidad y total se fusionan con rowspan="2".
    expect(countOccurrences(html, 'rowspan="2"')).toBeGreaterThan(0);
    // El horario de cada fila muestra solo su propio segmento, no el resumen conjunto.
    expect(html).toContain('>08-14<');
    expect(html).toContain('>14-20<');
    expect(html).not.toContain('08-14,14-20');
  });

  it('keeps a single <tr> for a person with only one turno in formato=multi-horario', async () => {
    const service = buildService();
    const fixture = buildMatrizFixture();
    fixture.filas[0].dias = fixture.filas[0].dias.map((dia) =>
      dia.diaMes === 2 ? { ...dia, registros: [], valorVisual: '' } : dia,
    );
    fixture.filas[0].horarioResumen = '08-14';

    const html = await service.buildPrintableHtml(fixture, {
      formato: 'multi-horario',
    });

    expect(countOccurrences(html, '<tr>')).toBe(1);
  });
});

function buildService() {
  const catalogService = {
    buildMapper: jest
      .fn()
      .mockResolvedValue(
        new TurnoExportCodeMapper([
          buildCode('M', 'M', '6', 'Manana', 'TIPO_TURNO'),
          buildCode('T', 'T', '7', 'Tarde', 'TIPO_TURNO'),
        ]),
      ),
  } as unknown as TurnoExportCodeCatalogService;

  return new PlanificacionMatrizExportService(
    new PlanificacionExcelExportService(undefined as never, catalogService),
    catalogService,
  );
}

function buildCode(
  codigoInterno: string,
  codigoEtiqueta: string,
  codigoNumerico: string,
  descripcion: string,
  origen: CodigoExportacionRolTurnos['origen'],
): CodigoExportacionRolTurnos {
  return { codigoInterno, codigoEtiqueta, codigoNumerico, descripcion, origen };
}

function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function buildMatrizFixture(): MatrizMensualPlanificacionResponseDto {
  const dias = Array.from({ length: 5 }, (_, index) => ({
    idCalendario: 1000 + index,
    fecha: new Date(Date.UTC(2026, 4, index + 1)).toISOString(),
    anio: 2026,
    mes: 5,
    diaMes: index + 1,
    diaSemanaNombre: 'Viernes',
    abreviaturaDiaSemana: 'V',
    esFinSemana: false,
    esFeriado: false,
    codigoFeriado: null,
    nombreFeriado: null,
  }));

  return {
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
      fechaFin: '2026-05-05T00:00:00.000Z',
      fechaPublicacion: null,
      fechaCierre: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    },
    dias,
    filas: [
      {
        numeroFila: 1,
        idAsignacionPersonal: 10,
        idPersonal: 20,
        codigoPersonal: 'NEU-002',
        nroItem: '260101',
        cargaHorariaCodigo: 'TC',
        cargaHorariaNombre: 'Tiempo Completo',
        horasDiaBase: 6,
        ci: '5632103',
        tipoContratoCodigo: 'TGN',
        tipoContratoNombre: 'Tesoro General de la Nacion',
        codigoFuenteItem: 'TGN',
        apellidoPaterno: 'Flores',
        apellidoMaterno: 'Condori',
        nombres: 'Carla Beatriz',
        nombreCompleto: 'Flores Condori, Carla Beatriz',
        cargoActual: 'Lic. Enfermeria',
        rolFuncionalCodigo: 'ASISTENCIAL',
        rolFuncionalNombre: 'Asistencial',
        esJefatura: false,
        servicioCodigo: 'NEURO',
        servicioNombre: 'Neurocirugia',
        dias: dias.map((dia) => ({
          idCalendario: dia.idCalendario,
          fecha: dia.fecha,
          diaMes: dia.diaMes,
          valorVisual: dia.diaMes === 1 ? 'M' : dia.diaMes === 2 ? 'T' : '',
          observacionDiaria: null,
          tipoObservacionDiaria: null,
          registros:
            dia.diaMes === 1
              ? [
                  {
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
                    tramos: [],
                  },
                ]
              : dia.diaMes === 2
                ? [
                    {
                      idRolTurno: 2,
                      secuenciaDia: 1,
                      tipo: 'TURNO' as const,
                      idTurno: 2,
                      codigo: 'T',
                      nombre: 'Tarde',
                      horasProgramadas: 6,
                      horaInicio: '14:00',
                      horaFin: '20:00',
                      cruzaMedianoche: false,
                      tramos: [],
                    },
                  ]
                : [],
        })),
        totalHorasMes: 12,
        horarioResumen: '08-14,14-20',
        observacionMensual: null,
        ajustePorTraslado: null,
      },
    ],
    resumen: {
      totalPersonas: 1,
      totalDias: 5,
      totalRegistros: 2,
      totalHorasMes: 12,
    },
  };
}
