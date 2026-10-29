import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'nivel_cargo' })
export class NivelCargoOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 120 })
  nombre!: string;
}
