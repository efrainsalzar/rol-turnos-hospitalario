import type { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import type { UsuarioSesion } from '../../domain/entities/usuario-sesion';

export function mapUsuarioSesionToResponse(
  session: UsuarioSesion,
): UsuarioSesionResponseDto {
  return {
    id: session.id,
    username: session.username,
    tipoUsuario: session.tipoUsuario,
    proveedorAutenticacion: session.proveedorAutenticacion,
    sujetoAutenticacion: session.sujetoAutenticacion,
    identidadLocalHabilitada: session.identidadLocalHabilitada,
    activo: session.activo,
    rolSeguridad: session.rolSeguridad,
    personal: session.personal,
    alcancePlanificacion: session.alcancePlanificacion,
    puedeGestionarPlanificacion: session.puedeGestionarPlanificacion,
    puedeGestionarTodo: session.puedeGestionarTodo,
    permisos: session.permisos,
    capacidades: session.capacidades,
    departamentosGestionables: session.departamentosGestionables,
    serviciosGestionables: session.serviciosGestionables,
  };
}
