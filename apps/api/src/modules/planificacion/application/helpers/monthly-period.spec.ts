import { buildMonthlyUtcPeriod } from './monthly-period';

describe('buildMonthlyUtcPeriod', () => {
  it.each([
    {
      anio: 2026,
      mes: 2,
      inicio: '2026-02-01T00:00:00.000Z',
      fin: '2026-02-28T00:00:00.000Z',
    },
    {
      anio: 2024,
      mes: 2,
      inicio: '2024-02-01T00:00:00.000Z',
      fin: '2024-02-29T00:00:00.000Z',
    },
    {
      anio: 2026,
      mes: 4,
      inicio: '2026-04-01T00:00:00.000Z',
      fin: '2026-04-30T00:00:00.000Z',
    },
    {
      anio: 2026,
      mes: 7,
      inicio: '2026-07-01T00:00:00.000Z',
      fin: '2026-07-31T00:00:00.000Z',
    },
  ])(
    'builds correct UTC period for $anio-$mes',
    ({ anio, mes, inicio, fin }) => {
      const periodo = buildMonthlyUtcPeriod(anio, mes);

      expect(periodo.fechaInicio.toISOString()).toBe(inicio);
      expect(periodo.fechaFin.toISOString()).toBe(fin);
    },
  );
});
