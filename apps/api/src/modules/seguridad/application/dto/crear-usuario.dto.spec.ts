import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearUsuarioDto } from './crear-usuario.dto';

const BASE = {
  tipoUsuario: 'ADMINISTRATIVO',
  username: 'jperez',
  password: 'secreto123',
};

async function erroresDe(overrides: Partial<typeof BASE>) {
  const instance = plainToInstance(CrearUsuarioDto, { ...BASE, ...overrides });
  return validate(instance);
}

describe('CrearUsuarioDto', () => {
  it('acepta un payload valido', async () => {
    expect(await erroresDe({})).toHaveLength(0);
  });

  it('rechaza username vacio', async () => {
    const errores = await erroresDe({ username: '' });
    expect(errores.some((e) => e.property === 'username')).toBe(true);
  });

  it('rechaza username de solo espacios', async () => {
    const errores = await erroresDe({ username: '   ' });
    expect(errores.some((e) => e.property === 'username')).toBe(true);
  });

  it('recorta espacios al borde del username', async () => {
    const instance = plainToInstance(CrearUsuarioDto, {
      ...BASE,
      username: '  jperez  ',
    });
    expect(await validate(instance)).toHaveLength(0);
    expect(instance.username).toBe('jperez');
  });

  it('rechaza password de solo espacios sin alterar el valor', async () => {
    const instance = plainToInstance(CrearUsuarioDto, {
      ...BASE,
      password: '      ',
    });
    const errores = await validate(instance);
    expect(errores.some((e) => e.property === 'password')).toBe(true);
    expect(instance.password).toBe('      ');
  });
});
