import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'incidencia_personal' })
export class IncidenciaPersonalOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 120 })
  nombre!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ type: 'varchar', length: 20 })
  alcance!: 'GENERAL' | 'PERSONAL' | 'OTRO';

  @Column({ name: 'es_laborable', type: 'bit' })
  esLaborable!: boolean;

  @Column({ name: 'genera_horas_trabajadas', type: 'bit' })
  generaHorasTrabajadas!: boolean;

  @Column({ name: 'computa_para_meta_horas', type: 'bit' })
  computaParaMetaHoras!: boolean;

  @Column({ name: 'requiere_respaldo', type: 'bit' })
  requiereRespaldo!: boolean;

  @Column({ type: 'bit' })
  activo!: boolean;
}
