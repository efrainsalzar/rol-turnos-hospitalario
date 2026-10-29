import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { MatrizMensualPlanificacionResponseDto } from '../../dto/matriz-mensual-planificacion-response.dto';
import { RolTurnosTemplateRegistry } from './templates/rol-turnos-template.registry';
import {
  resolveEstiloExportacion,
  resolveFormatoExportacion,
  resolveModoExportacion,
  type RolTurnosExportOptions,
} from './turno-export-code.mapper';
import { TurnoExportCodeCatalogService } from './turno-export-code-catalog.service';
import { readInstitutionEnv } from '../../../../../infrastructure/config/institution-env';
import { buildPlanificacionTituloExportacion } from './planificacion-unidad.helper';

@Injectable()
export class PlanificacionExcelExportService {
  constructor(
    private readonly rolTurnosTemplateRegistry: RolTurnosTemplateRegistry,
    private readonly turnoExportCodeCatalogService: TurnoExportCodeCatalogService,
  ) {}

  async buildWorkbookBuffer(
    matriz: MatrizMensualPlanificacionResponseDto,
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await this.populateWorkbook(workbook, [matriz], options);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async buildWorkbookBufferMany(
    matrices: MatrizMensualPlanificacionResponseDto[],
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    await this.populateWorkbook(workbook, matrices, options);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async populateWorkbook(
    workbook: ExcelJS.Workbook,
    matrices: MatrizMensualPlanificacionResponseDto[],
    options?: Partial<RolTurnosExportOptions>,
  ): Promise<void> {
    workbook.creator = 'roles-turnos-api';
    workbook.company = 'Roles y Turnos';
    workbook.subject = 'Rol de turnos mensual';
    workbook.title =
      matrices.length === 1
        ? buildPlanificacionTituloExportacion(matrices[0].planificacion)
        : 'ROL DE TURNOS MULTIPLE';
    workbook.created = new Date();
    workbook.modified = new Date();

    const modo = resolveModoExportacion(options?.modo);
    const estilo = resolveEstiloExportacion(options?.estilo);
    const formato = resolveFormatoExportacion(options?.formato);
    const institution = readInstitutionEnv();

    for (const matriz of matrices) {
      const mapper = await this.turnoExportCodeCatalogService.buildMapper(
        matriz.planificacion.id,
      );
      const template = this.rolTurnosTemplateRegistry.resolve(
        matriz.planificacion.anio,
      );
      template.build(workbook, matriz, {
        modo,
        estilo,
        formato,
        mapper,
        institution,
      });
    }
  }
}
