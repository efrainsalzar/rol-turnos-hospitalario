import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EsNoVacio } from '../../../../common/validation/es-no-vacio.decorator';

export class CerrarAsignacionDto {
  // Opcional: el frontend ya no pide esta fecha (docs/database/decisiones-tecnicas.md
  // seccion 49). Si no llega, CerrarAsignacionUseCase la completa con la fecha actual.
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  // Obligatorio (docs/database/decisiones-tecnicas.md seccion 81): quitar una asignacion
  // es una accion delicada, siempre debe quedar registrado el motivo, sin importar si
  // ademas se activa la limpieza de actividad abierta.
  @IsString()
  @EsNoVacio()
  @MaxLength(500)
  motivo!: string;

  @IsOptional()
  @IsBoolean()
  regularizarPlanificacionesAbiertas?: boolean;

  @IsOptional()
  @IsBoolean()
  cerrarSecundariasActivas?: boolean;
}
