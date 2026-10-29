import { IsInt, Min } from 'class-validator';

export class PublicarPlanificacionDto {
  @IsInt()
  @Min(1)
  idUsuarioPublicador!: number;
}
