import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'feriado' })
export class FeriadoOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_tipo_feriado', type: 'bigint' })
  idTipoFeriado!: number | string;

  @Column({ type: 'nvarchar', length: 150 })
  nombre!: string;

  @Column({ type: 'smallint' })
  anio!: number;

  @Column({ type: 'smallint' })
  mes!: number;

  @Column({ name: 'fecha_inicio', type: 'date' })
  fechaInicio!: string;

  @Column({ name: 'fecha_fin', type: 'date' })
  fechaFin!: string;

  @Column({ type: 'bit' })
  activo!: boolean;
}
