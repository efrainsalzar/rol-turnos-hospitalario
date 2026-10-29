import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { TypeOrmModule } from '../../infrastructure/persistence/typeorm/typeorm.module';
import { SeguridadModule } from '../seguridad/seguridad.module';
import { ListarDepartamentosUseCase } from './application/use-cases/listar-departamentos.use-case';
import { ListarServiciosPorDepartamentoUseCase } from './application/use-cases/listar-servicios-por-departamento.use-case';
import { ListarServiciosUseCase } from './application/use-cases/listar-servicios.use-case';
import { ObtenerServicioDetalleUseCase } from './application/use-cases/obtener-servicio-detalle.use-case';
import { DepartamentoRepository } from './domain/repositories/departamento.repository';
import { ServicioRepository } from './domain/repositories/servicio.repository';
import { TypeOrmDepartamentoRepository } from './infrastructure/persistence/typeorm-departamento.repository';
import { TypeOrmServicioRepository } from './infrastructure/persistence/typeorm-servicio.repository';
import { DepartamentoController } from './presentation/controllers/departamento.controller';
import { ServicioController } from './presentation/controllers/servicio.controller';

@Module({
  imports: [DatabaseModule, TypeOrmModule, SeguridadModule],
  controllers: [DepartamentoController, ServicioController],
  providers: [
    ListarDepartamentosUseCase,
    ListarServiciosPorDepartamentoUseCase,
    ListarServiciosUseCase,
    ObtenerServicioDetalleUseCase,
    {
      provide: DepartamentoRepository,
      useClass: TypeOrmDepartamentoRepository,
    },
    {
      provide: ServicioRepository,
      useClass: TypeOrmServicioRepository,
    },
  ],
})
export class OrganizacionModule {}
