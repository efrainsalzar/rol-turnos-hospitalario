import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../application/dto/usuario-sesion-response.dto';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioSesionResponseDto => {
    const request = context.switchToHttp().getRequest<{
      actor?: UsuarioSesionResponseDto;
    }>();

    return request.actor as UsuarioSesionResponseDto;
  },
);
