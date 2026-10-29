export function formatPeriodValue(anio: number, mes: number) {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function formatHumanPeriod(anio: number, mes: number) {
  return `${MESES[mes - 1] ?? mes} ${anio}`;
}

export function parsePeriodValue(value: string) {
  const [anioRaw, mesRaw] = value.split('-');
  const anio = Number(anioRaw);
  const mes = Number(mesRaw);

  return {
    anio: Number.isFinite(anio) ? anio : undefined,
    mes: Number.isFinite(mes) ? mes : undefined
  };
}
