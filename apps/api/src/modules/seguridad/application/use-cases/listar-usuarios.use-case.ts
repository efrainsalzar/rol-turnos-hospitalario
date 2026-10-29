import { Injectable, Logger } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { UsuarioResponseDto } from '../dto/usuario-response.dto';

@Injectable()
export class ListarUsuariosUseCase {
  private readonly logger = new Logger(ListarUsuariosUseCase.name);

  constructor(private readonly usuarioRepository: UsuarioRepository) {}

  async execute(): Promise<UsuarioResponseDto[]> {
    this.logger.log('Listando usuarios.');
    const usuarios = await this.usuarioRepository.listar();
    this.logger.log(`Usuarios encontrados: ${usuarios.length}.`);

    return usuarios.map((usuario) => ({
      id: usuario.id,
      username: usuario.username,
      tipoUsuario: usuario.tipoUsuario,
      proveedorAutenticacion: usuario.proveedorAutenticacion,
      sujetoAutenticacion: usuario.sujetoAutenticacion,
      identidadLocalHabilitada: usuario.identidadLocalHabilitada,
      activo: usuario.activo,
      rolSeguridad: {
        id: usuario.idRolSeguridad,
        codigo: usuario.rolCodigo,
        nombre: usuario.rolNombre,
      },
      personal: {
        id: usuario.idPersonal,
        codigoPersonal: usuario.codigoPersonal,
        nombreCompleto: usuario.nombreCompleto,
      },
    }));
  }
}
