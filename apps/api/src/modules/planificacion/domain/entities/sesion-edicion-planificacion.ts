export interface SesionEdicionPlanificacion {
  idPlanificacion: number;
  idUsuarioEditor: number;
  nombreUsuarioEditor: string;
  codigoRolEditor: string;
  adquiridoEn: Date;
  ultimoLatido: Date;
}
