import { Module } from '@nestjs/common';
import { SeguridadModule } from '../../modules/seguridad/seguridad.module';
import { DatabaseHealthController } from './database-health.controller';
import { DatabaseService } from './database.service';

@Module({
  imports: [SeguridadModule],
  controllers: [DatabaseHealthController],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
