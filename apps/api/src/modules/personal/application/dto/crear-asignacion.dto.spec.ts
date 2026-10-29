import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearAsignacionDto } from './crear-asignacion.dto';

// Este contrato lo arma apps/web/src/components/system/PersonalFormDialog.tsx
// (bloque "asignacion inicial" al crear personal) y
// apps/web/src/components/system/PersonalAltaDialog.tsx ("Dar de alta en
// Asignaciones"). Un bug real de frontend (2026-07-08) dejaba enviar estos
// campos vacios sin validacion previa — este spec confirma que el backend los
// exige, para que la validacion agregada en el frontend no quede desalineada
// con lo que la API realmente requiere.
const BASE = {
  idPersonal: 1,
  idDepartamento: 5,
  idTipoContrato: 2,
  idCargaHoraria: 4,
  idRolFuncional: 3,
  tipoAsignacion: 'PRINCIPAL' as const,
  fechaInicio: '2026-07-08',
};

async function erroresDe(overrides: Partial<typeof BASE>) {
  const instance = plainToInstance(CrearAsignacionDto, {
    ...BASE,
    ...overrides,
  });
  return validate(instance);
}

describe('CrearAsignacionDto', () => {
  it('acepta un payload valido con destino departamental', async () => {
    expect(await erroresDe({})).toHaveLength(0);
  });

  it('acepta un payload valido con destino de servicio (sin idDepartamento)', async () => {
    const errores = await erroresDe({
      idDepartamento: undefined,
      idServicio: 7,
    } as Partial<typeof BASE>);
    expect(errores).toHaveLength(0);
  });

  it('rechaza idTipoContrato vacio (select sin tocar en el frontend, llega como string vacio)', async () => {
    const errores = await erroresDe({
      idTipoContrato: '' as unknown as number,
    });
    expect(errores.some((e) => e.property === 'idTipoContrato')).toBe(true);
  });

  it('rechaza idRolFuncional vacio', async () => {
    const errores = await erroresDe({
      idRolFuncional: '' as unknown as number,
    });
    expect(errores.some((e) => e.property === 'idRolFuncional')).toBe(true);
  });

  // docs/database/decisiones-tecnicas.md seccion 53: la carga horaria (TC/MT)
  // es un dato de contrato real sin default seguro, por lo que pasa a ser
  // obligatoria igual que idTipoContrato/idRolFuncional.
  it('rechaza idCargaHoraria vacio (select sin tocar en el frontend, llega como string vacio)', async () => {
    const errores = await erroresDe({
      idCargaHoraria: '' as unknown as number,
    });
    expect(errores.some((e) => e.property === 'idCargaHoraria')).toBe(true);
  });

  it('rechaza fechaInicio vacia', async () => {
    const errores = await erroresDe({ fechaInicio: '' });
    expect(errores.some((e) => e.property === 'fechaInicio')).toBe(true);
  });

  it('idDepartamento vacio NO es rechazado por si solo a nivel DTO (es @IsOptional, por el XOR con idServicio) — la regla "uno de los dos es obligatorio" vive en el frontend/use-case, no en este DTO', async () => {
    const errores = await erroresDe({
      idDepartamento: '' as unknown as number,
    });
    expect(errores.some((e) => e.property === 'idDepartamento')).toBe(false);
  });
});
