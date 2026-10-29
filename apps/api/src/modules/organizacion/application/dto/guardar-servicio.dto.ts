import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';
import type { TipoServicio } from '../../domain/entities/servicio';

export class GuardarServicioDto {
  @IsInt()
  @Min(1)
  idDepartamento!: number;

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

  @IsIn(['SERVICIO', 'UNIDAD'])
  tipoServicio!: TipoServicio;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
