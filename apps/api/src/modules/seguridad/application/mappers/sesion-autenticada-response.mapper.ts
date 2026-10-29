import type { SesionActivaUsuario } from '../../domain/repositories/usuario.repository';
import type { SesionAutenticadaResponseDto } from '../dto/sesion-autenticada-response.dto';
import { mapUsuarioSesionToResponse } from './usuario-sesion-response.mapper';

export function mapSesionActivaToResponse(
  sesionActiva: SesionActivaUsuario,
): SesionAutenticadaResponseDto {
  return {
    tokenSesion: sesionActiva.tokenSesion,
    sesion: mapUsuarioSesionToResponse(sesionActiva.session),
  };
}
