import type { EstadoPlanificacion, UsuarioSesion } from 'types/api';

type Capabilities = NonNullable<UsuarioSesion['capacidades']>;

export function canCreatePlanificacion(capabilities: Capabilities) {
  return capabilities.crearPlanificacion;
}

export function canEditPlanificacion(capabilities: Capabilities, estado: EstadoPlanificacion | undefined) {
  if (!estado || !capabilities.editarPlanificacion) {
    return false;
  }

  if (estado === 'BORRADOR') {
    return true;
  }

  if (estado === 'REVISION') {
    return capabilities.aprobarPlanificacion;
  }

  return false;
}

export function canSendRevisionPlanificacion(capabilities: Capabilities, estado: EstadoPlanificacion | undefined) {
  return estado === 'BORRADOR' && capabilities.enviarRevisionPlanificacion;
}

export function canReturnPlanificacionToDraft(capabilities: Capabilities, estado: EstadoPlanificacion | undefined) {
  return estado === 'REVISION' && capabilities.volverBorradorPlanificacion;
}

export function canApprovePlanificacion(capabilities: Capabilities, estado: EstadoPlanificacion | undefined) {
  return estado === 'REVISION' && capabilities.aprobarPlanificacion;
}

export function canClosePlanificacion(capabilities: Capabilities, estado: EstadoPlanificacion | undefined) {
  return estado === 'APROBADA' && capabilities.cerrarPlanificacion;
}

export function canDeletePlanificacion(capabilities: Capabilities, estado: EstadoPlanificacion | undefined) {
  return estado === 'BORRADOR' && capabilities.editarPlanificacion;
}

export function canExportPlanificacion(capabilities: Capabilities) {
  return capabilities.exportarPlanificacion;
}

export function canExportPlanificacionLote(capabilities: Capabilities) {
  return capabilities.exportarPlanificacionLote;
}

export function canManageTurnos(capabilities: Capabilities) {
  return capabilities.gestionarTurnos;
}
