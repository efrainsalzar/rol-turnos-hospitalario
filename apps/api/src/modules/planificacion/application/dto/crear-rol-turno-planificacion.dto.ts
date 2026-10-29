import { IsIn, IsInt, IsOptional, IsNumber, Min } from 'class-validator';

const ORIGENES_REGISTRO_PERMITIDOS = [
  'MANUAL',
  'PLANTILLA',
  'AJUSTE',
  'CAMBIO',
];

export class CrearRolTurnoPlanificacionDto {
  @IsInt()
  @Min(1)
  idAsignacionPersonal!: number;

  @IsInt()
  @Min(1)
  idCalendario!: number;

  @IsInt()
  @Min(1)
  secuenciaDia!: number;

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

  @IsInt()
  @Min(1)
  idUsuarioOperacion!: number;

  @IsOptional()
  @IsIn(ORIGENES_REGISTRO_PERMITIDOS)
  origenRegistro?: 'MANUAL' | 'PLANTILLA' | 'AJUSTE' | 'CAMBIO';
}
