import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'personal' })
export class PersonalOrmEntity {
  @PrimaryColumn({ type: 'bigint' })
  id!: number | string;

  @Column({
    name: 'codigo_personal',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  codigoPersonal!: string | null;

  @Column({ type: 'nvarchar', length: 120 })
  nombres!: string;

  @Column({ name: 'apellido_paterno', type: 'nvarchar', length: 120 })
  apellidoPaterno!: string;

  @Column({
    name: 'apellido_materno',
    type: 'nvarchar',
    length: 120,
    nullable: true,
  })
  apellidoMaterno!: string | null;

  @Column({ name: 'documento_identidad', type: 'varchar', length: 30 })
  documentoIdentidad!: string;

  @Column({ name: 'id_nivel_cargo', type: 'bigint' })
  idNivelCargo!: number | string;

  @Column({ type: 'bit' })
  activo!: boolean;
}
