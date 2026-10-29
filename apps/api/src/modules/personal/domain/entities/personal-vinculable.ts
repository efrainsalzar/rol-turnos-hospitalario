// Proyeccion minima para el flujo "vincular personal a un usuario"
// (Seguridad / Usuarios). Distinta de `Personal` (identidad, catalogo base) y de
// `AsignacionConsulta` (gestion operativa de asignaciones) — este caso de uso solo
// necesita saber si la persona tiene jefatura y en que servicio/departamento, para
// decidir elegibilidad de rol. Ver docs/database/decisiones-tecnicas.md seccion 78.
export interface PersonalVinculable {
  id: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  idServicioPrincipal: number | null;
  nombreServicioPrincipal: string | null;
  idDepartamentoPrincipal: number | null;
  nombreDepartamentoPrincipal: string | null;
  esJefaturaRolFuncional: boolean;
}
