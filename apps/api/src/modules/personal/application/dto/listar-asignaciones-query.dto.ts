import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import {
  toOptionalBoolean,
  toOptionalNumber,
} from '../../../../common/http/query-transformers';

export class ListarAsignacionesQueryDto {
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
  idDepartamento?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idServicio?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idPersonal?: number;

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
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_personal?: number;

  @IsOptional()
  rolFuncional?: string;

  @IsOptional()
  rol_funcional?: string;

  @IsOptional()
  nombre?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  activo?: boolean;

  get idDepartamentoNormalizado(): number | undefined {
    return this.idDepartamento ?? this.id_departamento;
  }

  get idServicioNormalizado(): number | undefined {
    return this.idServicio ?? this.id_servicio;
  }

  get idPersonalNormalizado(): number | undefined {
    return this.idPersonal ?? this.id_personal;
  }

  get rolFuncionalNormalizado(): string | undefined {
    return this.rolFuncional ?? this.rol_funcional;
  }

  get nombreNormalizado(): string | undefined {
    const value = this.nombre?.trim();
    return value ? value : undefined;
  }

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
