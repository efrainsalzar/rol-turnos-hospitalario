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
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';

function toRequiredNumber(value: unknown): unknown {
  const parsed = toOptionalNumber(value);
  return parsed === undefined ? value : parsed;
}

// DTO propio, no hereda de CrearAsignacionDto (docs/database/decisiones-tecnicas.md
// seccion 81): comparte la misma forma de campos, pero "motivo" tiene una regla de
// obligatoriedad distinta (editar una asignacion existente es una accion delicada;
// crear una nueva no lo es). Heredar la clase habria dejado el `@IsOptional()` del
// padre aplicando tambien aqui — class-validator acumula los validadores registrados
// en toda la cadena de prototipos, asi que sobreescribir el campo en la subclase no
// garantiza reemplazar la regla del padre.
export class ActualizarAsignacionDto {
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

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string | null;

  // Obligatorio (a diferencia de CrearAsignacionDto): editar una asignacion existente
  // es una accion delicada, siempre debe quedar registrado el motivo.
  @IsString()
  @EsNoVacio()
  @MaxLength(500)
  motivo!: string;

  @IsOptional()
  @IsBoolean()
  regularizarPlanificacionesAbiertas?: boolean;
}
