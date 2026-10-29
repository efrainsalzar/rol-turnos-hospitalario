import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '../../infrastructure/persistence/typeorm/typeorm.module';
import { SESSION_DURATION_HOURS } from './domain/sesion.constants';
import { CerrarSesionActualUseCase } from './application/use-cases/cerrar-sesion-actual.use-case';
import { IniciarSesionPasswordUseCase } from './application/use-cases/iniciar-sesion-password.use-case';
import { ActivarUsuarioUseCase } from './application/use-cases/activar-usuario.use-case';
import { ActualizarUsuarioUseCase } from './application/use-cases/actualizar-usuario.use-case';
import { CambiarMiPasswordUseCase } from './application/use-cases/cambiar-mi-password.use-case';
import { CrearUsuarioUseCase } from './application/use-cases/crear-usuario.use-case';
import { DesactivarUsuarioUseCase } from './application/use-cases/desactivar-usuario.use-case';
import { ListarRolesUseCase } from './application/use-cases/listar-roles.use-case';
import { CrearRolSeguridadUseCase } from './application/use-cases/crear-rol-seguridad.use-case';
import { ActualizarRolSeguridadUseCase } from './application/use-cases/actualizar-rol-seguridad.use-case';
import { ListarUsuariosUseCase } from './application/use-cases/listar-usuarios.use-case';
import { ObtenerSesionActualUseCase } from './application/use-cases/obtener-sesion-actual.use-case';
import { RolSeguridadRepository } from './domain/repositories/rol-seguridad.repository';
import { UsuarioRepository } from './domain/repositories/usuario.repository';
import { TypeOrmRolSeguridadRepository } from './infrastructure/persistence/typeorm-rol-seguridad.repository';
import { TypeOrmUsuarioRepository } from './infrastructure/persistence/typeorm-usuario.repository';
import { AuthController } from './presentation/controllers/auth.controller';
import { RolSeguridadController } from './presentation/controllers/rol-seguridad.controller';
import { SesionController } from './presentation/controllers/sesion.controller';
import { UsuarioController } from './presentation/controllers/usuario.controller';
import { ActorContextGuard } from './presentation/guards/actor-context.guard';

@Module({
  imports: [
    TypeOrmModule,
    // useFactory (no un objeto estatico) para que process.env.JWT_SECRET se
    // lea recien cuando Nest arranca el modulo, despues de que main.ts ya
    // corrio loadEnvFile() — mismo patron que TypeOrmModule/
    // createTypeOrmDataSource para evitar leer el env antes de tiempo.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: `${SESSION_DURATION_HOURS}h` },
      }),
    }),
    // Solo se aplica explicitamente en AuthController.login (@UseGuards(ThrottlerGuard)),
    // no como guard global — un limite global afectaria endpoints legitimos
    // de alta frecuencia como el lote de pintado de celdas de la matriz.
    ThrottlerModule.forRoot([{ name: 'login', ttl: 60000, limit: 5 }]),
  ],
  controllers: [
    AuthController,
    RolSeguridadController,
    SesionController,
    UsuarioController,
  ],
  providers: [
    ActorContextGuard,
    // Guard global: deniega por defecto en toda la API salvo @Public()
    // explicito. Antes cada controller debia acordarse de aplicar
    // @UseGuards(ActorContextGuard) por su cuenta — seguro hoy (se verifico
    // que los 20 controllers reales ya lo tenian), pero fragil a futuro si
    // se agrega un controller nuevo y alguien se olvida de protegerlo.
    { provide: APP_GUARD, useClass: ActorContextGuard },
    CerrarSesionActualUseCase,
    IniciarSesionPasswordUseCase,
    CrearUsuarioUseCase,
    ActualizarUsuarioUseCase,
    CambiarMiPasswordUseCase,
    ActivarUsuarioUseCase,
    DesactivarUsuarioUseCase,
    ListarRolesUseCase,
    CrearRolSeguridadUseCase,
    ActualizarRolSeguridadUseCase,
    ListarUsuariosUseCase,
    ObtenerSesionActualUseCase,
    {
      provide: RolSeguridadRepository,
      useClass: TypeOrmRolSeguridadRepository,
    },
    {
      provide: UsuarioRepository,
      useClass: TypeOrmUsuarioRepository,
    },
  ],
  exports: [ActorContextGuard, ObtenerSesionActualUseCase, UsuarioRepository],
})
export class SeguridadModule {}
