import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

export class IniciarSesionPasswordDto {
  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(80)
  username!: string;

  @IsString()
  @EsNoVacio({ message: 'password no puede ser solo espacios' })
  @MinLength(3)
  @MaxLength(120)
  password!: string;
}
