export function buildMonthlyUtcPeriod(
  anio: number,
  mes: number,
): {
  fechaInicio: Date;
  fechaFin: Date;
} {
  return {
    fechaInicio: new Date(Date.UTC(anio, mes - 1, 1, 0, 0, 0, 0)),
    fechaFin: new Date(Date.UTC(anio, mes, 0, 0, 0, 0, 0)),
  };
}
