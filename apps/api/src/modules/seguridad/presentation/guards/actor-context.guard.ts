import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ObtenerSesionActualUseCase } from '../../application/use-cases/obtener-sesion-actual.use-case';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const AUTHORIZATION_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';

@Injectable()
export class ActorContextGuard implements CanActivate {
  private readonly logger = new Logger(ActorContextGuard.name);

  constructor(
    private readonly obtenerSesionActualUseCase: ObtenerSesionActualUseCase,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      actor?: unknown;
      sessionToken?: string;
    }>();

    const rawHeader = request.headers[AUTHORIZATION_HEADER];
    const rawValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!rawValue) {
      throw new UnauthorizedException(
        `La cabecera ${AUTHORIZATION_HEADER} es obligatoria para operar sobre planificacion.`,
      );
    }

    if (!rawValue.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException(
        `La cabecera ${AUTHORIZATION_HEADER} debe usar el esquema Bearer.`,
      );
    }

    const tokenSesion = rawValue.slice(BEARER_PREFIX.length).trim();

    if (!tokenSesion) {
      throw new UnauthorizedException(
        `La cabecera ${AUTHORIZATION_HEADER} debe incluir un token de sesion valido.`,
      );
    }

    const actor = await this.obtenerSesionActualUseCase.execute(tokenSesion);

    this.logger.log(
      `Actor resuelto para planificacion: id=${actor.id}, username=${actor.username}, alcance=${actor.alcancePlanificacion}.`,
    );

    request.actor = actor;
    request.sessionToken = tokenSesion;
    return true;
  }
}
