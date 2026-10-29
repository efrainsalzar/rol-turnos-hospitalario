import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuardarTurnoDto } from './guardar-turno.dto';
import { ActualizarCodigoVisualDto } from './actualizar-codigo-visual.dto';
import { GuardarConfiguracionOperativaServicioDto } from './guardar-configuracion-operativa-servicio.dto';

const basePayloadPorDto: Record<string, Record<string, unknown>> = {
  GuardarTurnoDto: {
    codigo: 'M',
    nombre: 'Manana',
    horaInicio: '07:00',
    horaFin: '13:00',
    vigenciaDesde: '2026-01-01',
  },
  ActualizarCodigoVisualDto: {},
  GuardarConfiguracionOperativaServicioDto: {
    modoVisual: 'ETIQUETAS',
    permiteMultiRegistroDia: false,
    usaEquivalenciaHorariaExportacion: false,
    codigos: [
      {
        id: 1,
        descripcion: undefined,
        color: undefined,
        ordenVisual: 1,
        activo: true,
      },
    ],
  },
};

type DtoClass = new (...args: unknown[]) => object;

function construir(
  dtoClass: DtoClass,
  overrides: { codigoVisual?: string; etiqueta?: string },
) {
  const base = basePayloadPorDto[dtoClass.name];

  if (dtoClass === GuardarConfiguracionOperativaServicioDto) {
    return plainToInstance(dtoClass, {
      ...base,
      codigos: [{ ...(base.codigos as object[])[0], ...overrides }],
    } as object);
  }

  return plainToInstance(dtoClass, { ...base, ...overrides } as object);
}

async function erroresDelPar(
  dtoClass: DtoClass,
  overrides: { codigoVisual?: string; etiqueta?: string },
) {
  const instance = construir(dtoClass, overrides);
  const errores = await validate(instance);

  if (dtoClass === GuardarConfiguracionOperativaServicioDto) {
    const codigosError = errores.find((e) => e.property === 'codigos');
    return codigosError?.children?.[0]?.children ?? [];
  }

  return errores.filter(
    (e) => e.property === 'codigoVisual' || e.property === 'etiqueta',
  );
}

describe.each([
  ['GuardarTurnoDto', GuardarTurnoDto],
  ['ActualizarCodigoVisualDto', ActualizarCodigoVisualDto],
  [
    'GuardarConfiguracionOperativaServicioDto',
    GuardarConfiguracionOperativaServicioDto,
  ],
] as const)('%s — par codigoVisual/etiqueta', (_name, dtoClass) => {
  it('permite ambos vacios (sin override visual)', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: '',
      etiqueta: '',
    });
    expect(errores).toHaveLength(0);
  });

  it('permite ambos llenos con formato valido', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: 'M',
      etiqueta: 'Manana',
    });
    expect(errores).toHaveLength(0);
  });

  it('rechaza solo codigoVisual sin etiqueta', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: 'M',
      etiqueta: '',
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza solo etiqueta sin codigoVisual', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: '',
      etiqueta: 'Manana',
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza codigoVisual con digitos', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: 'T1',
      etiqueta: 'Tarde',
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza codigoVisual con mas de 4 letras', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: 'ABCDE',
      etiqueta: 'Cualquiera',
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza codigoVisual en minuscula', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: 'm',
      etiqueta: 'Manana',
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('acepta codigoVisual con espacios al borde tras trim', async () => {
    const errores = await erroresDelPar(dtoClass, {
      codigoVisual: '  M  ',
      etiqueta: '  Manana  ',
    });
    expect(errores).toHaveLength(0);
  });
});
