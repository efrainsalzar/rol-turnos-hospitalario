export interface UsuarioPermisosOperativos {
  puedeVerOrganizacion: boolean;
  puedeVerPersonal: boolean;
  puedeGestionarPersonal: boolean;
  puedeVerAsignaciones: boolean;
  puedeGestionarAsignaciones: boolean;
  puedeVerSeguridad: boolean;
  puedeGestionarUsuarios: boolean;
  puedeVerOperacion: boolean;
  puedeVerPlanificacion: boolean;
  puedeEditarPlanificacion: boolean;
  puedeAprobarPlanificacion: boolean;
  puedeVerReportes: boolean;
}

export function normalizePermisosOperativos(
  source?: Partial<UsuarioPermisosOperativos> | null,
): UsuarioPermisosOperativos {
  return {
    puedeVerOrganizacion: Boolean(source?.puedeVerOrganizacion),
    puedeVerPersonal: Boolean(source?.puedeVerPersonal),
    puedeGestionarPersonal: Boolean(source?.puedeGestionarPersonal),
    puedeVerAsignaciones: Boolean(source?.puedeVerAsignaciones),
    puedeGestionarAsignaciones: Boolean(source?.puedeGestionarAsignaciones),
    puedeVerSeguridad: Boolean(source?.puedeVerSeguridad),
    puedeGestionarUsuarios: Boolean(source?.puedeGestionarUsuarios),
    puedeVerOperacion: Boolean(source?.puedeVerOperacion),
    puedeVerPlanificacion: Boolean(source?.puedeVerPlanificacion),
    puedeEditarPlanificacion: Boolean(source?.puedeEditarPlanificacion),
    puedeAprobarPlanificacion: Boolean(source?.puedeAprobarPlanificacion),
    puedeVerReportes: Boolean(source?.puedeVerReportes),
  };
}
