import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'servicio' })
export class ServicioOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'id_departamento', type: 'bigint' })
  idDepartamento!: number;

  @Column({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 150 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ name: 'tipo_servicio', type: 'varchar', length: 20 })
  tipoServicio!: string;

  @Column({ type: 'bit' })
  activo!: boolean;
}
