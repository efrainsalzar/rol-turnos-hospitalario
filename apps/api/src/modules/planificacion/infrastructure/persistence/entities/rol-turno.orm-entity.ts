import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'rol_turno' })
export class RolTurnoOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_planificacion', type: 'bigint' })
  idPlanificacion!: number | string;

  @Column({ name: 'id_asignacion_personal', type: 'bigint' })
  idAsignacionPersonal!: number | string;

  @Column({ name: 'id_calendario', type: 'bigint' })
  idCalendario!: number | string;

  @Column({ name: 'secuencia_dia', type: 'smallint' })
  secuenciaDia!: number;

  @Column({ name: 'id_turno', type: 'bigint', nullable: true })
  idTurno!: number | string | null;

  @Column({ name: 'id_incidencia_personal', type: 'bigint', nullable: true })
  idIncidenciaPersonal!: number | string | null;

  @Column({ name: 'id_planificacion_cambio', type: 'bigint', nullable: true })
  idPlanificacionCambio!: number | string | null;

  @Column({
    name: 'horas_programadas',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  horasProgramadas!: number | string;

  @Column({ name: 'origen_registro', type: 'varchar', length: 20 })
  origenRegistro!: string;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy!: number | string;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy!: number | string | null;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true })
  updatedAt!: Date | null;
}
