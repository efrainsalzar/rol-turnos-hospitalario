import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'usuario' })
export class UsuarioOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ name: 'id_personal', type: 'bigint', nullable: true })
  idPersonal!: number | string | null;

  @Column({ name: 'id_rol_seguridad', type: 'bigint', nullable: true })
  idRolSeguridad!: number | string | null;

  @Column({ name: 'tipo_usuario', type: 'varchar', length: 20 })
  tipoUsuario!: string;

  @Column({ name: 'proveedor_autenticacion', type: 'varchar', length: 30 })
  proveedorAutenticacion!: string;

  @Column({
    name: 'sujeto_autenticacion',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  sujetoAutenticacion!: string | null;

  @Column({ type: 'varchar', length: 80 })
  username!: string;

  @Column({ type: 'bit' })
  activo!: boolean;
}
