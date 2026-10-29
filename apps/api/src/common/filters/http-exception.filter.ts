import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { isPoolAcquireTimeoutError } from '../../infrastructure/database/pool-timeout.util';
import { MENSAJE_ERROR_INESPERADO } from '../errors/mensajes-usuario';

const MENSAJE_POOL_SATURADO =
  'El sistema esta ocupado en este momento. Intenta de nuevo en unos segundos.';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Backpressure explicito (estrategia de escalabilidad de la matriz, capa
    // 4): el pool de conexiones agotado no es un error interno generico, es
    // una senal de saturacion transitoria — el cliente (ver apiClient.ts en
    // el frontend) reintenta automaticamente para operaciones idempotentes
    // conocidas en vez de mostrarle al usuario un fallo que en realidad se
    // resuelve solo, sin haber tocado la base todavia.
    if (
      !(exception instanceof HttpException) &&
      isPoolAcquireTimeoutError(exception)
    ) {
      this.logger.warn(
        `Pool de conexiones saturado al atender ${request.method} ${request.url}.`,
      );

      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        status: 'error',
        code: 'POOL_SATURADO',
        message: MENSAJE_POOL_SATURADO,
      });
      return;
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Un error que no es HttpException (falla de SQL, bug, `throw new Error`)
    // no tiene un mensaje pensado para el usuario y puede contener detalles
    // tecnicos (tablas, ids, SQL). Se registra completo y se responde un texto
    // generico. Los 5xx explicitos tambien se registran: antes no quedaba rastro.
    if (!(exception instanceof HttpException)) {
      this.logger.error(
        `Error no controlado en ${request.method} ${request.url}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );

      response.status(status).json({
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        status: 'error',
        message: MENSAJE_ERROR_INESPERADO,
      });
      return;
    }

    if (status >= 500) {
      this.logger.error(
        `Error ${status} en ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const normalized = normalizeExceptionResponse(exceptionResponse, exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...normalized,
    });
  }
}

function normalizeExceptionResponse(
  exceptionResponse: string | object | null,
  exception: unknown,
): Record<string, unknown> {
  if (typeof exceptionResponse === 'string') {
    return {
      status: 'error',
      message: exceptionResponse,
    };
  }

  if (exceptionResponse && typeof exceptionResponse === 'object') {
    return exceptionResponse as Record<string, unknown>;
  }

  if (exception instanceof Error) {
    return {
      status: 'error',
      message: exception.message,
    };
  }

  return {
    status: 'error',
    message: 'Error interno no controlado.',
  };
}
