import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'planificacion_sesion_edicion' })
export class PlanificacionSesionEdicionOrmEntity {
  @PrimaryColumn({ name: 'id_planificacion', type: 'bigint' })
  idPlanificacion!: number | string;

  @Column({ name: 'id_usuario_editor', type: 'bigint' })
  idUsuarioEditor!: number | string;

  @Column({ name: 'adquirido_en', type: 'datetime' })
  adquiridoEn!: Date;

  @Column({ name: 'ultimo_latido', type: 'datetime' })
  ultimoLatido!: Date;
}
