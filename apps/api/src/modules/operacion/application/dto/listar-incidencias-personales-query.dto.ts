import { IsIn, IsOptional } from 'class-validator';

export class ListarIncidenciasPersonalesQueryDto {
  @IsOptional()
  @IsIn(['GENERAL', 'PERSONAL', 'OTRO'])
  alcance?: 'GENERAL' | 'PERSONAL' | 'OTRO';
}
