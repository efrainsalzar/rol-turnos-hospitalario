import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'codigo_operativo_servicio' })
export class CodigoOperativoServicioOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_configuracion_operativa_servicio', type: 'bigint' })
  idConfiguracionOperativaServicio!: number | string;

  @Column({ type: 'varchar', length: 30 })
  origen!: string;

  @Column({ name: 'id_turno', type: 'bigint', nullable: true })
  idTurno!: number | string | null;

  @Column({ name: 'id_incidencia_personal', type: 'bigint', nullable: true })
  idIncidenciaPersonal!: number | string | null;

  @Column({ name: 'codigo_visual', type: 'varchar', length: 30 })
  codigoVisual!: string;

  @Column({ type: 'nvarchar', length: 120 })
  etiqueta!: string;

  @Column({ type: 'nvarchar', length: 250, nullable: true })
  descripcion!: string | null;

  @Column({
    name: 'horas_equivalentes',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  horasEquivalentes!: number | string;

  @Column({ type: 'varchar', length: 30 })
  categoria!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color!: string | null;

  @Column({ name: 'orden_visual', type: 'int' })
  ordenVisual!: number;

  @Column({ name: 'es_laborable', type: 'bit' })
  esLaborable!: boolean;

  @Column({ name: 'requiere_confirmacion', type: 'bit' })
  requiereConfirmacion!: boolean;

  @Column({ type: 'bit' })
  activo!: boolean;
}
