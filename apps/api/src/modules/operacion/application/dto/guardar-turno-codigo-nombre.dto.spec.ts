import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuardarTurnoDto } from './guardar-turno.dto';

const BASE = {
  codigo: '0700-1300',
  nombre: 'Manana',
  horaInicio: '07:00',
  horaFin: '13:00',
  vigenciaDesde: '2026-01-01',
};

async function erroresDe(overrides: Partial<typeof BASE>) {
  const instance = plainToInstance(GuardarTurnoDto, { ...BASE, ...overrides });
  const errores = await validate(instance);
  return errores.filter(
    (e) => e.property === 'codigo' || e.property === 'nombre',
  );
}

describe('GuardarTurnoDto — codigo y nombre obligatorios', () => {
  it('acepta un payload valido', async () => {
    expect(await erroresDe({})).toHaveLength(0);
  });

  it('rechaza nombre vacio', async () => {
    expect((await erroresDe({ nombre: '' })).length).toBeGreaterThan(0);
  });

  it('rechaza nombre de solo espacios', async () => {
    expect((await erroresDe({ nombre: '   ' })).length).toBeGreaterThan(0);
  });

  it('recorta espacios al borde del nombre', async () => {
    const instance = plainToInstance(GuardarTurnoDto, {
      ...BASE,
      nombre: '  Manana  ',
    });
    expect(
      (await validate(instance)).filter((e) => e.property === 'nombre'),
    ).toHaveLength(0);
    expect(instance.nombre).toBe('Manana');
  });
});
