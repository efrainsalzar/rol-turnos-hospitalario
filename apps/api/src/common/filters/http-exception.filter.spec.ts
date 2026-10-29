import { ArgumentsHost, ConflictException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { MENSAJE_ERROR_INESPERADO } from '../errors/mensajes-usuario';

class TimeoutError extends Error {}

function buildHost(
  request: { method: string; url: string },
  response: { status: jest.Mock; json: jest.Mock },
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
      getNext: () => undefined,
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  const request = {
    method: 'PUT',
    url: '/v1/planificaciones/1/matriz/celdas/lote',
  };
  let json: jest.Mock;
  let status: jest.Mock;
  let response: { status: jest.Mock; json: jest.Mock };
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    response = { status, json };
    filter = new HttpExceptionFilter();
  });

  it('responde 503 con codigo POOL_SATURADO cuando el pool de conexiones se agota', () => {
    filter.catch(
      new TimeoutError('operation timed out for an unknown reason'),
      buildHost(request, response),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        code: 'POOL_SATURADO',
        status: 'error',
      }),
    );
  });

  it('sigue devolviendo el status real de una HttpException de negocio (no la trata como saturacion de pool)', () => {
    filter.catch(
      new ConflictException('la planificacion ya esta publicada'),
      buildHost(request, response),
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: 'la planificacion ya esta publicada',
      }),
    );
  });

  it('responde 500 con mensaje generico (sin detalle tecnico) para un error no controlado que no es de saturacion de pool', () => {
    filter.catch(new Error('fallo inesperado'), buildHost(request, response));

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: MENSAJE_ERROR_INESPERADO,
      }),
    );
  });
});
