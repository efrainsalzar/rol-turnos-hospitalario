import { Global, Module } from '@nestjs/common';
import { TYPEORM_DATA_SOURCE } from './typeorm.constants';
import { createTypeOrmDataSource } from './typeorm-data-source.factory';
import { TypeOrmLifecycleService } from './typeorm-lifecycle.service';

@Global()
@Module({
  providers: [
    {
      provide: TYPEORM_DATA_SOURCE,
      useFactory: createTypeOrmDataSource,
    },
    TypeOrmLifecycleService,
  ],
  exports: [TYPEORM_DATA_SOURCE],
})
export class TypeOrmModule {}
