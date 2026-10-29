import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class AplicarCeldaMatrizPlanificacionDto {
  @IsInt()
  @Min(1)
  idAsignacionPersonal!: number;

  @IsInt()
  @Min(1)
  idCalendario!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  secuenciaDia?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idCodigoOperativoServicio?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idTurno?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  idIncidenciaPersonal?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  horasProgramadas?: number;

  @IsOptional()
  @IsBoolean()
  limpiar?: boolean;
}
