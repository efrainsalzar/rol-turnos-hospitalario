import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'asignacion_personal' })
export class AsignacionPersonalOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_personal', type: 'bigint' })
  idPersonal!: number | string;

  @Column({ name: 'id_servicio', type: 'bigint', nullable: true })
  idServicio!: number | string | null;

  @Column({ name: 'id_departamento', type: 'bigint', nullable: true })
  idDepartamento!: number | string | null;

  @Column({ name: 'id_tipo_contrato', type: 'bigint' })
  idTipoContrato!: number | string;

  @Column({ name: 'id_carga_horaria', type: 'bigint', nullable: true })
  idCargaHoraria!: number | string | null;

  @Column({ name: 'nro_item', type: 'varchar', length: 50, nullable: true })
  nroItem!: string | null;

  @Column({
    name: 'codigo_fuente_item',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  codigoFuenteItem!: string | null;

  @Column({ name: 'es_principal', type: 'bit' })
  esPrincipal!: boolean;

  @Column({ type: 'bit' })
  activo!: boolean;
}
