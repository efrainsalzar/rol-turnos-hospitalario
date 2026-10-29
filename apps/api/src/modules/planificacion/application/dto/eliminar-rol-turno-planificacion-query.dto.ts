import { Transform } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { toOptionalNumber } from '../../../../common/http/query-transformers';

export class EliminarRolTurnoPlanificacionQueryDto {
  @Transform(({ value }) => toOptionalNumber(value))
  @IsInt()
  @Min(1)
  id_usuario_operacion!: number;
}
