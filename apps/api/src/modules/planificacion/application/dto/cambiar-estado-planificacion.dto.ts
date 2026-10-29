import { IsIn } from 'class-validator';
import type { EstadoPlanificacion } from '../../domain/entities/planificacion';

const ESTADOS_TRANSICIONABLES: EstadoPlanificacion[] = [
  'BORRADOR',
  'REVISION',
  'APROBADA',
  'CERRADA',
];

export class CambiarEstadoPlanificacionDto {
  @IsIn(ESTADOS_TRANSICIONABLES)
  estado!: EstadoPlanificacion;
}
