import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'calendario' })
export class CalendarioOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ type: 'datetime' })
  fecha!: Date;

  @Column({ type: 'smallint' })
  anio!: number;

  @Column({ type: 'smallint' })
  mes!: number;

  @Column({ name: 'dia_mes', type: 'smallint' })
  diaMes!: number;

  @Column({ name: 'dia_semana_num', type: 'smallint' })
  diaSemanaNum!: number;

  @Column({ name: 'dia_semana_nombre', type: 'nvarchar', length: 20 })
  diaSemanaNombre!: string;

  @Column({ name: 'semana_mes', type: 'smallint', nullable: true })
  semanaMes!: number | null;

  @Column({ name: 'es_fin_semana', type: 'bit' })
  esFinSemana!: boolean;
}
