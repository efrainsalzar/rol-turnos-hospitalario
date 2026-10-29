import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearPersonalDto } from './crear-personal.dto';

const BASE = {
  nombres: 'Juana',
  apellidoPaterno: 'Perez',
  documentoIdentidad: '1234567',
  idNivelCargo: 1,
};

async function erroresDe(overrides: Partial<typeof BASE>) {
  const instance = plainToInstance(CrearPersonalDto, { ...BASE, ...overrides });
  return validate(instance);
}

describe('CrearPersonalDto', () => {
  it('acepta un payload valido', async () => {
    expect(await erroresDe({})).toHaveLength(0);
  });

  it('rechaza nombres vacio', async () => {
    const errores = await erroresDe({ nombres: '' });
    expect(errores.some((e) => e.property === 'nombres')).toBe(true);
  });

  it('rechaza apellidoPaterno vacio', async () => {
    const errores = await erroresDe({ apellidoPaterno: '' });
    expect(errores.some((e) => e.property === 'apellidoPaterno')).toBe(true);
  });

  it('rechaza documentoIdentidad vacio', async () => {
    const errores = await erroresDe({ documentoIdentidad: '' });
    expect(errores.some((e) => e.property === 'documentoIdentidad')).toBe(true);
  });

  it('rechaza idNivelCargo sin valor (select sin tocar en el frontend, llega como string vacio)', async () => {
    const errores = await erroresDe({ idNivelCargo: '' as unknown as number });
    expect(errores.some((e) => e.property === 'idNivelCargo')).toBe(true);
  });
});
