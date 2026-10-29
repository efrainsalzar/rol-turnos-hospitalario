import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ActualizarAsignacionDto } from './actualizar-asignacion.dto';

// Editar una asignacion existente es una accion delicada
// (docs/database/decisiones-tecnicas.md seccion 81): a diferencia de
// CrearAsignacionDto (motivo opcional, es alta), aqui el motivo es obligatorio.
// ActualizarAsignacionDto ya no hereda de CrearAsignacionDto — este spec tambien
// confirma que el DTO independiente sigue aceptando el mismo contrato de campos.
const BASE = {
  idPersonal: 1,
  idDepartamento: 5,
  idTipoContrato: 2,
  idCargaHoraria: 4,
  idRolFuncional: 3,
  tipoAsignacion: 'PRINCIPAL' as const,
  motivo: 'Ajuste de rol funcional.',
};

async function erroresDe(overrides: Record<string, unknown>) {
  const instance = plainToInstance(ActualizarAsignacionDto, {
    ...BASE,
    ...overrides,
  });
  return validate(instance);
}

describe('ActualizarAsignacionDto', () => {
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

  it('rechaza idTipoContrato vacio, igual que CrearAsignacionDto', async () => {
    const errores = await erroresDe({ idTipoContrato: '' });
    expect(errores.some((e) => e.property === 'idTipoContrato')).toBe(true);
  });
});
