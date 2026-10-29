import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

export class GenerarCalendarioDto {
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  anio!: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;
}
