import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { loadEnvFile } from '../../src/infrastructure/config/load-env';
import { IntegracionModule } from '../../src/modules/integracion/integracion.module';

// Los scripts sync:personal:* solo abren el contexto del modulo integracion
// y llaman a sus casos de uso: la logica es la misma que usara la API.
export async function conModuloIntegracion(
  nombreScript: string,
  ejecutar: (contexto: INestApplicationContext) => Promise<void>,
): Promise<void> {
  loadEnvFile();
  const contexto = await NestFactory.createApplicationContext(
    IntegracionModule,
    { logger: ['log', 'warn', 'error'] },
  );

  try {
    await ejecutar(contexto);
  } catch (error) {
    console.error(
      `[${nombreScript}] Error:`,
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    await contexto.close();
  }
}

export function imprimirResumen(
  nombreScript: string,
  titulo: string,
  datos: unknown,
): void {
  console.log(`[${nombreScript}] ${titulo}`);
  console.log(JSON.stringify(datos, null, 2));
}
