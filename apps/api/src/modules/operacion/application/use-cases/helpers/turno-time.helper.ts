import { ConflictException } from '@nestjs/common';

export interface TurnoCalculado {
  cruzaMedianoche: boolean;
  duracionHoras: number;
  horaInicio: string;
  horaFin: string;
}

export interface TramoInput {
  orden: number;
  horaInicio: string;
  horaFin: string;
}

export interface TramoCalculado {
  orden: number;
  horaInicio: string;
  horaFin: string;
  duracionHoras: number;
  cruzaMedianoche: boolean;
}

export function calcularTurnoDesdeHorario(
  horaInicio: string,
  horaFin: string,
): TurnoCalculado {
  const inicioMinutos = parseHoraMinutos(horaInicio);
  const finMinutos = parseHoraMinutos(horaFin);

  if (inicioMinutos === finMinutos) {
    throw new ConflictException(
      'La hora de inicio y la hora de fin del horario no pueden ser iguales.',
    );
  }

  const cruzaMedianoche = finMinutos <= inicioMinutos;
  const totalMinutos = cruzaMedianoche
    ? 24 * 60 - inicioMinutos + finMinutos
    : finMinutos - inicioMinutos;

  return {
    cruzaMedianoche,
    duracionHoras: Number((totalMinutos / 60).toFixed(2)),
    horaInicio,
    horaFin,
  };
}

export function calcularTurnoDesdeTramos(tramos: TramoInput[]): {
  turno: TurnoCalculado;
  tramos: TramoCalculado[];
} {
  if (tramos.length < 2) {
    throw new ConflictException(
      'Un horario discontinuo debe tener al menos 2 tramos.',
    );
  }

  const ordered = [...tramos].sort((a, b) => a.orden - b.orden);
  let totalMinutos = 0;
  let cruzaMedianoche = false;

  const tramosCalculados: TramoCalculado[] = ordered.map((tramo) => {
    const inicioMin = parseHoraMinutos(tramo.horaInicio);
    const finMin = parseHoraMinutos(tramo.horaFin);

    if (inicioMin === finMin) {
      throw new ConflictException(
        `El tramo ${tramo.orden} tiene la misma hora de inicio y de fin.`,
      );
    }

    const tramoCruza = finMin <= inicioMin;
    const tramoMinutos = tramoCruza
      ? 24 * 60 - inicioMin + finMin
      : finMin - inicioMin;

    totalMinutos += tramoMinutos;
    if (tramoCruza) {
      cruzaMedianoche = true;
    }

    return {
      orden: tramo.orden,
      horaInicio: tramo.horaInicio,
      horaFin: tramo.horaFin,
      duracionHoras: Number((tramoMinutos / 60).toFixed(2)),
      cruzaMedianoche: tramoCruza,
    };
  });

  return {
    turno: {
      cruzaMedianoche,
      duracionHoras: Number((totalMinutos / 60).toFixed(2)),
      horaInicio: ordered[0].horaInicio,
      horaFin: ordered[ordered.length - 1].horaFin,
    },
    tramos: tramosCalculados,
  };
}

function parseHoraMinutos(value: string): number {
  const [hoursText, minutesText] = value.split(':');
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  return hours * 60 + minutes;
}
