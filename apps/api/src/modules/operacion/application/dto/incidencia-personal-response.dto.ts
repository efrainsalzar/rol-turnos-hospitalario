export interface IncidenciaPersonalResponseDto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  alcance: 'GENERAL' | 'PERSONAL' | 'OTRO';
  esLaborable: boolean;
  generaHorasTrabajadas: boolean;
  computaParaMetaHoras: boolean;
  requiereRespaldo: boolean;
  activo: boolean;
}
