// Fragmento SQL compartido para resolver la vista EFECTIVA de rol_turno: excluye
// POR COMPLETO los registros de una asignacion que es origen de un cambio — la
// vista efectiva es "quien esta actualmente en esta planificacion", no un
// recorte dia por dia. Si la persona ya se movio, su fila completa desaparece
// de la efectiva (incluidos los dias anteriores al traslado); esos dias siguen
// existiendo intactos en `rol_turno` y se ven desde la vista ORIGINAL, que
// nunca aplica este filtro (docs/integracion/estrategia-integracion-asistencia-
// y-cambios-planificacion.md seccion 12). `planificacion_cambio_asignacion` es
// una bitacora pura (no tiene estado ni se cancela, decision 2026-10-23 ver
// docs/database/decisiones-tecnicas.md seccion 147): cualquier fila activa
// cuenta. Usado tanto por TypeOrmRolTurnoRepository.listarPorPlanificacion
// (consulta en vivo) como por TypeOrmPlanificacionHistorialRepository.
// materializarRolTurno (congelamiento al cerrar) — ambos deben resolver la misma
// vista, nunca reglas divergentes (ARQUITECTURA.md §5).
export function buildExcluirOrigenTrasladadoSql(aliasRolTurno: string): string {
  return `
    NOT EXISTS (
      SELECT 1
      FROM dbo.planificacion_cambio_asignacion cambio
      WHERE cambio.id_planificacion_origen = ${aliasRolTurno}.id_planificacion
        AND cambio.id_asignacion_origen = ${aliasRolTurno}.id_asignacion_personal
        AND cambio.activo = 1
    )
  `;
}
