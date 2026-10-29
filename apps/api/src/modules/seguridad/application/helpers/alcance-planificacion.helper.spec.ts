import { ForbiddenException } from '@nestjs/common';
import {
  assertAlcancePermitido,
  puedeOtorgarAlcance,
} from './alcance-planificacion.helper';

describe('alcance-planificacion.helper', () => {
  it('SISTEMA puede otorgar cualquier alcance, incluido el propio (unica excepcion a la regla estricta)', () => {
    expect(puedeOtorgarAlcance('SISTEMA', 'SISTEMA')).toBe(true);
    expect(puedeOtorgarAlcance('SISTEMA', 'DEPARTAMENTO')).toBe(true);
    expect(puedeOtorgarAlcance('SISTEMA', 'SERVICIO')).toBe(true);
    expect(puedeOtorgarAlcance('SISTEMA', 'LECTURA')).toBe(true);
  });

  it('permite otorgar solo un alcance estrictamente inferior al propio', () => {
    expect(puedeOtorgarAlcance('DEPARTAMENTO', 'SERVICIO')).toBe(true);
    expect(puedeOtorgarAlcance('DEPARTAMENTO', 'LECTURA')).toBe(true);
    expect(puedeOtorgarAlcance('SERVICIO', 'LECTURA')).toBe(true);
  });

  it('rechaza otorgar un alcance superior al propio', () => {
    expect(puedeOtorgarAlcance('DEPARTAMENTO', 'SISTEMA')).toBe(false);
    expect(puedeOtorgarAlcance('SERVICIO', 'SISTEMA')).toBe(false);
    expect(puedeOtorgarAlcance('SERVICIO', 'DEPARTAMENTO')).toBe(false);
    expect(puedeOtorgarAlcance('LECTURA', 'SISTEMA')).toBe(false);
    expect(puedeOtorgarAlcance('LECTURA', 'DEPARTAMENTO')).toBe(false);
    expect(puedeOtorgarAlcance('LECTURA', 'SERVICIO')).toBe(false);
  });

  it('rechaza otorgar el mismo alcance entre pares no-SISTEMA (evita que un jefe nombre a otro jefe de su misma jerarquia)', () => {
    expect(puedeOtorgarAlcance('DEPARTAMENTO', 'DEPARTAMENTO')).toBe(false);
    expect(puedeOtorgarAlcance('SERVICIO', 'SERVICIO')).toBe(false);
    expect(puedeOtorgarAlcance('LECTURA', 'LECTURA')).toBe(false);
  });

  it('assertAlcancePermitido lanza ForbiddenException cuando no esta permitido', () => {
    expect(() => assertAlcancePermitido('SERVICIO', 'SISTEMA')).toThrow(
      ForbiddenException,
    );
  });

  it('assertAlcancePermitido no lanza cuando esta permitido', () => {
    expect(() => assertAlcancePermitido('SISTEMA', 'SERVICIO')).not.toThrow();
  });
});
