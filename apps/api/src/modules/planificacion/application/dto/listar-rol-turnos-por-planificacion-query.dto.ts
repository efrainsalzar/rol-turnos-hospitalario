import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

export class ListarRolTurnosPorPlanificacionQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_asignacion_personal?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_calendario?: number;
}
