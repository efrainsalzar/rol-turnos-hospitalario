import { IsInt, Min, ValidateIf } from 'class-validator';

export class CrearBorradorPlanificacionDto {
  @ValidateIf((o: CrearBorradorPlanificacionDto) => !o.idDepartamento)
  @IsInt()
  @Min(1)
  idServicio?: number;

  @ValidateIf((o: CrearBorradorPlanificacionDto) => !o.idServicio)
  @IsInt()
  @Min(1)
  idDepartamento?: number;

  @IsInt()
  anio!: number;

  @IsInt()
  @Min(1)
  mes!: number;

  @IsInt()
  @Min(1)
  idUsuarioCreador!: number;
}
