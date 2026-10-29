export interface PersonalVinculableResponseDto {
  id: number;
  codigoPersonal: string | null;
  nombreCompleto: string;
  idServicioPrincipal: number | null;
  nombreServicioPrincipal: string | null;
  idDepartamentoPrincipal: number | null;
  nombreDepartamentoPrincipal: string | null;
  esJefaturaRolFuncional: boolean;
}
