import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

function toRequiredNumber(value: unknown): unknown {
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? value : parsed;
}

export class CrearPersonalDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigoPersonal?: string;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(120)
  nombres!: string;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(120)
  apellidoPaterno!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellidoMaterno?: string;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(30)
  documentoIdentidad!: string;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idNivelCargo!: number;
}
