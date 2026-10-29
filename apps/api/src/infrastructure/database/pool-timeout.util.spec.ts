import { isPoolAcquireTimeoutError } from './pool-timeout.util';

class TimeoutError extends Error {}

describe('isPoolAcquireTimeoutError', () => {
  it('detecta un error cuyo constructor se llama TimeoutError', () => {
    expect(
      isPoolAcquireTimeoutError(
        new TimeoutError('operation timed out for an unknown reason'),
      ),
    ).toBe(true);
  });

  it('no confunde otros errores de base de datos con saturacion del pool', () => {
    expect(
      isPoolAcquireTimeoutError(new Error('ETIMEOUT: Request failed')),
    ).toBe(false);
  });

  it('no confunde un ConflictException/NotFoundException con saturacion del pool', () => {
    class ConflictException extends Error {}
    expect(
      isPoolAcquireTimeoutError(new ConflictException('conflicto de negocio')),
    ).toBe(false);
  });

  it('retorna false para valores que no son instancias de Error', () => {
    expect(isPoolAcquireTimeoutError('timeout')).toBe(false);
    expect(isPoolAcquireTimeoutError(null)).toBe(false);
    expect(isPoolAcquireTimeoutError(undefined)).toBe(false);
  });
});
