import type { UsuarioSesionResponseDto } from './usuario-sesion-response.dto';

export interface SesionAutenticadaResponseDto {
  tokenSesion: string;
  sesion: UsuarioSesionResponseDto;
}
