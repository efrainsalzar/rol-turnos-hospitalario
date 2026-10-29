import type ExcelJS from 'exceljs';
import type { MatrizMensualPlanificacionResponseDto } from '../../../dto/matriz-mensual-planificacion-response.dto';
import type { RolTurnosExportBuildOptions } from '../turno-export-code.mapper';

export interface RolTurnosExcelTemplate {
  supports(anio: number): boolean;
  build(
    workbook: ExcelJS.Workbook,
    matriz: MatrizMensualPlanificacionResponseDto,
    options: RolTurnosExportBuildOptions,
  ): void;
}
