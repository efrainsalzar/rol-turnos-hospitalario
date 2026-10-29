import { Controller, Get, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentActor } from '../decorators/current-actor.decorator';
import type { UsuarioSesionResponseDto } from '../../application/dto/usuario-sesion-response.dto';
import { CerrarSesionActualUseCase } from '../../application/use-cases/cerrar-sesion-actual.use-case';

@Controller({
  path: 'sesion',
  version: '1',
})
export class SesionController {
  private readonly logger = new Logger(SesionController.name);

  constructor(
    private readonly cerrarSesionActualUseCase: CerrarSesionActualUseCase,
  ) {}

  @Get('actual')
  obtenerActual(
    @CurrentActor() actor: UsuarioSesionResponseDto,
  ): UsuarioSesionResponseDto {
    this.logger.log(`Acceso a GET /v1/sesion/actual para actor=${actor.id}.`);
    return actor;
  }

  @Post('logout')
  @HttpCode(204)
  async cerrarSesion(
    @Req()
    request: Request & {
      sessionToken?: string;
    },
  ): Promise<void> {
    if (!request.sessionToken) {
      return;
    }

    this.logger.log('Acceso a POST /v1/sesion/logout.');
    await this.cerrarSesionActualUseCase.execute(request.sessionToken);
  }
}
