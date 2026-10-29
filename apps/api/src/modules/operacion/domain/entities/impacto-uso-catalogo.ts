export interface ImpactoUsoPlanificacion {
  id: number;
  anio: number;
  mes: number;
  estado: string;
  totalCeldas: number;
}

export interface ImpactoUsoCatalogo {
  totalCeldas: number;
  totalPlanificaciones: number;
  planificaciones: ImpactoUsoPlanificacion[];
}

export interface ResultadoLimpiezaCeldas {
  celdasEliminadas: number;
  planificacionesAfectadas: number;
}

export interface ResultadoPropagacionHorario {
  celdasActualizadas: number;
}

export type EstrategiaCeldasExistentes = 'PROPAGAR' | 'LIMPIAR';
