import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright-core';
import { GenerarReportePersonalUseCase } from './generar-reporte-personal.use-case';
import {
  resolveBrowserExecutablePath,
  buildSimplePdfDocument,
} from './exportar-planificacion-pdf.use-case';

@Injectable()
export class ExportarReportePersonalPdfUseCase {
  private readonly logger = new Logger(ExportarReportePersonalPdfUseCase.name);

  constructor(
    private readonly generarReportePersonalUseCase: GenerarReportePersonalUseCase,
  ) {}

  async execute(
    idPlanificacion: number,
    idAsignacion: number,
  ): Promise<Buffer> {
    this.logger.log(
      `Exportando reporte personal a PDF: planificacion=${idPlanificacion}, asignacion=${idAsignacion}.`,
    );

    const html = await this.generarReportePersonalUseCase.execute(
      idPlanificacion,
      idAsignacion,
    );

    const executablePath = resolveBrowserExecutablePath();

    if (!executablePath) {
      this.logger.warn(
        'No se encontro navegador compatible. Se devolvera PDF minimo de respaldo.',
      );
      return buildFallbackPdf();
    }

    try {
      const browser = await chromium.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        await page.emulateMedia({ media: 'print' });

        return await page.pdf({
          width: '8.5in',
          height: '11in',
          printBackground: true,
          margin: {
            top: '1.5cm',
            right: '1.5cm',
            bottom: '1.2cm',
            left: '1.5cm',
          },
        });
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.warn(
        `Fallo la exportacion PDF. Se devolvera PDF minimo de respaldo. Motivo: ${
          error instanceof Error ? error.message : 'desconocido'
        }`,
      );
      return buildFallbackPdf();
    }
  }
}

function buildFallbackPdf(): Buffer {
  const content = [
    'BT',
    '/F1 12 Tf',
    '40 700 Td',
    '(ROL DE TURNO POR PERSONAL) Tj',
    '0 -24 Td',
    '(El reporte no pudo generarse por falta de navegador compatible.) Tj',
    'ET',
  ].join('\n');

  return buildSimplePdfDocument(content);
}
