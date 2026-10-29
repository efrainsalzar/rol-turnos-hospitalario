import compression from 'compression';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { readCorsEnv } from './infrastructure/config/cors-env';
import { loadEnvFile } from './infrastructure/config/load-env';

async function bootstrap() {
  loadEnvFile();
  const app = await NestFactory.create(AppModule);
  const corsEnv = readCorsEnv();

  // La matriz mensual y sus exportaciones viajan como JSON de fila x dia x
  // registro, texto muy repetitivo (gzip lo comprime bien); esto reduce el
  // tiempo de transferencia sin tocar el costo de las consultas en si.
  app.use(compression());

  app.enableCors({
    origin: corsEnv.origins,
    credentials: corsEnv.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.listen(process.env.PORT ?? 3000, process.env.HOST ?? '0.0.0.0');
}
void bootstrap();
