import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

export class IniciarSesionLocalDto {
  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(80)
  username!: string;
}
