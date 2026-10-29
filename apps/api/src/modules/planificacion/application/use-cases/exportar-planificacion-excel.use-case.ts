import { Injectable, Logger } from '@nestjs/common';
import { ObtenerMatrizMensualPlanificacionUseCase } from './obtener-matriz-mensual-planificacion.use-case';
import { PlanificacionMatrizExportService } from '../services/planificacion-matriz-export.service';
import type {
  EstiloExportacionRolTurnos,
  FormatoExportacionRolTurnos,
  ModoExportacionRolTurnos,
} from '../services/export/turno-export-code.mapper';

@Injectable()
export class ExportarPlanificacionExcelUseCase {
  private readonly logger = new Logger(ExportarPlanificacionExcelUseCase.name);

  constructor(
    private readonly obtenerMatrizMensualPlanificacionUseCase: ObtenerMatrizMensualPlanificacionUseCase,
    private readonly planificacionMatrizExportService: PlanificacionMatrizExportService,
  ) {}

  async execute(
    idPlanificacion: number,
    modo: ModoExportacionRolTurnos,
    estilo: EstiloExportacionRolTurnos,
    formato: FormatoExportacionRolTurnos,
  ): Promise<Buffer> {
    this.logger.log(
      `Exportando planificacion ${idPlanificacion} a Excel del MVP con modo=${modo}, estilo=${estilo} y formato=${formato}.`,
    );

    const matriz =
      await this.obtenerMatrizMensualPlanificacionUseCase.execute(
        idPlanificacion,
      );

    return this.planificacionMatrizExportService.buildExcelBuffer(matriz, {
      modo,
      estilo,
      formato,
    });
  }
}
