import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

export class ActualizarUsuarioDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idPersonal?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idRolSeguridad?: number;

  @IsString()
  @IsIn(['PERSONAL', 'ADMINISTRATIVO', 'INTEGRACION'])
  tipoUsuario!: string;

  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(80)
  username!: string;

  @IsOptional()
  @IsString()
  @EsNoVacio({ message: 'password no puede ser solo espacios' })
  @MinLength(6)
  @MaxLength(80)
  password?: string;
}
