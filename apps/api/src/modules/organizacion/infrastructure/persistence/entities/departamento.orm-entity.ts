import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'departamento' })
export class DepartamentoOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 150 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'bit' })
  activo!: boolean;
}
