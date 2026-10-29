import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { IniciarSesionPasswordDto } from '../../application/dto/iniciar-sesion-password.dto';
import type { SesionAutenticadaResponseDto } from '../../application/dto/sesion-autenticada-response.dto';
import { IniciarSesionPasswordUseCase } from '../../application/use-cases/iniciar-sesion-password.use-case';
import { Public } from '../decorators/public.decorator';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly iniciarSesionPasswordUseCase: IniciarSesionPasswordUseCase,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: IniciarSesionPasswordDto,
    @Req() request: Request,
  ): Promise<SesionAutenticadaResponseDto> {
    this.logger.log(`Acceso a POST /v1/auth/login para ${body.username}.`);
    return this.iniciarSesionPasswordUseCase.execute(
      body.username,
      body.password,
      {
        ipOrigen: request.ip ?? null,
        userAgent: readHeaderValue(request.headers['user-agent']),
      },
    );
  }
}

function readHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
