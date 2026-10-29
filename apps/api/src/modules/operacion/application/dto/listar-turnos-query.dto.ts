import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../../common/http/query-transformers';

export class ListarTurnosQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  page_size?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_departamento?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_servicio?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  activo?: boolean;

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
