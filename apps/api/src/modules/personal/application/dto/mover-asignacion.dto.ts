import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
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

// Unico DTO valido para cambiar id_servicio/id_departamento de una asignacion
// (docs/database/decisiones-tecnicas.md seccion 56). No expone tipoAsignacion: PRINCIPAL/
// SECUNDARIA se conserva de la fila de origen, mover nunca cambia ese dato.
export class MoverAsignacionDto {
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
  idRolFuncional!: number;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idTipoContrato!: number;

  @Transform(({ value }: { value: unknown }) => toRequiredNumber(value))
  @IsInt()
  @Min(1)
  idCargaHoraria!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nroItem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigoFuenteItem?: string;

  // Opcional: si no llega, se usa la fecha actual como fecha_fin de la fila vieja y
  // fecha_inicio de la fila nueva, sin gap ni superposicion entre ambas.
  @IsOptional()
  @IsDateString()
  fecha?: string;

  // Obligatorio (docs/database/decisiones-tecnicas.md seccion 81): mover a alguien de
  // servicio/departamento es una accion delicada, siempre debe quedar registrado el motivo.
  @IsString()
  @EsNoVacio()
  @MaxLength(500)
  motivo!: string;

  @IsOptional()
  @IsBoolean()
  regularizarPlanificacionesAbiertas?: boolean;
}
