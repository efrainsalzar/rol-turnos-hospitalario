import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

// Unidad destino que el formulario de traslado esta evaluando: opcionales porque
// el chequeo de destino solo aplica cuando el usuario ya elige una unidad
// distinta a la actual (ver AsignacionEditDialog.tsx).
export class ObtenerConflictoPlanificacionAsignacionQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_servicio_destino?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_departamento_destino?: number;
}
