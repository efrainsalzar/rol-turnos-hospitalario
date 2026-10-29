import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import type { AlcancePlanificacionUsuario } from '../../domain/entities/usuario-sesion';
import { trimIfString } from '../../../../common/validation/codigo-visual-etiqueta';

class GuardarRolPermisosDto {
  @IsBoolean()
  puedeVerOrganizacion!: boolean;

  @IsBoolean()
  puedeVerPersonal!: boolean;

  @IsBoolean()
  puedeGestionarPersonal!: boolean;

  @IsBoolean()
  puedeVerAsignaciones!: boolean;

  @IsBoolean()
  puedeGestionarAsignaciones!: boolean;

  @IsBoolean()
  puedeVerSeguridad!: boolean;

  @IsBoolean()
  puedeGestionarUsuarios!: boolean;

  @IsBoolean()
  puedeVerOperacion!: boolean;

  @IsBoolean()
  puedeVerPlanificacion!: boolean;

  @IsBoolean()
  puedeEditarPlanificacion!: boolean;

  @IsBoolean()
  puedeAprobarPlanificacion!: boolean;

  @IsBoolean()
  puedeVerReportes!: boolean;
}

class GuardarRolCapacidadesDto {
  @IsBoolean()
  verCalendarios!: boolean;

  @IsBoolean()
  gestionarCalendarios!: boolean;

  @IsBoolean()
  verIncidenciasPersonales!: boolean;

  @IsBoolean()
  gestionarIncidenciasPersonales!: boolean;

  @IsBoolean()
  gestionarTiposFeriado!: boolean;

  @IsBoolean()
  verCargasHorarias!: boolean;

  @IsBoolean()
  gestionarCargasHorarias!: boolean;

  @IsBoolean()
  verTurnos!: boolean;

  @IsBoolean()
  crearPlanificacion!: boolean;

  @IsBoolean()
  editarPlanificacion!: boolean;

  @IsBoolean()
  enviarRevisionPlanificacion!: boolean;

  @IsBoolean()
  volverBorradorPlanificacion!: boolean;

  @IsBoolean()
  aprobarPlanificacion!: boolean;

  @IsBoolean()
  cerrarPlanificacion!: boolean;

  @IsBoolean()
  exportarPlanificacion!: boolean;

  @IsBoolean()
  exportarPlanificacionLote!: boolean;

  @IsBoolean()
  gestionarCodigosOperativos!: boolean;

  @IsBoolean()
  gestionarTurnos!: boolean;

  @IsBoolean()
  gestionarServicios!: boolean;
}

export class GuardarRolSeguridadDto {
  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  codigo!: string;

  @Transform(trimIfString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre!: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsString()
  @IsIn(['SISTEMA', 'DEPARTAMENTO', 'SERVICIO', 'LECTURA'])
  alcancePlanificacion!: AlcancePlanificacionUsuario;

  @ValidateNested()
  @Type(() => GuardarRolPermisosDto)
  permisos!: GuardarRolPermisosDto;

  @ValidateNested()
  @Type(() => GuardarRolCapacidadesDto)
  capacidades!: GuardarRolCapacidadesDto;
}
