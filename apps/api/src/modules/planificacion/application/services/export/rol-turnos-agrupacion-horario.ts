import type { MatrizMensualPlanificacionResponseDto } from '../../dto/matriz-mensual-planificacion-response.dto';
import { buildHorarioSegmento } from '../../use-cases/obtener-matriz-mensual-planificacion.use-case';

type FilaMatriz = MatrizMensualPlanificacionResponseDto['filas'][number];
type DiaFilaMatriz = FilaMatriz['dias'][number];

export interface GrupoHorarioTurno {
  idTurno: number;
  horarioResumen: string;
  dias: Map<number, DiaFilaMatriz>;
}

export type FilaAgrupadaPorHorario =
  | { tipo: 'simple'; fila: FilaMatriz }
  | {
      tipo: 'multiple';
      fila: FilaMatriz;
      grupos: GrupoHorarioTurno[];
      diasIncidencia: Map<number, DiaFilaMatriz>;
    };

/**
 * Agrupa los dias de una fila (persona) por turno unico asignado en el mes.
 * Una persona con 0 o 1 turno distinto se mantiene 'simple' (se renderiza
 * igual que el formato actual, una sola fila). Con 2+ turnos distintos, se
 * arma un grupo por idTurno para que la exportacion multi-horario pueda
 * mostrar una fila por horario, dejando los dias de incidencia (sin turno)
 * como un bloque aparte para fusionar en todas las filas de esa persona.
 *
 * Si un mismo dia tiene mas de un turno asignado (multi-turno), el dia se
 * asigna al turno que aparece primero ese dia: este modelo reparte dias
 * completos entre filas, no fracciones de un dia entre dos turnos.
 */
export function agruparFilaPorHorario(
  fila: FilaMatriz,
): FilaAgrupadaPorHorario {
  const gruposPorTurno = new Map<
    number,
    { dias: Map<number, DiaFilaMatriz> }
  >();
  const diasIncidencia = new Map<number, DiaFilaMatriz>();

  for (const dia of fila.dias) {
    const registroTurno = dia.registros.find(
      (registro) => registro.tipo === 'TURNO' && registro.idTurno !== null,
    );

    if (!registroTurno || registroTurno.idTurno === null) {
      if (dia.registros.length > 0) {
        diasIncidencia.set(dia.idCalendario, dia);
      }
      continue;
    }

    const grupo = gruposPorTurno.get(registroTurno.idTurno) ?? {
      dias: new Map<number, DiaFilaMatriz>(),
    };
    grupo.dias.set(dia.idCalendario, dia);
    gruposPorTurno.set(registroTurno.idTurno, grupo);
  }

  if (gruposPorTurno.size <= 1) {
    return { tipo: 'simple', fila };
  }

  const grupos: GrupoHorarioTurno[] = Array.from(gruposPorTurno.entries()).map(
    ([idTurno, grupo]) => ({
      idTurno,
      horarioResumen: buildHorarioResumenGrupo(grupo.dias),
      dias: grupo.dias,
    }),
  );

  return { tipo: 'multiple', fila, grupos, diasIncidencia };
}

export function agruparFilasPorHorario(
  filas: FilaMatriz[],
): FilaAgrupadaPorHorario[] {
  return filas.map((fila) => agruparFilaPorHorario(fila));
}

function buildHorarioResumenGrupo(dias: Map<number, DiaFilaMatriz>): string {
  const segmentos = new Map<string, string>();

  for (const dia of dias.values()) {
    for (const registro of dia.registros) {
      if (registro.tipo !== 'TURNO') {
        continue;
      }

      if (registro.tramos.length > 0) {
        for (const tramo of registro.tramos) {
          const segmento = buildHorarioSegmento(
            tramo.horaInicio,
            tramo.horaFin,
          );
          segmentos.set(segmento, segmento);
        }
        continue;
      }

      if (registro.horaInicio && registro.horaFin) {
        const segmento = buildHorarioSegmento(
          registro.horaInicio,
          registro.horaFin,
        );
        segmentos.set(segmento, segmento);
      }
    }
  }

  return Array.from(segmentos.values()).join(',');
}
