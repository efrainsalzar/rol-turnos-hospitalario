import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'rol_seguridad' })
export class RolSeguridadOrmEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number | string;

  @Column({ type: 'varchar', length: 30 })
  codigo!: string;

  @Column({ type: 'nvarchar', length: 120 })
  nombre!: string;

  @Column({ type: 'bit' })
  activo!: boolean;

  @Column({ name: 'alcance_planificacion', type: 'varchar', length: 20 })
  alcancePlanificacion!: string;

  @Column({ name: 'puede_ver_organizacion', type: 'bit' })
  puedeVerOrganizacion!: boolean;

  @Column({ name: 'puede_ver_personal', type: 'bit' })
  puedeVerPersonal!: boolean;

  @Column({ name: 'puede_gestionar_personal', type: 'bit' })
  puedeGestionarPersonal!: boolean;

  @Column({ name: 'puede_ver_asignaciones', type: 'bit' })
  puedeVerAsignaciones!: boolean;

  @Column({ name: 'puede_gestionar_asignaciones', type: 'bit' })
  puedeGestionarAsignaciones!: boolean;

  @Column({ name: 'puede_ver_seguridad', type: 'bit' })
  puedeVerSeguridad!: boolean;

  @Column({ name: 'puede_gestionar_usuarios', type: 'bit' })
  puedeGestionarUsuarios!: boolean;

  @Column({ name: 'puede_ver_operacion', type: 'bit' })
  puedeVerOperacion!: boolean;

  @Column({ name: 'puede_ver_planificacion', type: 'bit' })
  puedeVerPlanificacion!: boolean;

  @Column({ name: 'puede_editar_planificacion', type: 'bit' })
  puedeEditarPlanificacion!: boolean;

  @Column({ name: 'puede_aprobar_planificacion', type: 'bit' })
  puedeAprobarPlanificacion!: boolean;

  @Column({ name: 'puede_ver_reportes', type: 'bit' })
  puedeVerReportes!: boolean;

  @Column({ name: 'ver_calendarios', type: 'bit' })
  verCalendarios!: boolean;

  @Column({ name: 'gestionar_calendarios', type: 'bit' })
  gestionarCalendarios!: boolean;

  @Column({ name: 'ver_incidencias_personales', type: 'bit' })
  verIncidenciasPersonales!: boolean;

  @Column({ name: 'gestionar_incidencias_personales', type: 'bit' })
  gestionarIncidenciasPersonales!: boolean;

  @Column({ name: 'gestionar_tipos_feriado', type: 'bit' })
  gestionarTiposFeriado!: boolean;

  @Column({ name: 'ver_cargas_horarias', type: 'bit' })
  verCargasHorarias!: boolean;

  @Column({ name: 'gestionar_cargas_horarias', type: 'bit' })
  gestionarCargasHorarias!: boolean;

  @Column({ name: 'ver_turnos', type: 'bit' })
  verTurnos!: boolean;

  @Column({ name: 'crear_planificacion', type: 'bit' })
  crearPlanificacion!: boolean;

  @Column({ name: 'editar_planificacion', type: 'bit' })
  editarPlanificacion!: boolean;

  @Column({ name: 'enviar_revision_planificacion', type: 'bit' })
  enviarRevisionPlanificacion!: boolean;

  @Column({ name: 'volver_borrador_planificacion', type: 'bit' })
  volverBorradorPlanificacion!: boolean;

  @Column({ name: 'aprobar_planificacion', type: 'bit' })
  aprobarPlanificacion!: boolean;

  @Column({ name: 'cerrar_planificacion', type: 'bit' })
  cerrarPlanificacion!: boolean;

  @Column({ name: 'exportar_planificacion', type: 'bit' })
  exportarPlanificacion!: boolean;

  @Column({ name: 'exportar_planificacion_lote', type: 'bit' })
  exportarPlanificacionLote!: boolean;

  @Column({ name: 'gestionar_codigos_operativos', type: 'bit' })
  gestionarCodigosOperativos!: boolean;

  @Column({ name: 'gestionar_turnos', type: 'bit' })
  gestionarTurnos!: boolean;

  @Column({ name: 'gestionar_servicios', type: 'bit' })
  gestionarServicios!: boolean;
}
