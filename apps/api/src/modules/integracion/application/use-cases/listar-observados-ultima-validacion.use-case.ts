import { Injectable } from '@nestjs/common';
import { EjecucionIntegracionRepository } from '../../domain/repositories/ejecucion-integracion.repository';
import {
  StagingPersonalObservado,
  StagingPersonalRepository,
} from '../../domain/repositories/staging-personal.repository';
import { RegistroConectoresIntegracion } from '../pipeline/conector-integracion';

export interface ObservadosUltimaValidacion {
  ejecucionValidacionId: number | null;
  registros: StagingPersonalObservado[];
}

// Registros que no quedaron VALIDOS en la ultima validacion de la fuente.
// Se busca la ultima DRY_RUN, no la ultima ejecucion: despues de aplicar, la
// ultima es la APPLY, que no tiene staging propio.
@Injectable()
export class ListarObservadosUltimaValidacionUseCase {
  constructor(
    private readonly conectores: RegistroConectoresIntegracion,
    private readonly ejecuciones: EjecucionIntegracionRepository,
    private readonly staging: StagingPersonalRepository,
  ) {}

  async execute(codigoConector: string): Promise<ObservadosUltimaValidacion> {
    const conector = this.conectores.obtener(codigoConector);
    const ejecucionValidacionId =
      await this.ejecuciones.obtenerUltimaValidacion(conector.fuente);

    return {
      ejecucionValidacionId,
      registros:
        ejecucionValidacionId == null
          ? []
          : await this.staging.listarObservados(ejecucionValidacionId),
    };
  }
}
