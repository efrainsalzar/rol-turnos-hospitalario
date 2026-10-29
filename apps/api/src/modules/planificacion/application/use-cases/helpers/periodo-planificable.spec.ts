import {
  assertPeriodoPlanificable,
  estaDentroDePeriodoVisibleJefatura,
  getPeriodosPlanificables,
  getPeriodosVisiblesJefatura,
} from './periodo-planificable';

const TZ = 'America/La_Paz';

describe('getPeriodosPlanificables', () => {
  it('devuelve el mes actual y el siguiente dentro del mismo anio', () => {
    const referencia = new Date('2026-07-15T12:00:00-04:00');

    expect(getPeriodosPlanificables(referencia, TZ)).toEqual([
      { anio: 2026, mes: 7 },
      { anio: 2026, mes: 8 },
    ]);
  });

  it('cruza de anio cuando el mes actual es diciembre', () => {
    const referencia = new Date('2026-12-20T12:00:00-04:00');

    expect(getPeriodosPlanificables(referencia, TZ)).toEqual([
      { anio: 2026, mes: 12 },
      { anio: 2027, mes: 1 },
    ]);
  });
});

describe('getPeriodosVisiblesJefatura', () => {
  it('agrega el mes anterior a los dos periodos planificables', () => {
    const referencia = new Date('2026-07-15T12:00:00-04:00');

    expect(getPeriodosVisiblesJefatura(referencia, TZ)).toEqual([
      { anio: 2026, mes: 6 },
      { anio: 2026, mes: 7 },
      { anio: 2026, mes: 8 },
    ]);
  });

  it('REGRESION: retrocede de anio cuando el mes actual es enero', () => {
    // Antes de este fix no existia esta funcion; este caso cubre el borde
    // donde "mes anterior" cae en diciembre del anio previo.
    const referencia = new Date('2026-01-10T12:00:00-04:00');

    expect(getPeriodosVisiblesJefatura(referencia, TZ)).toEqual([
      { anio: 2025, mes: 12 },
      { anio: 2026, mes: 1 },
      { anio: 2026, mes: 2 },
    ]);
  });

  it('avanza de anio en el siguiente cuando el mes actual es diciembre', () => {
    const referencia = new Date('2026-12-20T12:00:00-04:00');

    expect(getPeriodosVisiblesJefatura(referencia, TZ)).toEqual([
      { anio: 2026, mes: 11 },
      { anio: 2026, mes: 12 },
      { anio: 2027, mes: 1 },
    ]);
  });
});

describe('estaDentroDePeriodoVisibleJefatura', () => {
  const referencia = new Date('2026-07-15T12:00:00-04:00');

  it.each([
    [2026, 6],
    [2026, 7],
    [2026, 8],
  ])(
    'acepta %i-%i (dentro de la ventana anterior/actual/siguiente)',
    (anio, mes) => {
      expect(
        estaDentroDePeriodoVisibleJefatura(anio, mes, referencia, TZ),
      ).toBe(true);
    },
  );

  it.each([
    [2026, 5],
    [2026, 9],
    [2020, 1],
  ])('rechaza %i-%i (fuera de la ventana)', (anio, mes) => {
    expect(estaDentroDePeriodoVisibleJefatura(anio, mes, referencia, TZ)).toBe(
      false,
    );
  });
});

describe('assertPeriodoPlanificable (sin cambios de comportamiento)', () => {
  it('sigue aceptando solo el mes actual o el siguiente para crear/actualizar/duplicar', () => {
    const referencia = new Date('2026-07-15T12:00:00-04:00');

    expect(() =>
      assertPeriodoPlanificable(2026, 7, referencia, TZ),
    ).not.toThrow();
    expect(() =>
      assertPeriodoPlanificable(2026, 8, referencia, TZ),
    ).not.toThrow();
    expect(() => assertPeriodoPlanificable(2026, 6, referencia, TZ)).toThrow();
  });
});
