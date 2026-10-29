import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuardarDepartamentoDto } from './guardar-departamento.dto';

const BASE = { codigo: 'ENF', nombre: 'Enfermeria', activo: true };

async function erroresDe(overrides: Partial<typeof BASE>) {
  const instance = plainToInstance(GuardarDepartamentoDto, {
    ...BASE,
    ...overrides,
  });
  return validate(instance);
}

describe('GuardarDepartamentoDto', () => {
  it('acepta un payload valido', async () => {
    expect(await erroresDe({})).toHaveLength(0);
  });

  it('rechaza codigo vacio', async () => {
    const errores = await erroresDe({ codigo: '' });
    expect(errores.some((e) => e.property === 'codigo')).toBe(true);
  });

  it('rechaza nombre de solo espacios', async () => {
    const errores = await erroresDe({ nombre: '   ' });
    expect(errores.some((e) => e.property === 'nombre')).toBe(true);
  });

  it('recorta espacios al borde y acepta', async () => {
    const instance = plainToInstance(GuardarDepartamentoDto, {
      ...BASE,
      codigo: '  ENF  ',
      nombre: '  Enfermeria  ',
    });
    const errores = await validate(instance);
    expect(errores).toHaveLength(0);
    expect(instance.codigo).toBe('ENF');
    expect(instance.nombre).toBe('Enfermeria');
  });
});
