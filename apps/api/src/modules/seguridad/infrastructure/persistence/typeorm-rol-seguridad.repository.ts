import { Inject, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { errorAlConfirmarGuardado } from '../../../../common/errors/mensajes-usuario';
import { TYPEORM_DATA_SOURCE } from '../../../../infrastructure/persistence/typeorm/typeorm.constants';
import { RolSeguridad } from '../../domain/entities/rol-seguridad';
import { normalizeCapacidadesOperativas } from '../../domain/entities/usuario-capacidades';
import { normalizePermisosOperativos } from '../../domain/entities/usuario-permisos';
import {
  GuardarRolSeguridadInput,
  RolSeguridadRepository,
} from '../../domain/repositories/rol-seguridad.repository';
import { RolSeguridadOrmEntity } from './entities/rol-seguridad.orm-entity';

@Injectable()
export class TypeOrmRolSeguridadRepository implements RolSeguridadRepository {
  private readonly repository: Repository<RolSeguridadOrmEntity>;

  constructor(@Inject(TYPEORM_DATA_SOURCE) dataSource: DataSource) {
    this.repository = dataSource.getRepository(RolSeguridadOrmEntity);
  }

  async listar(): Promise<RolSeguridad[]> {
    const rows = await this.repository.find({
      order: {
        nombre: 'ASC',
      },
    });

    return rows.map(mapRolSeguridadOrmEntity);
  }

  async obtenerPorId(id: number): Promise<RolSeguridad | null> {
    const row = await this.repository
      .createQueryBuilder('rolSeguridad')
      .where('rolSeguridad.id = :id', { id })
      .getOne();

    return row ? mapRolSeguridadOrmEntity(row) : null;
  }

  async crear(input: GuardarRolSeguridadInput): Promise<RolSeguridad> {
    const result = await this.repository.insert({
      codigo: input.codigo.trim(),
      nombre: input.nombre.trim(),
      activo: input.activo ?? true,
      alcancePlanificacion: input.alcancePlanificacion,
      ...mapPermisosToPersistence(input),
      ...mapCapacidadesToPersistence(input),
    });

    const id = Number(result.identifiers[0]?.id);
    return this.obtenerOrFail(id);
  }

  async actualizar(
    idRolSeguridad: number,
    input: GuardarRolSeguridadInput,
  ): Promise<RolSeguridad> {
    await this.repository.update(
      { id: idRolSeguridad },
      {
        codigo: input.codigo.trim(),
        nombre: input.nombre.trim(),
        activo: input.activo ?? true,
        alcancePlanificacion: input.alcancePlanificacion,
        ...mapPermisosToPersistence(input),
        ...mapCapacidadesToPersistence(input),
      },
    );

    return this.obtenerOrFail(idRolSeguridad);
  }

  async activar(idRolSeguridad: number): Promise<void> {
    await this.repository.update({ id: idRolSeguridad }, { activo: true });
  }

  async desactivar(idRolSeguridad: number): Promise<void> {
    await this.repository.update({ id: idRolSeguridad }, { activo: false });
  }

  private async obtenerOrFail(idRolSeguridad: number): Promise<RolSeguridad> {
    const row = await this.repository
      .createQueryBuilder('rolSeguridad')
      .where('rolSeguridad.id = :id', { id: idRolSeguridad })
      .getOne();

    // Se llama despues de crear/actualizar; los casos de uso ya validan que el
    // rol exista antes de escribir.
    if (!row) {
      throw errorAlConfirmarGuardado(
        'rolSeguridad',
        idRolSeguridad,
        TypeOrmRolSeguridadRepository.name,
      );
    }

    return mapRolSeguridadOrmEntity(row);
  }
}

function mapRolSeguridadOrmEntity(row: RolSeguridadOrmEntity): RolSeguridad {
  return {
    id: Number(row.id),
    codigo: row.codigo,
    nombre: row.nombre,
    activo: row.activo,
    alcancePlanificacion:
      row.alcancePlanificacion as RolSeguridad['alcancePlanificacion'],
    permisos: normalizePermisosOperativos({
      puedeVerOrganizacion: row.puedeVerOrganizacion,
      puedeVerPersonal: row.puedeVerPersonal,
      puedeGestionarPersonal: row.puedeGestionarPersonal,
      puedeVerAsignaciones: row.puedeVerAsignaciones,
      puedeGestionarAsignaciones: row.puedeGestionarAsignaciones,
      puedeVerSeguridad: row.puedeVerSeguridad,
      puedeGestionarUsuarios: row.puedeGestionarUsuarios,
      puedeVerOperacion: row.puedeVerOperacion,
      puedeVerPlanificacion: row.puedeVerPlanificacion,
      puedeEditarPlanificacion: row.puedeEditarPlanificacion,
      puedeAprobarPlanificacion: row.puedeAprobarPlanificacion,
      puedeVerReportes: row.puedeVerReportes,
    }),
    capacidades: normalizeCapacidadesOperativas({
      verCalendarios: row.verCalendarios,
      gestionarCalendarios: row.gestionarCalendarios,
      verIncidenciasPersonales: row.verIncidenciasPersonales,
      gestionarIncidenciasPersonales: row.gestionarIncidenciasPersonales,
      gestionarTiposFeriado: row.gestionarTiposFeriado,
      verCargasHorarias: row.verCargasHorarias,
      gestionarCargasHorarias: row.gestionarCargasHorarias,
      verTurnos: row.verTurnos,
      crearPlanificacion: row.crearPlanificacion,
      editarPlanificacion: row.editarPlanificacion,
      enviarRevisionPlanificacion: row.enviarRevisionPlanificacion,
      volverBorradorPlanificacion: row.volverBorradorPlanificacion,
      aprobarPlanificacion: row.aprobarPlanificacion,
      cerrarPlanificacion: row.cerrarPlanificacion,
      exportarPlanificacion: row.exportarPlanificacion,
      exportarPlanificacionLote: row.exportarPlanificacionLote,
      gestionarCodigosOperativos: row.gestionarCodigosOperativos,
      gestionarTurnos: row.gestionarTurnos,
      gestionarServicios: row.gestionarServicios,
    }),
  };
}

function mapPermisosToPersistence(input: GuardarRolSeguridadInput) {
  return {
    puedeVerOrganizacion: input.permisos.puedeVerOrganizacion,
    puedeVerPersonal: input.permisos.puedeVerPersonal,
    puedeGestionarPersonal: input.permisos.puedeGestionarPersonal,
    puedeVerAsignaciones: input.permisos.puedeVerAsignaciones,
    puedeGestionarAsignaciones: input.permisos.puedeGestionarAsignaciones,
    puedeVerSeguridad: input.permisos.puedeVerSeguridad,
    puedeGestionarUsuarios: input.permisos.puedeGestionarUsuarios,
    puedeVerOperacion: input.permisos.puedeVerOperacion,
    puedeVerPlanificacion: input.permisos.puedeVerPlanificacion,
    puedeEditarPlanificacion: input.permisos.puedeEditarPlanificacion,
    puedeAprobarPlanificacion: input.permisos.puedeAprobarPlanificacion,
    puedeVerReportes: input.permisos.puedeVerReportes,
  };
}

function mapCapacidadesToPersistence(input: GuardarRolSeguridadInput) {
  return {
    verCalendarios: input.capacidades.verCalendarios,
    gestionarCalendarios: input.capacidades.gestionarCalendarios,
    verIncidenciasPersonales: input.capacidades.verIncidenciasPersonales,
    gestionarIncidenciasPersonales:
      input.capacidades.gestionarIncidenciasPersonales,
    gestionarTiposFeriado: input.capacidades.gestionarTiposFeriado,
    verCargasHorarias: input.capacidades.verCargasHorarias,
    gestionarCargasHorarias: input.capacidades.gestionarCargasHorarias,
    verTurnos: input.capacidades.verTurnos,
    crearPlanificacion: input.capacidades.crearPlanificacion,
    editarPlanificacion: input.capacidades.editarPlanificacion,
    enviarRevisionPlanificacion: input.capacidades.enviarRevisionPlanificacion,
    volverBorradorPlanificacion: input.capacidades.volverBorradorPlanificacion,
    aprobarPlanificacion: input.capacidades.aprobarPlanificacion,
    cerrarPlanificacion: input.capacidades.cerrarPlanificacion,
    exportarPlanificacion: input.capacidades.exportarPlanificacion,
    exportarPlanificacionLote: input.capacidades.exportarPlanificacionLote,
    gestionarCodigosOperativos: input.capacidades.gestionarCodigosOperativos,
    gestionarTurnos: input.capacidades.gestionarTurnos,
    gestionarServicios: input.capacidades.gestionarServicios,
  };
}
