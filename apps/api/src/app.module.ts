import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database/database.module';
import { IntegracionModule } from './modules/integracion/integracion.module';
import { OperacionModule } from './modules/operacion/operacion.module';
import { OrganizacionModule } from './modules/organizacion/organizacion.module';
import { PersonalModule } from './modules/personal/personal.module';
import { PlanificacionModule } from './modules/planificacion/planificacion.module';
import { SeguridadModule } from './modules/seguridad/seguridad.module';

@Module({
  imports: [
    DatabaseModule,
    IntegracionModule,
    OperacionModule,
    OrganizacionModule,
    PersonalModule,
    PlanificacionModule,
    SeguridadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
