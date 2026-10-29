import { Injectable, Logger } from '@nestjs/common';
import { existsSync } from 'node:fs';
import { chromium, type Page } from 'playwright-core';
import { ObtenerMatrizMensualPlanificacionUseCase } from './obtener-matriz-mensual-planificacion.use-case';
import { PlanificacionMatrizExportService } from '../services/planificacion-matriz-export.service';
import type {
  EstiloExportacionRolTurnos,
  ModoExportacionRolTurnos,
} from '../services/export/turno-export-code.mapper';
import { buildPlanificacionEtiquetaCorta } from '../services/export/planificacion-unidad.helper';

export const CANDIDATE_BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

@Injectable()
export class ExportarPlanificacionPdfUseCase {
  private readonly logger = new Logger(ExportarPlanificacionPdfUseCase.name);

  constructor(
    private readonly obtenerMatrizMensualPlanificacionUseCase: ObtenerMatrizMensualPlanificacionUseCase,
    private readonly planificacionMatrizExportService: PlanificacionMatrizExportService,
  ) {}

  async execute(
    idPlanificacion: number,
    modo: ModoExportacionRolTurnos,
    estilo: EstiloExportacionRolTurnos,
  ): Promise<Buffer> {
    this.logger.log(
      `Exportando planificacion ${idPlanificacion} a PDF del MVP con modo=${modo} y estilo=${estilo}.`,
    );

    const matriz =
      await this.obtenerMatrizMensualPlanificacionUseCase.execute(
        idPlanificacion,
      );
    const executablePath = resolveBrowserExecutablePath();

    if (!executablePath) {
      this.logger.warn(
        'No se encontro navegador compatible. Se devolvera un PDF minimo de respaldo.',
      );
      return buildFallbackPdfBuffer(matriz, modo, estilo);
    }

    const html = await this.planificacionMatrizExportService.buildPrintableHtml(
      matriz,
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
        `Fallo la exportacion PDF con navegador embebido. Se devolvera un PDF minimo de respaldo. Motivo: ${error instanceof Error ? error.message : 'desconocido'}`,
      );
      return buildFallbackPdfBuffer(matriz, modo, estilo);
    }
  }
}

export function resolveBrowserExecutablePath(): string | null {
  const path = CANDIDATE_BROWSER_PATHS.find((candidate) =>
    existsSync(candidate),
  );

  return path ?? null;
}

export async function calculatePdfScale(page: Page): Promise<number> {
  const pageWidthPx = 13 * 96;
  const horizontalMarginsPx = 0.2 * 96 * 2;
  const availableWidthPx = pageWidthPx - horizontalMarginsPx;

  const contentWidthPx = await page.evaluate(() => {
    const reportShell = document.querySelector('.report-shell');
    const table = document.querySelector('.table-wrap table');

    return Math.max(reportShell?.scrollWidth ?? 0, table?.scrollWidth ?? 0);
  });

  if (!contentWidthPx || contentWidthPx <= availableWidthPx) {
    return 1;
  }

  return Math.max(0.72, Math.min(1, availableWidthPx / contentWidthPx));
}

export function buildFallbackPdfBuffer(
  matriz: Awaited<
    ReturnType<ObtenerMatrizMensualPlanificacionUseCase['execute']>
  >,
  modo: ModoExportacionRolTurnos,
  estilo: EstiloExportacionRolTurnos,
): Buffer {
  const lines = [
    'ROL DE TURNOS',
    `${buildPlanificacionEtiquetaCorta(matriz.planificacion)} / ${matriz.planificacion.mes}-${matriz.planificacion.anio}`,
    `Estado: ${matriz.planificacion.estado}`,
    `Modo de exportacion: ${modo}`,
    `Estilo visual: ${estilo === 'texto' ? 'sin color' : 'con color'}`,
    `Personal: ${matriz.resumen.totalPersonas} / Dias: ${matriz.resumen.totalDias} / Horas: ${matriz.resumen.totalHorasMes}`,
  ];

  const content = [
    'BT',
    '/F1 14 Tf',
    '40 560 Td',
    ...lines.flatMap((line, index) =>
      index === 0
        ? [`(${escapePdfText(line)}) Tj`]
        : ['0 -18 Td', `(${escapePdfText(line)}) Tj`],
    ),
    'ET',
  ].join('\n');

  return buildSimplePdfDocument(content);
}

export function buildSimplePdfDocument(content: string): Buffer {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 936 612] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += object;
  }

  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(body, 'utf8');
}

export function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
