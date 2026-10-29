import { IsInt, Min } from 'class-validator';

export class CerrarPlanificacionDto {
  @IsInt()
  @Min(1)
  idUsuarioCierre!: number;
}
