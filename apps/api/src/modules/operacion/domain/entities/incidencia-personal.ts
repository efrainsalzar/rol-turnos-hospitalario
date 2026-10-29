import { IncidenciaPersonalScope } from './incidencia-personal-scope';

export interface IncidenciaPersonal {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  alcance: IncidenciaPersonalScope;
  esLaborable: boolean;
  generaHorasTrabajadas: boolean;
  computaParaMetaHoras: boolean;
  requiereRespaldo: boolean;
  activo: boolean;
}
