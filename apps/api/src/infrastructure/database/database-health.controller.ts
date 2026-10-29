import {
  Controller,
  ForbiddenException,
  Get,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../modules/seguridad/application/dto/usuario-sesion-response.dto';
import { CurrentActor } from '../../modules/seguridad/presentation/decorators/current-actor.decorator';
import { Public } from '../../modules/seguridad/presentation/decorators/public.decorator';
import { DatabaseService } from './database.service';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class DatabaseHealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Public()
  @Get('live')
  getLiveStatus() {
    return {
      status: 'ok',
      service: 'roles-turnos-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('app')
  getAppStatus() {
    return {
      status: 'ok',
      service: 'roles-turnos-api',
      environment: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  getReadinessStatus(@CurrentActor() actor: UsuarioSesionResponseDto) {
    this.assertPuedeVerDetalleTecnico(actor);
    return this.databaseService.getReadinessSnapshot();
  }

  @Get('database')
  getDatabaseHealth(@CurrentActor() actor: UsuarioSesionResponseDto) {
    this.assertPuedeVerDetalleTecnico(actor);
    return this.databaseService.getHealthSnapshot();
  }

  private assertPuedeVerDetalleTecnico(actor: UsuarioSesionResponseDto): void {
    if (!actor.permisos.puedeGestionarUsuarios) {
      throw new ForbiddenException(
        'El usuario actual no puede consultar el detalle tecnico de la base de datos.',
      );
    }
  }
}
