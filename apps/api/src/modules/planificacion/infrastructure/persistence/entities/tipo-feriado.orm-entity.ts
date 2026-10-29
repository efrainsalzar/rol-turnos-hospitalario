import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tipo_feriado' })
export class TipoFeriadoOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ type: 'nvarchar', length: 4 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 80 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'smallint' })
  orden!: number;

  @Column({ type: 'bit' })
  activo!: boolean;
}
