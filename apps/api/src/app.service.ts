import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'roles-turnos-api listo. Usa /health/live, /health/ready y /health/database.';
  }
}
