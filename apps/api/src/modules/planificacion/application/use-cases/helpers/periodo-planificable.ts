import { BadRequestException } from '@nestjs/common';
import { nombrePeriodo } from './planificacion-mensajes';

export interface PeriodoPlanificable {
  anio: number;
  mes: number;
}

export function getPeriodosPlanificables(
  referenceDate: Date = new Date(),
  timeZone = 'America/La_Paz',
): [PeriodoPlanificable, PeriodoPlanificable] {
  const { anio, mes } = getYearAndMonthInTimeZone(referenceDate, timeZone);

  if (mes === 12) {
    return [
      { anio, mes },
      { anio: anio + 1, mes: 1 },
    ];
  }

  return [
    { anio, mes },
    { anio, mes: mes + 1 },
  ];
}

export function assertPeriodoPlanificable(
  anio: number,
  mes: number,
  referenceDate: Date = new Date(),
  timeZone = 'America/La_Paz',
): void {
  const periodos = getPeriodosPlanificables(referenceDate, timeZone);
  const permitido = periodos.some(
    (periodo) => periodo.anio === anio && periodo.mes === mes,
  );

  if (!permitido) {
    const [actual, siguiente] = periodos;
    throw new BadRequestException(
      `Solo se puede planificar el mes actual o el siguiente. Periodos permitidos: ${nombrePeriodo(actual.anio, actual.mes)} y ${nombrePeriodo(siguiente.anio, siguiente.mes)}.`,
    );
  }
}

/**
 * Ventana de solo-lectura para jefaturas (JEFE_SERVICIO/JEFE_DEPARTAMENTO):
 * mes anterior (para consultar planificaciones ya cerradas), mes actual y
 * mes siguiente (los dos gestionables via getPeriodosPlanificables). No
 * incluye historial mas alla de un mes atras a proposito.
 */
export function getPeriodosVisiblesJefatura(
  referenceDate: Date = new Date(),
  timeZone = 'America/La_Paz',
): [PeriodoPlanificable, PeriodoPlanificable, PeriodoPlanificable] {
  const [actual, siguiente] = getPeriodosPlanificables(referenceDate, timeZone);
  const anterior =
    actual.mes === 1
      ? { anio: actual.anio - 1, mes: 12 }
      : { anio: actual.anio, mes: actual.mes - 1 };

  return [anterior, actual, siguiente];
}

export function estaDentroDePeriodoVisibleJefatura(
  anio: number,
  mes: number,
  referenceDate: Date = new Date(),
  timeZone = 'America/La_Paz',
): boolean {
  return getPeriodosVisiblesJefatura(referenceDate, timeZone).some(
    (periodo) => periodo.anio === anio && periodo.mes === mes,
  );
}

function getYearAndMonthInTimeZone(
  referenceDate: Date,
  timeZone: string,
): PeriodoPlanificable {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  });

  const parts = formatter.formatToParts(referenceDate);
  const yearPart = parts.find((part) => part.type === 'year')?.value;
  const monthPart = parts.find((part) => part.type === 'month')?.value;

  if (!yearPart || !monthPart) {
    throw new Error('No se pudo resolver el periodo planificable actual.');
  }

  return {
    anio: Number(yearPart),
    mes: Number(monthPart),
  };
}
