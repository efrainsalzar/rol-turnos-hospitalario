import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-core';
import { ObtenerMatrizMensualPlanificacionUseCase } from './obtener-matriz-mensual-planificacion.use-case';
import { PlanificacionMatrizExportService } from '../services/planificacion-matriz-export.service';
import type {
  EstiloExportacionRolTurnos,
  ModoExportacionRolTurnos,
} from '../services/export/turno-export-code.mapper';
import {
  buildFallbackPdfBuffer,
  calculatePdfScale,
  resolveBrowserExecutablePath,
} from './exportar-planificacion-pdf.use-case';

@Injectable()
export class ExportarPlanificacionesPdfUseCase {
  private readonly logger = new Logger(ExportarPlanificacionesPdfUseCase.name);

  constructor(
    private readonly obtenerMatrizMensualPlanificacionUseCase: ObtenerMatrizMensualPlanificacionUseCase,
    private readonly planificacionMatrizExportService: PlanificacionMatrizExportService,
  ) {}

  async execute(
    idsPlanificacion: number[],
    modo: ModoExportacionRolTurnos,
    estilo: EstiloExportacionRolTurnos,
  ): Promise<Buffer> {
    this.logger.log(
      `Exportando lote PDF de planificaciones [${idsPlanificacion.join(', ')}] con modo=${modo} y estilo=${estilo}.`,
    );

    const matrices = await Promise.all(
      idsPlanificacion.map((idPlanificacion) =>
        this.obtenerMatrizMensualPlanificacionUseCase.execute(idPlanificacion),
      ),
    );
    const executablePath = resolveBrowserExecutablePath();

    if (!executablePath) {
      this.logger.warn(
        'No se encontro navegador compatible. Se devolvera un PDF minimo de respaldo para el primer servicio del lote.',
      );
      return buildFallbackPdfBuffer(matrices[0], modo, estilo);
    }

    const html =
      await this.planificacionMatrizExportService.buildPrintableHtmlMany(
        matrices,
        {
          modo,
          estilo,
        },
      );

    try {
      const browser = await chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, {
          waitUntil: 'load',
        });
        await page.emulateMedia({
          media: 'print',
        });
        const scale = await calculatePdfScale(page);

        return await page.pdf({
          width: '13in',
          height: '8.5in',
          printBackground: true,
          scale,
          margin: {
            top: '0.2in',
            right: '0.2in',
            bottom: '0.2in',
            left: '0.2in',
          },
        });
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.warn(
        `Fallo la exportacion PDF multiple. Se devolvera un PDF minimo de respaldo. Motivo: ${error instanceof Error ? error.message : 'desconocido'}`,
      );
      return buildFallbackPdfBuffer(matrices[0], modo, estilo);
    }
  }
}
