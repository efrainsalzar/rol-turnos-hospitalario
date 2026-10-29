export interface Personal {
  id: number;
  codigoPersonal: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  idNivelCargo: number;
  codigoNivelCargo: string | null;
  nombreNivelCargo: string | null;
  // Senal minima para el listado: si la persona tiene una asignacion PRINCIPAL
  // activa o no. El detalle completo (servicio, rol, item, carga horaria) es
  // responsabilidad exclusiva de asignaciones.tsx / obtenerDetalle(), no de este
  // listado (docs/database/decisiones-tecnicas.md seccion 78).
  tieneAsignacionActiva: boolean;
  activo: boolean;
}
