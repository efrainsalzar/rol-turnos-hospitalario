import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

function toRequiredNumber(value: unknown): unknown {
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? value : parsed;
}

export class CrearAsignacionDto {
  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idPersonal!: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idServicio?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idDepartamento?: number;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idTipoContrato!: number;

  // Obligatorio (docs/database/decisiones-tecnicas.md seccion 53): la carga horaria
  // (TC/MT) es un dato de contrato real, no calculable, por lo que no hay un default
  // seguro que el backend pueda completar solo.
  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idCargaHoraria!: number;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idRolFuncional!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nroItem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigoFuenteItem?: string;

  @IsIn(['PRINCIPAL', 'SECUNDARIA'])
  tipoAsignacion!: 'PRINCIPAL' | 'SECUNDARIA';

  // Opcional: el frontend ya no pide esta fecha (docs/database/decisiones-tecnicas.md
  // seccion 49). Si no llega, CrearAsignacionUseCase la completa con la fecha actual;
  // ActualizarAsignacionUseCase (mover) conserva la fecha_inicio existente en vez de
  // reescribirla con hoy.
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;

  @IsOptional()
  @IsBoolean()
  regularizarPlanificacionesAbiertas?: boolean;
}
