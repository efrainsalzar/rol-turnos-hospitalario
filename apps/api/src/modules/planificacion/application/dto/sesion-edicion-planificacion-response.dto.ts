export interface SesionEdicionPlanificacionResponseDto {
  ocupada: boolean;
  codigoRolEditor: string | null;
  /** Etiqueta corta por rol (ej. "jefe de departamento"), nunca nombre ni usuario. */
  etiquetaRolEditor: string | null;
  adquiridoEn: string | null;
  ultimoLatido: string | null;
  esPropia: boolean;
  puedeTomarControl: boolean;
}
