import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DuplicarPlanificacionDto {
  @IsInt()
  anio!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  mes!: number;

  @IsOptional()
  @IsBoolean()
  copiarRolTurno?: boolean;
}
