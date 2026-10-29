import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  CODIGO_VISUAL_PATTERN,
  tieneOverrideVisual,
  trimIfString,
} from '../../../../common/validation/codigo-visual-etiqueta';

class GuardarCodigoOperativoServicioDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id!: number;

  // Si se define codigoVisual o etiqueta, el par completo es obligatorio
  // (nunca queda asimetrico); ambos vacios es un estado valido (sin override
  // visual, se usa el horario/tipo de dia real). Ver docs/database/decisiones-tecnicas.md.
  @ValidateIf(tieneOverrideVisual)
  @Transform(trimIfString)
  @Matches(CODIGO_VISUAL_PATTERN, {
    message: 'codigoVisual debe ser de 1 a 4 letras mayusculas (A-Z).',
  })
  codigoVisual!: string;

  @ValidateIf(tieneOverrideVisual)
  @Transform(trimIfString)
  @IsNotEmpty({ message: 'etiqueta es obligatoria si defines codigoVisual.' })
  @MaxLength(120)
  etiqueta!: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @Type(() => Number)
  @IsInt()
  ordenVisual!: number;

  @IsBoolean()
  activo!: boolean;
}

export class GuardarConfiguracionOperativaServicioDto {
  @IsIn(['ETIQUETAS', 'NUMERICO'])
  modoVisual!: 'ETIQUETAS' | 'NUMERICO';

  @IsBoolean()
  permiteMultiRegistroDia!: boolean;

  @IsBoolean()
  usaEquivalenciaHorariaExportacion!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardarCodigoOperativoServicioDto)
  codigos!: GuardarCodigoOperativoServicioDto[];
}
