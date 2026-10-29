import { Injectable, Logger } from '@nestjs/common';
import { AplicarCeldaMatrizPlanificacionDto } from '../dto/aplicar-celda-matriz-planificacion.dto';
import { CeldaMatrizPlanificacionResponseDto } from '../dto/celda-matriz-planificacion-response.dto';
import { mapCeldaMatrizPersistidaToResponse } from '../mappers/celda-matriz-planificacion-response.mapper';
import { AplicarCeldaMatrizPlanificacionUseCase } from './aplicar-celda-matriz-planificacion.use-case';

@Injectable()
export class AplicarCeldaMatrizLotePlanificacionUseCase {
  private readonly logger = new Logger(
    AplicarCeldaMatrizLotePlanificacionUseCase.name,
  );

  constructor(
    private readonly aplicarCeldaMatrizPlanificacionUseCase: AplicarCeldaMatrizPlanificacionUseCase,
  ) {}

  // Reemplaza N requests HTTP independientes (uno por celda pintada durante un
  // arrastre) por un solo request que resuelve planificacion/vencimiento/
  // editabilidad UNA vez y aplica las celdas en secuencia dentro del mismo
  // ciclo de request — evita que un arrastre de varias decenas de celdas
  // dispare esa misma cantidad de checkouts concurrentes del pool de
  // conexiones (DB_POOL_MAX, ver decisiones-tecnicas.md).
  async execute(
    idPlanificacion: number,
    celdas: AplicarCeldaMatrizPlanificacionDto[],
    idUsuarioOperacion: number,
    permiteAjusteAprobada = false,
  ): Promise<CeldaMatrizPlanificacionResponseDto[]> {
    this.logger.log(
      `Aplicando lote de ${celdas.length} celda(s) en planificacion=${idPlanificacion}.`,
    );

    const planificacion = permiteAjusteAprobada
      ? await this.aplicarCeldaMatrizPlanificacionUseCase.prepararPlanificacionEditable(
          idPlanificacion,
          idUsuarioOperacion,
          true,
        )
      : await this.aplicarCeldaMatrizPlanificacionUseCase.prepararPlanificacionEditable(
          idPlanificacion,
          idUsuarioOperacion,
        );

    const resultados: CeldaMatrizPlanificacionResponseDto[] = [];

    for (const celda of celdas) {
      const resultado =
        await this.aplicarCeldaMatrizPlanificacionUseCase.aplicarCelda(
          planificacion,
          celda,
          idUsuarioOperacion,
          permiteAjusteAprobada,
        );
      resultados.push(mapCeldaMatrizPersistidaToResponse(resultado));
    }

    return resultados;
  }
}
