import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CerrarAsignacionDto } from './cerrar-asignacion.dto';

// Quitar una asignacion es una accion delicada (docs/database/decisiones-tecnicas.md
// seccion 81): el motivo pasa a ser obligatorio en el backend, no solo cuando el
// frontend activa la limpieza de actividad abierta.
async function erroresDe(overrides: Record<string, unknown>) {
  const instance = plainToInstance(CerrarAsignacionDto, overrides);
  return validate(instance);
}

describe('CerrarAsignacionDto', () => {
  it('acepta un payload valido con motivo', async () => {
    const errores = await erroresDe({
      motivo: 'Personal retirado del servicio.',
    });
    expect(errores).toHaveLength(0);
  });

  it('rechaza motivo ausente', async () => {
    const errores = await erroresDe({});
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
