import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { PersonalVinculableResponseDto } from '../dto/personal-vinculable-response.dto';

@Injectable()
export class ListarPersonalVinculableUsuarioUseCase {
  private readonly logger = new Logger(
    ListarPersonalVinculableUsuarioUseCase.name,
  );

  constructor(private readonly personalRepository: PersonalRepository) {}

  async execute(
    actor: UsuarioSesionResponseDto,
  ): Promise<PersonalVinculableResponseDto[]> {
    if (!actor.permisos.puedeGestionarUsuarios) {
      throw new ForbiddenException(
        'No tienes permiso para gestionar usuarios.',
      );
    }

    this.logger.log('Listando personal vinculable a usuario.');

    const personal = await this.personalRepository.listarVinculablesUsuario();

    this.logger.log(`Personal vinculable encontrado: ${personal.length}.`);

    return personal.map((persona) => ({
      id: persona.id,
      codigoPersonal: persona.codigoPersonal,
      nombreCompleto: persona.nombreCompleto,
      idServicioPrincipal: persona.idServicioPrincipal,
      nombreServicioPrincipal: persona.nombreServicioPrincipal,
      idDepartamentoPrincipal: persona.idDepartamentoPrincipal,
      nombreDepartamentoPrincipal: persona.nombreDepartamentoPrincipal,
      esJefaturaRolFuncional: persona.esJefaturaRolFuncional,
    }));
  }
}
