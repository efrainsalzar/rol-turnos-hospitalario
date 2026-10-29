import {
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  FuenteIntegracion,
  OrigenEjecucionIntegracion,
  ResumenEjecucionIntegracion,
  TipoEjecucionIntegracion,
} from '../../domain/entities/ejecucion-integracion';
import { EjecucionIntegracionRepository } from '../../domain/repositories/ejecucion-integracion.repository';
import {
  ContextoEjecucionIntegracion,
  RegistroConectoresIntegracion,
} from '../pipeline/conector-integracion';

export interface EjecutarSincronizacionInput {
  conector: string;
  tipo: TipoEjecucionIntegracion;
  origen: OrigenEjecucionIntegracion;
  idUsuario: number | null;
}

@Injectable()
export class EjecutarSincronizacionUseCase {
  private readonly logger = new Logger(EjecutarSincronizacionUseCase.name);

  constructor(
    private readonly conectores: RegistroConectoresIntegracion,
    private readonly ejecuciones: EjecucionIntegracionRepository,
  ) {}

  async execute(
    input: EjecutarSincronizacionInput,
  ): Promise<ResumenEjecucionIntegracion> {
    const conector = this.conectores.obtener(input.conector);
    const fuente = conector.fuente;
    const bloqueo = await this.ejecuciones.adquirirBloqueo(fuente);

    if (!bloqueo) {
      throw new ConflictException(
        `Ya hay una ejecucion en curso para ${conector.codigo}; espera a que termine.`,
      );
    }

    try {
      const interrumpidas = await this.ejecuciones.cerrarInterrumpidas(fuente);
      if (interrumpidas > 0) {
        this.logger.warn(
          `${interrumpidas} ejecucion(es) de ${conector.codigo} habian quedado INICIADA sin terminar; se marcaron como ERROR.`,
        );
      }

      const ejecucionValidacionId =
        input.tipo === 'APPLY'
          ? await this.obtenerValidacionParaAplicar(conector.codigo, fuente)
          : null;
      const ejecucionId = await this.ejecuciones.crear({
        fuente,
        tipo: input.tipo,
        origen: input.origen,
        idUsuario: input.idUsuario,
        ejecucionValidacionId,
      });
      const contexto: ContextoEjecucionIntegracion = {
        ejecucionId,
        ejecucionValidacionId,
      };

      this.logger.log(
        `Ejecucion ${ejecucionId}: ${input.tipo} de ${conector.codigo} (origen ${input.origen}).`,
      );

      try {
        const resultado =
          input.tipo === 'DRY_RUN'
            ? await conector.validar(contexto)
            : await conector.aplicar(contexto);

        await this.ejecuciones.cerrar(ejecucionId, resultado.cierre);
        this.logger.log(
          `Ejecucion ${ejecucionId} ${resultado.cierre.estado}: ${resultado.cierre.mensaje}`,
        );

        return {
          ejecucionId,
          ejecucionValidacionId,
          conector: conector.codigo,
          tipo: input.tipo,
          estado: resultado.cierre.estado,
          mensaje: resultado.cierre.mensaje,
          detalle: resultado.detalle,
          advertencias: resultado.advertencias,
          ejecucionesInterrumpidas: interrumpidas,
        };
      } catch (error) {
        await this.registrarError(ejecucionId, error);
        throw error;
      }
    } finally {
      await bloqueo.liberar();
    }
  }

  private async obtenerValidacionParaAplicar(
    codigo: string,
    fuente: FuenteIntegracion,
  ): Promise<number> {
    const id = await this.ejecuciones.obtenerUltimaValidacionAplicable(fuente);

    if (id == null) {
      throw new UnprocessableEntityException(
        `No existe un lote de validacion de ${codigo} listo para aplicar; ejecuta primero la validacion.`,
      );
    }

    return id;
  }

  private async registrarError(
    ejecucionId: number,
    error: unknown,
  ): Promise<void> {
    const mensaje = error instanceof Error ? error.message : String(error);

    try {
      await this.ejecuciones.marcarError(ejecucionId, mensaje);
    } catch (registroError) {
      // No debe ocultar el error original: solo se deja constancia en log.
      this.logger.error(
        `No se pudo marcar la ejecucion ${ejecucionId} como ERROR: ${String(registroError)}`,
      );
    }
    this.logger.error(`Ejecucion ${ejecucionId} ERROR: ${mensaje}`);
  }
}
