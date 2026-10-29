import ExcelJS from 'exceljs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PlanificacionExcelExportService } from './planificacion-excel-export.service';
import { TurnoExportCodeCatalogService } from './turno-export-code-catalog.service';
import { RolTurnosTemplate2026 } from './templates/rol-turnos-template-2026';
import { RolTurnosTemplateDefault } from './templates/rol-turnos-template-default';
import { RolTurnosTemplateRegistry } from './templates/rol-turnos-template.registry';
import type { MatrizMensualPlanificacionResponseDto } from '../../dto/matriz-mensual-planificacion-response.dto';
import { TurnoExportCodeMapper } from './turno-export-code.mapper';
import type { CodigoExportacionRolTurnos } from '../../../domain/entities/codigo-exportacion-rol-turnos';

describe('PlanificacionExcelExportService', () => {
  it('generates a workbook with sheet, 31 days, personal rows and total hours', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const buffer = await service.buildWorkbookBuffer(buildMatrizFixture());
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet).toBeDefined();
    expect(worksheet.name).toBe('NEURO');
    expect(worksheet.getCell(1, 10).value).toBe('SISTEMA DE ROLES Y TURNOS');
    expect(worksheet.getCell(5, 10).value).toBe('1\nFN');
    expect(worksheet.getCell(5, 40).value).toBe(31);
    expect(worksheet.getCell(7, 1).value).toBe(1);
    expect(worksheet.getCell(7, 2).value).toBe('260101');
    expect(worksheet.getCell(7, 41).value).toBe(24);
    expect(worksheet.getCell(7, 42).value).toBe('08-14\n14-20\n20-08');
    expect(worksheet.getCell(7, 43).value).toBe('');
    expect(worksheet.getCell(7, 10).value).toBe('6');
    expect(worksheet.getCell(7, 11).value).toBe('6');
  });

  it('uses department labels when exporting a planificacion without servicio', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const fixture = buildMatrizFixture();
    fixture.planificacion = {
      ...fixture.planificacion,
      idServicio: null,
      idDepartamento: 7,
      codigoDepartamento: 'ENF',
      nombreDepartamento: 'Enfermeria',
      codigoServicio: null,
      nombreServicio: null,
    };

    const buffer = await service.buildWorkbookBuffer(fixture);
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.name).toBe('ENF');
    expect(worksheet.getCell(2, 10).value).toBe(
      'ROL DE TURNOS DEPARTAMENTO ENFERMERIA',
    );
  });

  it('does not fail when monthly observation is empty', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    await expect(
      service.buildWorkbookBuffer(buildMatrizFixture()),
    ).resolves.toBeInstanceOf(Buffer);
  });

  it('renders numeric RRHH mode when requested', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const buffer = await service.buildWorkbookBuffer(buildMatrizFixture(), {
      modo: 'numerico',
    });
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell(7, 10).value).toBe('6');
    expect(worksheet.getCell(7, 11).value).toBe('6');
    expect(worksheet.getCell(7, 12).value).toBe('12');
  });

  it('splits a person into one row per distinct turno when formato=multi-horario', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const buffer = await service.buildWorkbookBuffer(buildMatrizFixture(), {
      formato: 'multi-horario',
    });
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    // Manana (idTurno 1, dia 1) en su propia fila.
    expect(worksheet.getCell(7, 10).value).toBe('6');
    expect(worksheet.getCell(7, 11).value).toBeNull();
    expect(worksheet.getCell(7, 42).value).toBe('08-14');

    // Tarde (idTurno 2, dia 2) en la siguiente fila.
    expect(worksheet.getCell(8, 10).value).toBeNull();
    expect(worksheet.getCell(8, 11).value).toBe('6');
    expect(worksheet.getCell(8, 42).value).toBe('14-20');

    // Noche (idTurno 3, dia 3) en la tercera fila del bloque.
    expect(worksheet.getCell(9, 11).value).toBeNull();
    expect(worksheet.getCell(9, 12).value).toBe('12');
    expect(worksheet.getCell(9, 42).value).toBe('20-08');

    // Columnas de identidad y total se fusionan: el mismo valor se lee en
    // cualquier fila del bloque de esa persona.
    expect(worksheet.getCell(7, 6).value).toBe('Flores');
    expect(worksheet.getCell(9, 6).value).toBe('Flores');
    expect(worksheet.getCell(7, 41).value).toBe(24);
    expect(worksheet.getCell(9, 41).value).toBe(24);
  });

  it('paints the holiday column gray on every row of a multi-horario block, even on blank cells (estilo=texto)', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const buffer = await service.buildWorkbookBuffer(buildMatrizFixture(), {
      formato: 'multi-horario',
      estilo: 'texto',
    });
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    // Dia 1 (columna 10) es feriado. Fila 7 (Manana) tiene registro ese dia;
    // filas 8 y 9 (Tarde/Noche) lo tienen en blanco porque no es su turno —
    // las tres deben pintarse gris igual, sin importar si la celda tiene valor.
    const holidayFill = (row: number) =>
      (worksheet.getCell(row, 10).fill as ExcelJS.FillPattern | undefined)
        ?.fgColor?.argb;

    expect(holidayFill(7)).toBe('FFE0E0E0');
    expect(holidayFill(8)).toBe('FFE0E0E0');
    expect(holidayFill(9)).toBe('FFE0E0E0');

    // Dia 2 (columna 11) no es feriado: una celda en blanco ahi no debe
    // pintarse de nada.
    const nonHolidayFill = (
      worksheet.getCell(7, 11).fill as ExcelJS.FillPattern | undefined
    )?.fgColor?.argb;
    expect(nonHolidayFill).toBeUndefined();
  });

  it('keeps a single row for a person with only one turno, even in formato=multi-horario', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const fixture = buildMatrizFixture();
    fixture.filas[0].dias = fixture.filas[0].dias.map((dia) =>
      dia.diaMes === 2 || dia.diaMes === 3
        ? { ...dia, registros: [], valorVisual: '' }
        : dia,
    );
    fixture.filas[0].horarioResumen = '08-14';

    const buffer = await service.buildWorkbookBuffer(fixture, {
      formato: 'multi-horario',
    });
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell(7, 10).value).toBe('6');
    expect(worksheet.getCell(7, 42).value).toBe('08-14');
    expect(worksheet.getCell(8, 1).value).toBeNull();
  });

  it('splits rows by turno in the default template (non-2026 anio) too', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const fixture = buildMatrizFixture();
    fixture.planificacion.anio = 2027;

    const buffer = await service.buildWorkbookBuffer(fixture, {
      formato: 'multi-horario',
    });
    const workbook = await readWorkbookFromBuffer(buffer);
    const worksheet = workbook.worksheets[0];

    // Columnas: 1 No, 2 Item, 3 C/H, 4 Personal, 5 Horario, 6 Total, 7.. dias.
    expect(worksheet.getCell(5, 7).value).toBe('6');
    expect(worksheet.getCell(5, 5).value).toBe('08-14');
    expect(worksheet.getCell(6, 8).value).toBe('6');
    expect(worksheet.getCell(6, 5).value).toBe('14-20');
    expect(worksheet.getCell(7, 9).value).toBe('12');
    expect(worksheet.getCell(7, 5).value).toBe('20-08');

    expect(worksheet.getCell(5, 4).value).toBe('Flores Condori, Carla Beatriz');
    expect(worksheet.getCell(7, 4).value).toBe('Flores Condori, Carla Beatriz');
    expect(worksheet.getCell(5, 6).value).toBe(24);
    expect(worksheet.getCell(7, 6).value).toBe(24);
  });

  it('generates unique worksheet names when exporting multiple plans of the same service', async () => {
    const service = new PlanificacionExcelExportService(
      new RolTurnosTemplateRegistry(
        new RolTurnosTemplate2026(),
        new RolTurnosTemplateDefault(),
      ),
      buildCatalogService(),
    );

    const primera = buildMatrizFixture();
    const segunda = {
      ...buildMatrizFixture(),
      planificacion: {
        ...buildMatrizFixture().planificacion,
        id: 2,
      },
    };

    const buffer = await service.buildWorkbookBufferMany([primera, segunda], {
      modo: 'numerico',
    });
    const workbook = await readWorkbookFromBuffer(buffer);

    expect(workbook.worksheets).toHaveLength(2);
    expect(workbook.worksheets[0]?.name).toBe('NEURO');
    expect(workbook.worksheets[1]?.name).toBe('NEURO 5-2026');
  });
});

function buildCatalogService() {
  return {
    buildMapper: jest
      .fn()
      .mockResolvedValue(
        new TurnoExportCodeMapper([
          buildCode('M', 'M', '6', 'Manana', 'TIPO_TURNO'),
          buildCode('T', 'T', '7', 'Tarde', 'TIPO_TURNO'),
          buildCode('N', 'N', '8', 'Noche', 'TIPO_TURNO'),
          buildCode('LICENCIA', 'LIC', 'LV', 'Licencia', 'TIPO_DIA'),
          buildCode('VACACION', 'VAC', 'V', 'Vacacion', 'TIPO_DIA'),
          buildCode('FERIADO', 'FN', 'FN', 'Feriado Nacional', 'TIPO_DIA'),
        ]),
      ),
  } as unknown as TurnoExportCodeCatalogService;
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

async function readWorkbookFromBuffer(
  buffer: Buffer,
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const tempFilePath = path.join(
    os.tmpdir(),
    `planificacion-excel-export-${Date.now()}-${Math.random()}.xlsx`,
  );

  try {
    await fs.writeFile(tempFilePath, buffer);
    await workbook.xlsx.readFile(tempFilePath);
  } finally {
    await fs.unlink(tempFilePath).catch(() => undefined);
  }

  return workbook;
}

function buildMatrizFixture(): MatrizMensualPlanificacionResponseDto {
  const dias = Array.from({ length: 31 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 4, index + 1));
    const day = date.getUTCDay();
    const isWeekend = day === 0 || day === 6;

    return {
      idCalendario: 1000 + index,
      fecha: date.toISOString(),
      anio: 2026,
      mes: 5,
      diaMes: index + 1,
      diaSemanaNombre: resolveDayName(day),
      abreviaturaDiaSemana: resolveDayShort(day),
      esFinSemana: isWeekend,
      esFeriado: index === 0,
      codigoFeriado: index === 0 ? 'FN' : null,
      nombreFeriado: index === 0 ? 'Dia del trabajo' : null,
    };
  });

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
      fechaFin: '2026-05-31T00:00:00.000Z',
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
        rolFuncionalCodigo: 'JEFE_SERVICIO',
        rolFuncionalNombre: 'Jefa de Servicio',
        esJefatura: true,
        servicioCodigo: 'NEURO',
        servicioNombre: 'Neurocirugia',
        dias: dias.map((dia) => ({
          idCalendario: dia.idCalendario,
          fecha: dia.fecha,
          diaMes: dia.diaMes,
          valorVisual:
            dia.diaMes === 1
              ? 'M'
              : dia.diaMes === 2
                ? 'T'
                : dia.diaMes === 3
                  ? 'N'
                  : '',
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
                : dia.diaMes === 3
                  ? [
                      {
                        idRolTurno: 3,
                        secuenciaDia: 1,
                        tipo: 'TURNO' as const,
                        idTurno: 3,
                        codigo: 'N',
                        nombre: 'Noche',
                        horasProgramadas: 12,
                        horaInicio: '20:00',
                        horaFin: '08:00',
                        cruzaMedianoche: true,
                        tramos: [],
                      },
                    ]
                  : [],
        })),
        totalHorasMes: 24,
        horarioResumen: '08-14,14-20,20-08',
        observacionMensual: null,
        ajustePorTraslado: null,
      },
    ],
    resumen: {
      totalPersonas: 1,
      totalDias: 31,
      totalRegistros: 3,
      totalHorasMes: 24,
    },
  };
}

function resolveDayName(day: number): string {
  return [
    'Domingo',
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado',
  ][day];
}

function resolveDayShort(day: number): string {
  return ['D', 'L', 'M', 'M', 'J', 'V', 'S'][day];
}
