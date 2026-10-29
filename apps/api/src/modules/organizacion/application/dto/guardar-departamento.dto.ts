import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

export class GuardarDepartamentoDto {
  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(30)
  codigo!: string;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
