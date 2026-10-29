import { Injectable, Logger } from '@nestjs/common';
import { ObtenerMatrizMensualPlanificacionUseCase } from './obtener-matriz-mensual-planificacion.use-case';
import { PlanificacionMatrizExportService } from '../services/planificacion-matriz-export.service';
import type {
  EstiloExportacionRolTurnos,
  FormatoExportacionRolTurnos,
  ModoExportacionRolTurnos,
} from '../services/export/turno-export-code.mapper';

@Injectable()
export class ExportarPlanificacionesExcelUseCase {
  private readonly logger = new Logger(
    ExportarPlanificacionesExcelUseCase.name,
  );

  constructor(
    private readonly obtenerMatrizMensualPlanificacionUseCase: ObtenerMatrizMensualPlanificacionUseCase,
    private readonly planificacionMatrizExportService: PlanificacionMatrizExportService,
  ) {}

  async execute(
    idsPlanificacion: number[],
    modo: ModoExportacionRolTurnos,
    estilo: EstiloExportacionRolTurnos,
    formato: FormatoExportacionRolTurnos,
  ): Promise<Buffer> {
    this.logger.log(
      `Exportando lote Excel de planificaciones [${idsPlanificacion.join(', ')}] con modo=${modo}, estilo=${estilo} y formato=${formato}.`,
    );

    const matrices = await Promise.all(
      idsPlanificacion.map((idPlanificacion) =>
        this.obtenerMatrizMensualPlanificacionUseCase.execute(idPlanificacion),
      ),
    );

    return this.planificacionMatrizExportService.buildExcelBufferMany(
      matrices,
      { modo, estilo, formato },
    );
  }
}
