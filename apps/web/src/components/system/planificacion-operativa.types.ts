export type OperationalToolAction =
  | { key: 'navigate'; label: 'Navegar'; shortLabel: 'NAV'; kind: 'navigate' }
  | { key: 'clear'; label: 'Limpiar'; shortLabel: 'CLR'; kind: 'clear' }
  | {
      key: string;
      label: string;
      shortLabel: string;
      kind: 'turno' | 'incidenciaPersonal';
      id: number;
      idTurno: number | null;
      idIncidenciaPersonal: number | null;
      codigo: string;
      nombre: string;
      horasProgramadas: number;
      color: string | null;
      categoria: string;
      displayLabel: string;
      horaInicio: string | null;
      horaFin: string | null;
      tramos: Array<{ orden: number; horaInicio: string; horaFin: string; duracionHoras: number; cruzaMedianoche: boolean }>;
    };
