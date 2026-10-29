import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MoverAsignacionDto } from './mover-asignacion.dto';

// Mover a alguien de servicio/departamento es una accion delicada
// (docs/database/decisiones-tecnicas.md seccion 81): el motivo pasa a ser obligatorio.
const BASE = {
  idServicio: 10,
  idRolFuncional: 2,
  idTipoContrato: 1,
  idCargaHoraria: 1,
  motivo: 'Reasignacion por necesidad del servicio.',
};

async function erroresDe(overrides: Partial<typeof BASE>) {
  const instance = plainToInstance(MoverAsignacionDto, {
    ...BASE,
    ...overrides,
  });
  return validate(instance);
}

describe('MoverAsignacionDto', () => {
  it('acepta un payload valido con motivo', async () => {
    expect(await erroresDe({})).toHaveLength(0);
  });

  it('rechaza motivo ausente', async () => {
    const errores = await erroresDe({ motivo: undefined });
    expect(errores.some((e) => e.property === 'motivo')).toBe(true);
  });

  it('rechaza motivo vacio', async () => {
    const errores = await erroresDe({ motivo: '' });
    expect(errores.some((e) => e.property === 'motivo')).toBe(true);
  });

  it('rechaza motivo de solo espacios', async () => {
    const errores = await erroresDe({ motivo: '   ' });
    expect(errores.some((e) => e.property === 'motivo')).toBe(true);
  });
});
