import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

export class GuardarNivelCargoDto {
  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(30)
  codigo!: string;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
