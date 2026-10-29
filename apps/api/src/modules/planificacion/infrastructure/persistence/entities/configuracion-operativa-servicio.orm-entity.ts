import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'configuracion_operativa_servicio' })
export class ConfiguracionOperativaServicioOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_servicio', type: 'bigint' })
  idServicio!: number | string;

  @Column({ name: 'modo_visual_default', type: 'varchar', length: 30 })
  modoVisualDefault!: string;

  @Column({ name: 'permite_multi_registro_dia', type: 'bit' })
  permiteMultiRegistroDia!: boolean;

  @Column({
    name: 'usa_equivalencia_horaria_exportacion',
    type: 'bit',
  })
  usaEquivalenciaHorariaExportacion!: boolean;

  @Column({ type: 'bit' })
  activo!: boolean;
}
