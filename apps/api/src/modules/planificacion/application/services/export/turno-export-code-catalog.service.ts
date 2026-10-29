import { Injectable } from '@nestjs/common';
import { CatalogoExportacionRolTurnosRepository } from '../../../domain/repositories/catalogo-exportacion-rol-turnos.repository';
import { ConfiguracionOperativaServicioRepository } from '../../../domain/repositories/configuracion-operativa-servicio.repository';
import type { CodigoExportacionRolTurnos } from '../../../domain/entities/codigo-exportacion-rol-turnos';
import { TurnoExportCodeMapper } from './turno-export-code.mapper';

@Injectable()
export class TurnoExportCodeCatalogService {
  constructor(
    private readonly catalogoExportacionRolTurnosRepository: CatalogoExportacionRolTurnosRepository,
    private readonly configuracionOperativaServicioRepository: ConfiguracionOperativaServicioRepository,
  ) {}

  async buildMapper(idPlanificacion?: number): Promise<TurnoExportCodeMapper> {
    const codigosBase =
      await this.catalogoExportacionRolTurnosRepository.listarCodigos();

    if (!idPlanificacion) {
      return new TurnoExportCodeMapper(codigosBase);
    }

    // `obtenerPorPlanificacion` resuelve el scope real (servicio o
    // departamento) de la planificacion; a diferencia de `obtenerPorServicio`,
    // tambien cubre planificaciones de departamento (antes se exportaban
    // siempre con el catalogo global, sin sus codigos personalizados).
    const configuracion =
      await this.configuracionOperativaServicioRepository.obtenerPorPlanificacion(
        idPlanificacion,
      );

    if (!configuracion) {
      return new TurnoExportCodeMapper(codigosBase);
    }

    const overlays: CodigoExportacionRolTurnos[] =
      configuracion.codigosPermitidos.map((codigo) => ({
        codigoInterno: codigo.codigoInterno,
        codigoEtiqueta: codigo.codigoVisual,
        codigoNumerico:
          codigo.origen === 'TURNO'
            ? formatHoras(codigo.horasEquivalentes)
            : codigo.codigoVisual,
        descripcion: codigo.descripcion || codigo.etiqueta,
        origen: codigo.origen === 'TURNO' ? 'TIPO_TURNO' : 'TIPO_DIA',
      }));

    const merged = [
      ...codigosBase.filter(
        (codigo) =>
          !overlays.some(
            (overlay) =>
              overlay.codigoInterno.trim().toUpperCase() ===
              codigo.codigoInterno.trim().toUpperCase(),
          ),
      ),
      ...overlays,
    ];

    return new TurnoExportCodeMapper(
      merged,
      configuracion.codigosPermitidos.map((codigo) => ({
        codigoInterno: codigo.codigoInterno,
        codigoEtiqueta: codigo.codigoVisual,
        color: codigo.color,
      })),
    );
  }
}

function formatHoras(horas: number): string {
  if (Number.isInteger(horas)) {
    return String(horas);
  }

  return horas.toFixed(2).replace(/\.?0+$/, '');
}
