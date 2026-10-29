export interface Usuario {
  id: number;
  idPersonal: number | null;
  codigoPersonal: string | null;
  nombreCompleto: string | null;
  idRolSeguridad: number | null;
  rolCodigo: string | null;
  rolNombre: string | null;
  tipoUsuario: string;
  proveedorAutenticacion: string;
  sujetoAutenticacion: string | null;
  username: string;
  identidadLocalHabilitada: boolean;
  activo: boolean;
}
