import { UnprocessableEntityException } from '@nestjs/common';
import { ConsultarIdentidadesPorFuenteUseCase } from '../../../personal/application/use-cases/consultar-identidades-por-fuente.use-case';
import { RegistrarPersonalDesdeFuenteUseCase } from '../../../personal/application/use-cases/registrar-personal-desde-fuente.use-case';
import { FuenteIntegracion } from '../../domain/entities/ejecucion-integracion';
import { PersonaExternaEvaluada } from '../../domain/entities/persona-externa';
import { FuentePersonalExterna } from '../../domain/ports/fuente-personal-externa.port';
import {
  FilaStagingPersonal,
  StagingPersonalRepository,
} from '../../domain/repositories/staging-personal.repository';
import { evaluarPersonasExternas } from '../../domain/rules/evaluacion-persona-externa';
import {
  ConectorIntegracion,
  ContextoEjecucionIntegracion,
  ResultadoConector,
} from '../pipeline/conector-integracion';

export interface OpcionesConectorPersonal {
  // Se lee en cada ejecucion para que un cambio de .env no requiera reiniciar.
  activoPorDefecto: () => boolean;
  tamanoLote: number;
}

/**
 * Sincroniza identidad basica de personal desde cualquier fuente que cumpla
 * FuentePersonalExterna. Validar nunca modifica `personal`; aplicar lo hace
 * solo a traves de los casos de uso del modulo personal.
 */
export class ConectorPersonalExterno extends ConectorIntegracion {
  constructor(
    readonly codigo: string,
    readonly fuente: FuenteIntegracion,
    private readonly origen: FuentePersonalExterna,
    private readonly staging: StagingPersonalRepository,
    private readonly consultarIdentidades: ConsultarIdentidadesPorFuenteUseCase,
    private readonly registrarPersonal: RegistrarPersonalDesdeFuenteUseCase,
    private readonly opciones: OpcionesConectorPersonal,
  ) {
    super();
  }

  async validar(
    contexto: ContextoEjecucionIntegracion,
  ): Promise<ResultadoConector> {
    const lectura = await this.origen.leerPersonas();
    const identidades = await this.consultarIdentidades.execute(this.fuente);
    const evaluadas = evaluarPersonasExternas(lectura.registros, {
      vinculados: new Set(identidades.vinculados.keys()),
      documentosLocales: identidades.documentosLocales,
    });

    await this.staging.registrarLectura(
      contexto.ejecucionId,
      this.fuente,
      evaluadas.map(aFilaStaging),
    );

    const validos = evaluadas.filter((p) => p.estado === 'VALIDO');
    const nuevos = validos.filter((p) => !p.yaVinculada).length;
    const existentes = validos.length - nuevos;
    const porEstado = contarPorEstado(evaluadas);
    const advertencias = [...lectura.conexion.advertencias];

    if (lectura.conexion.permisoEscritura) {
      advertencias.push(
        `La credencial usada para leer ${lectura.conexion.destino} tiene permisos de escritura sobre el origen. ` +
          'La lectura esta protegida (transaccion revertida), pero en produccion se recomienda un usuario de solo lectura.',
      );
    }

    return {
      cierre: {
        estado: 'FINALIZADA',
        totalLeidos: evaluadas.length,
        totalValidos: validos.length,
        totalAplicados: 0,
        totalErrores: evaluadas.length - validos.length,
        mensaje: `Dry-run: ${nuevos} nuevos, ${existentes} existentes; sin aplicar a personal.`,
        modoConexion: lectura.conexion.modo,
        origenConPermisoEscritura: lectura.conexion.permisoEscritura,
      },
      detalle: {
        origen: lectura.conexion.destino,
        modoConexion: lectura.conexion.modo,
        leidos: evaluadas.length,
        validos: validos.length,
        errores: evaluadas.length - validos.length,
        nuevos,
        existentes,
        aplicados: 0,
        ...porEstado,
      },
      advertencias,
    };
  }

  async aplicar(
    contexto: ContextoEjecucionIntegracion,
  ): Promise<ResultadoConector> {
    const validacionId = contexto.ejecucionValidacionId;
    if (validacionId == null) {
      throw new UnprocessableEntityException(
        'Aplicar requiere una ejecucion de validacion.',
      );
    }

    const validos = await this.staging.listarValidos(validacionId);
    if (validos.length === 0) {
      throw new UnprocessableEntityException(
        'El lote de validacion no tiene registros validos pendientes de aplicar. Ejecuta de nuevo la validacion.',
      );
    }

    const observadosEnValidacion =
      await this.staging.contarNoValidos(validacionId);
    const activoPorDefecto = this.opciones.activoPorDefecto();
    let creados = 0;
    let existentes = 0;
    let conflictosAlAplicar = 0;

    for (
      let offset = 0;
      offset < validos.length;
      offset += this.opciones.tamanoLote
    ) {
      const lote = validos.slice(offset, offset + this.opciones.tamanoLote);
      const stagingPorExternalId = new Map(lote.map((r) => [r.externalId, r]));
      const resultados = await this.registrarPersonal.execute(
        this.fuente,
        lote.map((r) => ({
          externalId: r.externalId,
          nombres: r.nombres,
          apellidoPaterno: r.apellidoPaterno,
          apellidoMaterno: r.apellidoMaterno,
          documentoIdentidad: r.documentoIdentidad,
          documentoNormalizado: r.documentoNormalizado,
        })),
        { activoPorDefecto },
      );
      const aplicados: number[] = [];
      const sinCambios: number[] = [];

      // El registro en personal ya se confirmo; si el proceso se corta antes
      // de marcar el staging, reaplicar es seguro porque el vinculo ya
      // existe y el registro vuelve como VINCULO_EXISTENTE.
      for (const resultado of resultados) {
        const fila = stagingPorExternalId.get(resultado.externalId);
        if (!fila) continue;

        if (resultado.resultado === 'CREADO') {
          aplicados.push(fila.id);
          creados += 1;
        } else if (resultado.resultado === 'VINCULO_EXISTENTE') {
          sinCambios.push(fila.id);
          existentes += 1;
        } else {
          conflictosAlAplicar += 1;
          await this.staging.marcarConflictoAlAplicar(
            contexto.ejecucionId,
            fila.id,
            'DOCUMENTO_EXISTE_LOCAL',
            `Documento de identidad ya registrado en personal local (id ${resultado.idPersonalExistente}) sin vinculo con esta fuente`,
          );
        }
      }

      await this.staging.marcarProcesados(aplicados, 'APLICADO');
      await this.staging.marcarProcesados(sinCambios, 'SIN_CAMBIOS');
    }

    const conflictos = observadosEnValidacion + conflictosAlAplicar;

    return {
      cierre: {
        estado: conflictos > 0 ? 'APLICADA_PARCIAL' : 'APLICADA_TOTAL',
        totalLeidos: validos.length + observadosEnValidacion,
        totalValidos: validos.length,
        totalAplicados: creados + existentes,
        totalErrores: conflictos,
        mensaje: `${creados} nuevos, ${existentes} existentes, ${conflictos} conflictos pendientes.`,
        modoConexion: null,
        origenConPermisoEscritura: null,
      },
      detalle: {
        loteValidacion: validacionId,
        registrosValidos: validos.length,
        nuevosAplicados: creados,
        existentesSinCambios: existentes,
        conflictosNoAplicados: conflictos,
        conflictosDetectadosAlAplicar: conflictosAlAplicar,
        activoPorDefecto,
      },
      advertencias: [],
    };
  }
}

function aFilaStaging(
  persona: PersonaExternaEvaluada,
  indice: number,
): FilaStagingPersonal {
  const claveStaging =
    persona.estado === 'DUPLICADO'
      ? `${persona.externalId}#DUP-${indice}`
      : persona.externalId || `INVALID-${indice}`;

  return { claveStaging, persona };
}

function contarPorEstado(
  evaluadas: PersonaExternaEvaluada[],
): Record<string, number> {
  return evaluadas.reduce<Record<string, number>>((resumen, persona) => {
    const clave = `estado${persona.estado}`;
    resumen[clave] = (resumen[clave] ?? 0) + 1;
    return resumen;
  }, {});
}
