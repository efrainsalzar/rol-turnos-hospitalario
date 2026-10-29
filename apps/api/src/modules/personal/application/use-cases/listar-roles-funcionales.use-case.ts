import { Injectable, Logger } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { RolFuncionalResponseDto } from '../dto/rol-funcional-response.dto';

@Injectable()
export class ListarRolesFuncionalesUseCase {
  private readonly logger = new Logger(ListarRolesFuncionalesUseCase.name);

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(): Promise<RolFuncionalResponseDto[]> {
    this.logger.log('Listando roles funcionales.');
    return this.personalRepository.listarRolesFuncionales();
  }
}
