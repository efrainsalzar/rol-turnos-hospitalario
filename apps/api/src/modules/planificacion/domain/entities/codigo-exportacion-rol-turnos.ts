export type OrigenCodigoExportacionRolTurnos =
  | 'TIPO_TURNO'
  | 'TIPO_DIA'
  | 'CALENDARIO';

export interface CodigoExportacionRolTurnos {
  codigoInterno: string;
  codigoEtiqueta: string;
  codigoNumerico: string;
  descripcion: string;
  origen: OrigenCodigoExportacionRolTurnos;
}
