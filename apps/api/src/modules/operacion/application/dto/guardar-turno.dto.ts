import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
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
import { toOptionalNumber } from '../../../../common/http/query-transformers';
import {
  CODIGO_VISUAL_PATTERN,
  tieneOverrideVisual,
  trimIfString,
} from '../../../../common/validation/codigo-visual-etiqueta';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';

function toOptionalInt(value: unknown): unknown {
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? null : parsed;
}

export class GuardarTramoDto {
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio!: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFin!: string;
}

export class GuardarTurnoDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  idServicio?: number | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalInt(value))
  @IsInt()
  @Min(1)
  idDepartamento?: number | null;

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
  @IsIn(['CONTINUO', 'DISCONTINUO'])
  tipoHorario?: 'CONTINUO' | 'DISCONTINUO';

  // Requerido solo cuando tipoHorario es CONTINUO (o no se especifica)
  @ValidateIf(
    (o: GuardarTurnoDto) => !o.tipoHorario || o.tipoHorario === 'CONTINUO',
  )
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio!: string;

  @ValidateIf(
    (o: GuardarTurnoDto) => !o.tipoHorario || o.tipoHorario === 'CONTINUO',
  )
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFin!: string;

  // Requerido cuando tipoHorario es DISCONTINUO (mínimo 2 tramos)
  @ValidateIf((o: GuardarTurnoDto) => o.tipoHorario === 'DISCONTINUO')
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardarTramoDto)
  tramos?: GuardarTramoDto[];

  // Opcional: el frontend ya no pide esta fecha (docs/database/decisiones-tecnicas.md
  // seccion 49). Si no llega, CrearTurnoUseCase la completa con la fecha actual;
  // ActualizarTurnoUseCase conserva la vigencia_desde existente en vez de reescribirla.
  @IsOptional()
  @IsDateString()
  vigenciaDesde?: string;

  @IsOptional()
  @IsDateString()
  vigenciaHasta?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Si se define codigoVisual o etiqueta, el par completo es obligatorio
  // (nunca queda asimetrico); ver docs/database/decisiones-tecnicas.md.
  @ValidateIf(tieneOverrideVisual)
  @Transform(trimIfString)
  @Matches(CODIGO_VISUAL_PATTERN, {
    message: 'codigoVisual debe ser de 1 a 4 letras mayusculas (A-Z).',
  })
  codigoVisual?: string;

  @ValidateIf(tieneOverrideVisual)
  @Transform(trimIfString)
  @IsNotEmpty({ message: 'etiqueta es obligatoria si defines codigoVisual.' })
  @MaxLength(120)
  etiqueta?: string;

  // Solo obligatorio cuando el cambio de horario impacta celdas ya asignadas
  // en planificaciones no CERRADA (ver docs/arquitectura/impacto-edicion-eliminacion-turno-incidencia-personal.md).
  @IsOptional()
  @IsIn(['PROPAGAR', 'LIMPIAR'])
  estrategiaCeldasExistentes?: 'PROPAGAR' | 'LIMPIAR';
}
