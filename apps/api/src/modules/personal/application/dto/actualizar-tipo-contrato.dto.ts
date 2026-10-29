import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

// Sin `codigo`: no se edita despues de crear, porque se copia en el historial
// de planificacion y en las exportaciones (ver CrearTipoContratoUseCase).
export class ActualizarTipoContratoDto {
  @Transform(trimIfString)
  @IsString()
  @EsNoVacio()
  @MaxLength(120)
  nombre!: string;

  @Transform(trimIfString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;
}
