import { useMemo } from 'react';
import { useActiveSession } from './use-active-session';
import type { UsuarioCapacidadesOperativas, UsuarioPermisosOperativos, UsuarioSesion } from 'types/api';

type PermissionKey = keyof UsuarioPermisosOperativos;
type CapabilityKey = keyof UsuarioCapacidadesOperativas;

const EMPTY_PERMISSIONS: UsuarioPermisosOperativos = {
  puedeVerOrganizacion: false,
  puedeVerPersonal: false,
  puedeGestionarPersonal: false,
  puedeVerAsignaciones: false,
  puedeGestionarAsignaciones: false,
  puedeVerSeguridad: false,
  puedeGestionarUsuarios: false,
  puedeVerOperacion: false,
  puedeVerPlanificacion: false,
  puedeEditarPlanificacion: false,
  puedeAprobarPlanificacion: false,
  puedeVerReportes: false
};

const EMPTY_CAPABILITIES: UsuarioCapacidadesOperativas = {
  verCalendarios: false,
  gestionarCalendarios: false,
  verIncidenciasPersonales: false,
  gestionarIncidenciasPersonales: false,
  gestionarTiposFeriado: false,
  verCargasHorarias: false,
  gestionarCargasHorarias: false,
  verTurnos: false,
  crearPlanificacion: false,
  editarPlanificacion: false,
  enviarRevisionPlanificacion: false,
  volverBorradorPlanificacion: false,
  aprobarPlanificacion: false,
  cerrarPlanificacion: false,
  exportarPlanificacion: false,
  exportarPlanificacionLote: false,
  gestionarCodigosOperativos: false,
  gestionarTurnos: false,
  gestionarServicios: false
};

export function useAccessControl() {
  const session = useActiveSession();
  const permissions = useMemo(() => resolveSessionPermissions(session), [session]);
  const capabilities = useMemo(() => resolveSessionCapabilities(session), [session]);

  return {
    session,
    permissions,
    capabilities,
    hasPermission: (key: PermissionKey) => permissions[key],
    hasCapability: (key: CapabilityKey) => capabilities[key],
    hasRole: (rolCodigo: string) => session?.rolSeguridad.codigo === rolCodigo
  };
}

export function canAccessPermission(session: UsuarioSesion | null, key: PermissionKey) {
  return resolveSessionPermissions(session)[key];
}

export function canAccessCapability(session: UsuarioSesion | null, key: CapabilityKey) {
  return resolveSessionCapabilities(session)[key];
}

export interface AccessProfile {
  permission?: PermissionKey | null;
  permissions?: PermissionKey[];
  capability?: CapabilityKey | null;
  capabilities?: CapabilityKey[];
  requireGlobalCatalogs?: boolean;
}

/**
 * Evalua un perfil de acceso independiente (permiso + capability propios).
 * Se usa para combinar varios perfiles con OR cuando dos pantallas con
 * permisos distintos conviven bajo una misma ruta/tab (ver `anyOf` en
 * RequirePermission y en el filtro de menu).
 */
export function canAccessProfile(session: UsuarioSesion | null, profile: AccessProfile): boolean {
  const permissionList = profile.permissions?.length ? profile.permissions : profile.permission ? [profile.permission] : [];
  if (permissionList.length && !permissionList.some((key) => canAccessPermission(session, key))) {
    return false;
  }

  const capabilityList = profile.capabilities?.length ? profile.capabilities : profile.capability ? [profile.capability] : [];
  if (capabilityList.length && !capabilityList.some((key) => canAccessCapability(session, key))) {
    return false;
  }

  if (profile.requireGlobalCatalogs && !canAccessGlobalCatalogs(session)) {
    return false;
  }

  return true;
}

export function canAccessGlobalCatalogs(session: UsuarioSesion | null) {
  if (!session) {
    return false;
  }

  const permissions = resolveSessionPermissions(session);
  const capabilities = resolveSessionCapabilities(session);

  return Boolean(
    session.puedeGestionarTodo ||
    session.alcancePlanificacion === 'SISTEMA' ||
    permissions.puedeGestionarPersonal ||
    permissions.puedeGestionarUsuarios ||
    capabilities.gestionarServicios
  );
}

export function canManageOrganizacionCatalog(session: UsuarioSesion | null) {
  if (!session) {
    return false;
  }

  const capabilities = resolveSessionCapabilities(session);
  return Boolean(session.puedeGestionarTodo || capabilities.gestionarServicios);
}

// El backend restringe la gestion de catalogos globales del calendario (calendario,
// tipos de feriado, incidencias personales) a alcance SISTEMA ademas de la capacidad,
// porque son catalogos sin id_servicio/id_departamento. Este helper replica esa misma
// condicion aqui para no mostrar acciones que el backend va a rechazar.
export function hasSystemScope(session: UsuarioSesion | null) {
  if (!session) {
    return false;
  }

  return Boolean(session.puedeGestionarTodo || session.alcancePlanificacion === 'SISTEMA');
}

export function canManageGlobalCalendarCatalog(session: UsuarioSesion | null, capabilityKey: CapabilityKey) {
  if (!session) {
    return false;
  }

  return hasSystemScope(session) && resolveSessionCapabilities(session)[capabilityKey];
}

export function resolveSessionPermissions(session: UsuarioSesion | null) {
  return session?.permisos || EMPTY_PERMISSIONS;
}

export function resolveSessionCapabilities(session: UsuarioSesion | null) {
  return session?.capacidades || EMPTY_CAPABILITIES;
}

export const MENU_PERMISSIONS = {
  system: null,
  organizacion: 'puedeVerOrganizacion',
  personal: 'puedeVerPersonal',
  asignaciones: 'puedeVerAsignaciones',
  seguridad: 'puedeVerSeguridad',
  operacion: 'puedeVerOperacion',
  planificacion: 'puedeVerPlanificacion'
} as const;

export type AccessPermissionKey = PermissionKey;
export type AccessCapabilityKey = CapabilityKey;
