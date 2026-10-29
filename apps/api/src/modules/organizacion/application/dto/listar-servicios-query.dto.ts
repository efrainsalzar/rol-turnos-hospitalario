import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

export class ListarServiciosQueryDto {
  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  idDepartamento?: number;

  @IsOptional()
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_departamento?: number;

  get idDepartamentoNormalizado(): number | undefined {
    return this.idDepartamento ?? this.id_departamento;
  }
}
