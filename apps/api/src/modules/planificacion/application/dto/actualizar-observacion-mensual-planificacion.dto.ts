import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarObservacionMensualPlanificacionDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tipoObservacion?: string;

  @IsString()
  @MaxLength(1000)
  descripcion!: string;
}
