import { IsIn, IsOptional } from 'class-validator';
import {
  ESTILOS_EXPORTACION_ROL_TURNOS,
  FORMATOS_EXPORTACION_ROL_TURNOS,
  MODOS_EXPORTACION_ROL_TURNOS,
  type EstiloExportacionRolTurnos,
  type FormatoExportacionRolTurnos,
  type ModoExportacionRolTurnos,
} from '../services/export/turno-export-code.mapper';

export class ExportarPlanificacionQueryDto {
  @IsOptional()
  @IsIn(MODOS_EXPORTACION_ROL_TURNOS)
  modo?: ModoExportacionRolTurnos;

  @IsOptional()
  @IsIn(ESTILOS_EXPORTACION_ROL_TURNOS)
  estilo?: EstiloExportacionRolTurnos;

  @IsOptional()
  @IsIn(FORMATOS_EXPORTACION_ROL_TURNOS)
  formato?: FormatoExportacionRolTurnos;
}
