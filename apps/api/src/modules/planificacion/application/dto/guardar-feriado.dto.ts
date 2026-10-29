import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

function toRequiredNumber(value: unknown): unknown {
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? value : parsed;
}

export class GuardarFeriadoDto {
  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idTipoFeriado!: number;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(150)
  nombre!: string;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  anio!: number;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @IsDateString()
  fechaInicio!: string;

  @IsDateString()
  fechaFin!: string;

  @IsBoolean()
  activo!: boolean;
}
