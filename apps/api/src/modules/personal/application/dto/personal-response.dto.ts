export interface PersonalResponseDto {
  id: number;
  codigoPersonal: string | null;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string | null;
  documentoIdentidad: string;
  idNivelCargo: number;
  codigoNivelCargo: string | null;
  nombreNivelCargo: string | null;
  // Ver comentario en domain/entities/personal.ts: el detalle de asignacion
  // (servicio, rol, item, carga horaria) vive solo en /v1/asignaciones y en
  // GET /v1/personal/:id (obtenerDetalle), no en este listado.
  tieneAsignacionActiva: boolean;
  activo: boolean;
  nombreCompleto: string;
}
