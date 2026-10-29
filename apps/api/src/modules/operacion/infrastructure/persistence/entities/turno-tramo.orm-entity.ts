import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'turno_tramo' })
export class TurnoTramoOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_turno', type: 'bigint' })
  idTurno!: number | string;

  @Column({ name: 'orden', type: 'smallint' })
  orden!: number;

  @Column({ name: 'hora_inicio', type: 'char', length: 5 })
  horaInicio!: string;

  @Column({ name: 'hora_fin', type: 'char', length: 5 })
  horaFin!: string;

  @Column({ name: 'duracion_horas', type: 'decimal', precision: 5, scale: 2 })
  duracionHoras!: string | number;

  @Column({ name: 'cruza_medianoche', type: 'bit' })
  cruzaMedianoche!: boolean;

  @Column({ type: 'bit' })
  activo!: boolean;
}
