import { Logger } from '@nestjs/common';

interface RetryOptions {
  logger: Logger;
  maxRetries: number;
  retryDelayMs: number;
  operationName: string;
}

export async function withControlledRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= options.maxRetries) {
        break;
      }

      options.logger.warn(
        `${options.operationName} fallo en el intento ${attempt}/${options.maxRetries}. Reintentando en ${options.retryDelayMs} ms.`,
      );

      await wait(options.retryDelayMs);
    }
  }

  throw lastError;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
