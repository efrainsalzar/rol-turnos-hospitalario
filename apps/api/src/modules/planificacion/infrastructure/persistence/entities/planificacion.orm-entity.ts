import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'planificacion' })
export class PlanificacionOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_servicio', type: 'bigint', nullable: true })
  idServicio!: number | string | null;

  @Column({ name: 'id_departamento', type: 'bigint', nullable: true })
  idDepartamento!: number | string | null;

  @Column({ type: 'smallint' })
  anio!: number;

  @Column({ type: 'smallint' })
  mes!: number;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'varchar', length: 20 })
  estado!: string;

  @Column({ type: 'bit' })
  activo!: boolean;

  @Column({ name: 'fecha_inicio', type: 'datetime' })
  fechaInicio!: Date;

  @Column({ name: 'fecha_fin', type: 'datetime' })
  fechaFin!: Date;

  @Column({ name: 'id_usuario_creador', type: 'bigint' })
  idUsuarioCreador!: number | string;

  @Column({ name: 'id_usuario_publicador', type: 'bigint', nullable: true })
  idUsuarioPublicador!: number | string | null;

  @Column({ name: 'fecha_publicacion', type: 'datetime', nullable: true })
  fechaPublicacion!: Date | null;

  @Column({ name: 'id_usuario_cierre', type: 'bigint', nullable: true })
  idUsuarioCierre!: number | string | null;

  @Column({ name: 'fecha_cierre', type: 'datetime', nullable: true })
  fechaCierre!: Date | null;

  @Column({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
