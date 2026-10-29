import { Injectable, Logger } from '@nestjs/common';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { RolSeguridadResponseDto } from '../dto/rol-seguridad-response.dto';

@Injectable()
export class ListarRolesUseCase {
  private readonly logger = new Logger(ListarRolesUseCase.name);

  constructor(
    private readonly rolSeguridadRepository: RolSeguridadRepository,
  ) {}

  async execute(): Promise<RolSeguridadResponseDto[]> {
    this.logger.log('Listando roles.');
    const roles = await this.rolSeguridadRepository.listar();
    this.logger.log(`Roles encontrados: ${roles.length}.`);

    return roles.map((rolSeguridad) => ({
      id: rolSeguridad.id,
      codigo: rolSeguridad.codigo,
      nombre: rolSeguridad.nombre,
      activo: rolSeguridad.activo,
      alcancePlanificacion: rolSeguridad.alcancePlanificacion,
      permisos: rolSeguridad.permisos,
      capacidades: rolSeguridad.capacidades,
    }));
  }
}
