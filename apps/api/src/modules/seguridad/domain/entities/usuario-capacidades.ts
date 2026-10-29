export interface UsuarioCapacidadesOperativas {
  verCalendarios: boolean;
  gestionarCalendarios: boolean;
  verIncidenciasPersonales: boolean;
  gestionarIncidenciasPersonales: boolean;
  gestionarTiposFeriado: boolean;
  verCargasHorarias: boolean;
  gestionarCargasHorarias: boolean;
  verTurnos: boolean;
  crearPlanificacion: boolean;
  editarPlanificacion: boolean;
  enviarRevisionPlanificacion: boolean;
  volverBorradorPlanificacion: boolean;
  aprobarPlanificacion: boolean;
  cerrarPlanificacion: boolean;
  exportarPlanificacion: boolean;
  exportarPlanificacionLote: boolean;
  gestionarCodigosOperativos: boolean;
  gestionarTurnos: boolean;
  gestionarServicios: boolean;
}

export function normalizeCapacidadesOperativas(
  source?: Partial<UsuarioCapacidadesOperativas> | null,
): UsuarioCapacidadesOperativas {
  return {
    verCalendarios: Boolean(source?.verCalendarios),
    gestionarCalendarios: Boolean(source?.gestionarCalendarios),
    verIncidenciasPersonales: Boolean(source?.verIncidenciasPersonales),
    gestionarIncidenciasPersonales: Boolean(
      source?.gestionarIncidenciasPersonales,
    ),
    gestionarTiposFeriado: Boolean(source?.gestionarTiposFeriado),
    verCargasHorarias: Boolean(source?.verCargasHorarias),
    gestionarCargasHorarias: Boolean(source?.gestionarCargasHorarias),
    verTurnos: Boolean(source?.verTurnos),
    crearPlanificacion: Boolean(source?.crearPlanificacion),
    editarPlanificacion: Boolean(source?.editarPlanificacion),
    enviarRevisionPlanificacion: Boolean(source?.enviarRevisionPlanificacion),
    volverBorradorPlanificacion: Boolean(source?.volverBorradorPlanificacion),
    aprobarPlanificacion: Boolean(source?.aprobarPlanificacion),
    cerrarPlanificacion: Boolean(source?.cerrarPlanificacion),
    exportarPlanificacion: Boolean(source?.exportarPlanificacion),
    exportarPlanificacionLote: Boolean(source?.exportarPlanificacionLote),
    gestionarCodigosOperativos: Boolean(source?.gestionarCodigosOperativos),
    gestionarTurnos: Boolean(source?.gestionarTurnos),
    gestionarServicios: Boolean(source?.gestionarServicios),
  };
}
