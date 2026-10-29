import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';
import type { EstadoPlanificacion } from '../../domain/entities/planificacion';

const ESTADOS_PLANIFICACION: EstadoPlanificacion[] = [
  'BORRADOR',
  'REVISION',
  'APROBADA',
  'CERRADA',
];

export class ListarPlanificacionesQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(100)
  page_size?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_servicio?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_departamento?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_personal?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  anio?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  @Max(12)
  mes?: number;

  @IsOptional()
  @IsIn(ESTADOS_PLANIFICACION)
  estado?: EstadoPlanificacion;

  get pageNormalizada(): number {
    return this.page ?? 1;
  }

  get pageSizeNormalizada(): number {
    return this.page_size ?? 10;
  }

  get paginacionSolicitada(): boolean {
    return this.page !== undefined || this.page_size !== undefined;
  }
}
