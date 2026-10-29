import { IsString, MaxLength, MinLength } from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';

export class CambiarMiPasswordDto {
  @IsString()
  @EsNoVacio({ message: 'passwordActual no puede ser solo espacios' })
  passwordActual!: string;

  @IsString()
  @EsNoVacio({ message: 'passwordNuevo no puede ser solo espacios' })
  @MinLength(6)
  @MaxLength(80)
  passwordNuevo!: string;
}
