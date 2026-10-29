import { NotFoundException } from '@nestjs/common';
import {
  CierreEjecucionIntegracion,
  DetalleEjecucion,
  FuenteIntegracion,
} from '../../domain/entities/ejecucion-integracion';

export interface ContextoEjecucionIntegracion {
  ejecucionId: number;
  // Solo en APPLY: la validacion (DRY_RUN) cuyo staging se aplica.
  ejecucionValidacionId: number | null;
}

export interface ResultadoConector {
  cierre: CierreEjecucionIntegracion;
  detalle: DetalleEjecucion;
  advertencias: string[];
}

/**
 * Lo unico que cambia entre fuentes. El ciclo comun (bloqueo, registro de la
 * ejecucion, cierre o error) lo resuelve EjecutarSincronizacionUseCase una
 * sola vez para todos los conectores.
 */
export abstract class ConectorIntegracion {
  abstract readonly codigo: string;
  abstract readonly fuente: FuenteIntegracion;

  abstract validar(
    contexto: ContextoEjecucionIntegracion,
  ): Promise<ResultadoConector>;

  abstract aplicar(
    contexto: ContextoEjecucionIntegracion,
  ): Promise<ResultadoConector>;
}

export class RegistroConectoresIntegracion {
  private readonly conectores: Map<string, ConectorIntegracion>;

  constructor(conectores: ConectorIntegracion[]) {
    this.conectores = new Map(conectores.map((c) => [c.codigo, c]));
  }

  obtener(codigo: string): ConectorIntegracion {
    const conector = this.conectores.get(codigo);

    if (!conector) {
      throw new NotFoundException(
        `No existe el conector de integracion "${codigo}". Disponibles: ${this.codigos().join(', ')}.`,
      );
    }

    return conector;
  }

  codigos(): string[] {
    return [...this.conectores.keys()];
  }
}
