import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AplicarCeldaMatrizPlanificacionDto } from './aplicar-celda-matriz-planificacion.dto';

export class AplicarCeldaMatrizLotePlanificacionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AplicarCeldaMatrizPlanificacionDto)
  celdas!: AplicarCeldaMatrizPlanificacionDto[];
}
