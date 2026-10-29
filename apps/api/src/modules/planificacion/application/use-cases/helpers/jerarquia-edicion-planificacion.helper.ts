import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';

/**
 * Rango exclusivo para decidir quien puede tomarle el control de edicion de
 * la matriz a otro usuario. Deliberadamente NO reutiliza
 * actor.alcancePlanificacion: ese campo controla la visibilidad de datos en
 * todo el sistema (hasSystemScope/hasDepartamentoScope/...) y hoy RRHH y
 * ADMIN_SISTEMA comparten el mismo valor ('SISTEMA'), mientras que aqui RRHH
 * debe quedar estrictamente por debajo de ADMIN_SISTEMA y por encima de
 * JEFE_DEPARTAMENTO. Mezclar ambos conceptos en un solo campo habria forzado
 * a introducir un valor nuevo en alcance_planificacion con efectos
 * colaterales en filtros de datos que no tienen relacion con este control de
 * edicion.
 */
const RANGO_EDICION_POR_ROL: Record<string, number> = {
  ADMIN_SISTEMA: 4,
  RRHH: 3,
  JEFE_DEPARTAMENTO: 2,
  JEFE_SERVICIO: 1,
};

export function obtenerRangoEdicion(actor: UsuarioSesionResponseDto): number {
  const codigoRol = actor.rolSeguridad.codigo;

  if (!codigoRol) {
    return 0;
  }

  return RANGO_EDICION_POR_ROL[codigoRol] ?? 0;
}

export function obtenerRangoEdicionPorCodigoRol(
  codigoRol: string | null,
): number {
  if (!codigoRol) {
    return 0;
  }

  return RANGO_EDICION_POR_ROL[codigoRol] ?? 0;
}

/** Rango igual o superior habilita tomar el control (ver decisiones-tecnicas.md). */
export function puedeTomarControl(
  actor: UsuarioSesionResponseDto,
  codigoRolActual: string | null,
): boolean {
  return (
    obtenerRangoEdicion(actor) >=
    obtenerRangoEdicionPorCodigoRol(codigoRolActual)
  );
}

const ETIQUETA_CORTA_POR_ROL: Record<string, string> = {
  ADMIN_SISTEMA: 'administrador del sistema',
  RRHH: 'RRHH',
  JEFE_DEPARTAMENTO: 'jefe de departamento',
  JEFE_SERVICIO: 'jefe de servicio',
};

/**
 * Quien esta editando se identifica solo por rol, nunca por nombre ni
 * usuario (decision explicita del usuario 2026-07-17): alcanza con saber
 * "el jefe de departamento esta editando", no quien es la persona.
 */
export function obtenerEtiquetaCortaRol(codigoRol: string | null): string {
  if (!codigoRol) {
    return 'otro usuario';
  }

  return ETIQUETA_CORTA_POR_ROL[codigoRol] ?? 'otro usuario';
}
