import type { MatrizMensualPlanificacionResponseDto } from '../../dto/matriz-mensual-planificacion-response.dto';
import type { CodigoExportacionRolTurnos } from '../../../domain/entities/codigo-exportacion-rol-turnos';
import type { InstitutionEnv } from '../../../../../infrastructure/config/institution-env';

export const MODOS_EXPORTACION_ROL_TURNOS = ['etiquetas', 'numerico'] as const;
export const ESTILOS_EXPORTACION_ROL_TURNOS = ['color', 'texto'] as const;
export const FORMATOS_EXPORTACION_ROL_TURNOS = [
  'una-fila',
  'multi-horario',
] as const;

export type ModoExportacionRolTurnos =
  (typeof MODOS_EXPORTACION_ROL_TURNOS)[number];
export type EstiloExportacionRolTurnos =
  (typeof ESTILOS_EXPORTACION_ROL_TURNOS)[number];
export type FormatoExportacionRolTurnos =
  (typeof FORMATOS_EXPORTACION_ROL_TURNOS)[number];

export interface RolTurnosExportOptions {
  modo: ModoExportacionRolTurnos;
  estilo: EstiloExportacionRolTurnos;
  formato: FormatoExportacionRolTurnos;
}

export interface RolTurnosExportBuildOptions extends RolTurnosExportOptions {
  mapper: TurnoExportCodeMapper;
  institution: InstitutionEnv;
}

export interface LeyendaExportacionRolTurnos {
  codigo: string;
  descripcion: string;
}

interface PresentacionCodigoOperativo {
  color: string | null;
}

type RegistroMatrizDia =
  MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number]['registros'][number];

type CeldaMatrizDia =
  MatrizMensualPlanificacionResponseDto['filas'][number]['dias'][number];

export class TurnoExportCodeMapper {
  private readonly codeIndex: Map<string, CodigoExportacionRolTurnos>;
  private readonly presentationIndex: Map<string, PresentacionCodigoOperativo>;

  constructor(
    private readonly codigos: CodigoExportacionRolTurnos[],
    presentationEntries?: Array<{
      codigoInterno: string;
      codigoEtiqueta: string;
      color: string | null;
    }>,
  ) {
    this.codeIndex = new Map<string, CodigoExportacionRolTurnos>();
    this.presentationIndex = new Map<string, PresentacionCodigoOperativo>();

    codigos.forEach((codigo) => {
      this.codeIndex.set(codigo.codigoInterno.trim().toUpperCase(), codigo);
      this.codeIndex.set(codigo.codigoEtiqueta.trim().toUpperCase(), codigo);
    });

    (presentationEntries ?? []).forEach((entry) => {
      const value = {
        color: entry.color,
      };
      this.presentationIndex.set(
        entry.codigoInterno.trim().toUpperCase(),
        value,
      );
      this.presentationIndex.set(
        entry.codigoEtiqueta.trim().toUpperCase(),
        value,
      );
    });
  }

  mapCodigo(
    codigo: string | null | undefined,
    modo: ModoExportacionRolTurnos,
  ): string {
    if (!codigo) {
      return '';
    }

    const normalized = codigo.trim().toUpperCase();
    const config = this.codeIndex.get(normalized);

    if (!config) {
      return normalized;
    }

    return modo === 'numerico' ? config.codigoNumerico : config.codigoEtiqueta;
  }

  mapValorVisual(
    valorVisual: string | null | undefined,
    modo: ModoExportacionRolTurnos,
  ): string {
    if (!valorVisual) {
      return '';
    }

    return valorVisual
      .split('/')
      .map((item) => this.mapCodigo(item, modo))
      .join('/');
  }

  mapRegistro(
    registro: RegistroMatrizDia | null | undefined,
    modo: ModoExportacionRolTurnos,
  ): string {
    if (!registro?.codigo) {
      return '';
    }

    if (modo === 'numerico' && registro.tipo === 'TURNO') {
      return formatHorasProgramadas(registro.horasProgramadas);
    }

    return this.mapCodigo(registro.codigo, modo);
  }

  mapCelda(
    celda: CeldaMatrizDia | null | undefined,
    modo: ModoExportacionRolTurnos,
  ): string {
    if (!celda) {
      return '';
    }

    if (celda.registros.length > 0) {
      return celda.registros
        .map((registro) => this.mapRegistro(registro, modo))
        .join('/');
    }

    return this.mapValorVisual(celda.valorVisual, modo);
  }

  buildLegend(
    matriz: MatrizMensualPlanificacionResponseDto,
    modo: ModoExportacionRolTurnos,
  ): LeyendaExportacionRolTurnos[] {
    const detectedCodes = new Set<CodigoExportacionRolTurnos>();
    const addDetectedCode = (codigo: string) => {
      const entry = this.resolveEntry(codigo);

      if (!entry) {
        return;
      }

      detectedCodes.add(entry);
    };

    matriz.dias.forEach((dia) => {
      if (dia.esFeriado && dia.codigoFeriado) {
        addDetectedCode(dia.codigoFeriado);
      }
    });

    matriz.filas.forEach((fila) => {
      fila.dias.forEach((dia) => {
        dia.registros.forEach((registro) => {
          if (registro.codigo) {
            addDetectedCode(registro.codigo);
          }
        });

        if (!dia.registros.length && dia.valorVisual) {
          dia.valorVisual
            .split('/')
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean)
            .forEach((code) => addDetectedCode(code));
        }
      });
    });

    const detectedEntries = [...detectedCodes]
      .filter((entry) =>
        modo === 'numerico' ? entry.origen !== 'TIPO_TURNO' : true,
      )
      .sort((left, right) =>
        this.mapCodigo(left.codigoInterno, modo).localeCompare(
          this.mapCodigo(right.codigoInterno, modo),
        ),
      )
      .map((code) => {
        return {
          codigo: this.mapCodigo(code.codigoInterno, modo),
          descripcion: code.descripcion || 'Codigo operativo del rol de turnos',
        };
      })
      .filter(
        (entry, index, entries) =>
          entries.findIndex((item) => item.codigo === entry.codigo) === index,
      );

    return detectedEntries;
  }

  resolveColor(codigo: string | null | undefined): string | null {
    if (!codigo) {
      return null;
    }

    return (
      this.presentationIndex.get(codigo.trim().toUpperCase())?.color ?? null
    );
  }

  private resolveEntry(
    codigo: string | null | undefined,
  ): CodigoExportacionRolTurnos | null {
    if (!codigo) {
      return null;
    }

    return this.codeIndex.get(codigo.trim().toUpperCase()) ?? null;
  }
}

function formatHorasProgramadas(horasProgramadas: number): string {
  if (!Number.isFinite(horasProgramadas)) {
    return '';
  }

  if (Number.isInteger(horasProgramadas)) {
    return String(horasProgramadas);
  }

  return horasProgramadas.toFixed(2).replace(/\.?0+$/, '');
}

export function resolveModoExportacion(
  modo: ModoExportacionRolTurnos | null | undefined,
): ModoExportacionRolTurnos {
  return modo ?? 'numerico';
}

export function resolveEstiloExportacion(
  estilo: EstiloExportacionRolTurnos | null | undefined,
): EstiloExportacionRolTurnos {
  return estilo ?? 'color';
}

export function resolveFormatoExportacion(
  formato: FormatoExportacionRolTurnos | null | undefined,
): FormatoExportacionRolTurnos {
  return formato ?? 'una-fila';
}
