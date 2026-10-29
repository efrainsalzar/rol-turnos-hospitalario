import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { EsNoVacio } from './es-no-vacio.decorator';

class ClaseDePrueba {
  @EsNoVacio()
  campo!: string;
}

async function erroresDe(valor: unknown) {
  const instance = plainToInstance(ClaseDePrueba, { campo: valor });
  const errores = await validate(instance);
  return errores.filter((e) => e.property === 'campo');
}

describe('EsNoVacio', () => {
  it('rechaza string vacio', async () => {
    expect((await erroresDe('')).length).toBeGreaterThan(0);
  });

  it('rechaza string de solo espacios', async () => {
    expect((await erroresDe('   ')).length).toBeGreaterThan(0);
  });

  it('acepta string con contenido', async () => {
    expect(await erroresDe('Servicio A')).toHaveLength(0);
  });

  it('rechaza valores no string', async () => {
    expect((await erroresDe(123)).length).toBeGreaterThan(0);
  });
});
