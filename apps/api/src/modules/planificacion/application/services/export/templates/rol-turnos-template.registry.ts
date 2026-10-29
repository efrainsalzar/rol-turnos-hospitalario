import { Injectable } from '@nestjs/common';
import { RolTurnosTemplate2026 } from './rol-turnos-template-2026';
import { RolTurnosTemplateDefault } from './rol-turnos-template-default';
import type { RolTurnosExcelTemplate } from './rol-turnos-template.interface';

@Injectable()
export class RolTurnosTemplateRegistry {
  private readonly templates: RolTurnosExcelTemplate[];

  constructor(
    private readonly template2026: RolTurnosTemplate2026,
    private readonly templateDefault: RolTurnosTemplateDefault,
  ) {
    this.templates = [this.template2026, this.templateDefault];
  }

  resolve(anio: number): RolTurnosExcelTemplate {
    return (
      this.templates.find((template) => template.supports(anio)) ||
      this.templateDefault
    );
  }
}
