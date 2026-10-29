import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Marca una ruta como exenta del guard global de sesion (ActorContextGuard).
// Uso deliberadamente explicito: el guard ahora deniega por defecto, asi que
// cualquier endpoint nuevo queda protegido automaticamente salvo que se
// declare @Public() a proposito (login, health checks basicos).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
