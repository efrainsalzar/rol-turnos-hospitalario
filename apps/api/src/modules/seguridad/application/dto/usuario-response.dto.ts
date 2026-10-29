export interface UsuarioResponseDto {
  id: number;
  username: string;
  tipoUsuario: string;
  proveedorAutenticacion: string;
  sujetoAutenticacion: string | null;
  identidadLocalHabilitada: boolean;
  activo: boolean;
  rolSeguridad: {
    id: number | null;
    codigo: string | null;
    nombre: string | null;
  };
  personal: {
    id: number | null;
    codigoPersonal: string | null;
    nombreCompleto: string | null;
  };
}
