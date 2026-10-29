import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'turno' })
export class TurnoOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_servicio', type: 'bigint', nullable: true })
  idServicio!: number | string | null;

  @Column({ name: 'id_departamento', type: 'bigint', nullable: true })
  idDepartamento!: number | string | null;

  @Column({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 120 })
  nombre!: string;

  @Column({
    name: 'tipo_horario',
    type: 'varchar',
    length: 20,
    default: 'CONTINUO',
  })
  tipoHorario!: string;

  @Column({ name: 'hora_inicio', type: 'char', length: 5 })
  horaInicio!: string;

  @Column({ name: 'hora_fin', type: 'char', length: 5 })
  horaFin!: string;

  @Column({ name: 'cruza_medianoche', type: 'bit' })
  cruzaMedianoche!: boolean;

  @Column({ name: 'duracion_horas', type: 'decimal', precision: 5, scale: 2 })
  duracionHoras!: string | number;

  @Column({ name: 'vigencia_desde', type: 'datetime' })
  vigenciaDesde!: Date;

  @Column({ name: 'vigencia_hasta', type: 'datetime', nullable: true })
  vigenciaHasta!: Date | null;

  @Column({ type: 'bit' })
  activo!: boolean;
}
