import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import { ListarPersonalQueryDto } from '../../dto/listar-personal-query.dto';
import { PersonalDetalleResponseDto } from '../../dto/personal-detalle-response.dto';
import { PersonalAccessPolicyService } from './personal-access-policy.service';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'actor.test',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'actor.test',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 1,
      codigo: 'JEFE_DEPARTAMENTO',
      nombre: 'Jefe de departamento',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'DEPARTAMENTO',
    puedeGestionarPlanificacion: false,
    puedeGestionarTodo: false,
    permisos: {
      puedeVerOrganizacion: true,
      puedeVerPersonal: true,
      puedeGestionarPersonal: false,
      puedeVerAsignaciones: true,
      puedeGestionarAsignaciones: false,
      puedeVerSeguridad: false,
      puedeGestionarUsuarios: false,
      puedeVerOperacion: true,
      puedeVerPlanificacion: true,
      puedeEditarPlanificacion: true,
      puedeAprobarPlanificacion: false,
      puedeVerReportes: false,
    },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildDetalle(
  overrides: Partial<PersonalDetalleResponseDto>,
): PersonalDetalleResponseDto {
  return {
    id: 1,
    codigoPersonal: 'PER-001',
    nombres: 'Ana',
    apellidoPaterno: 'Rojas',
    apellidoMaterno: null,
    documentoIdentidad: '1000001',
    nombreCompleto: 'Ana Rojas',
    activo: true,
    cargoActual: null,
    usuario: null,
    rolFuncionalActual: null,
    servicioActual: null,
    departamentoActual: null,
    asignacionesVigentes: [],
    asignacionesHistoricas: [],
    ...overrides,
  };
}

describe('PersonalAccessPolicyService', () => {
  const service = new PersonalAccessPolicyService();

  describe('scopeQuery', () => {
    it('no acota nada para un actor de alcance SISTEMA', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });
      const query = new ListarPersonalQueryDto();
      query.idDepartamento = 99;

      expect(service.scopeQuery(actor, query)).toBe(query);
    });

    it('fija el unico departamento gestionable si el actor no envia filtro', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [],
      });
      const query = new ListarPersonalQueryDto();

      const scoped = service.scopeQuery(actor, query);

      expect(scoped.idDepartamento).toBe(5);
    });

    it('reemplaza un id_departamento fuera de alcance por el primero gestionable', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });
      const query = new ListarPersonalQueryDto();
      query.idDepartamento = 999;

      const scoped = service.scopeQuery(actor, query);

      expect(scoped.idDepartamento).toBe(5);
    });

    it('limpia el id_servicio si no pertenece a los servicios gestionables del jefe de departamento', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [
          {
            id: 10,
            idDepartamento: 5,
            codigo: 'URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'ENF',
            nombreDepartamento: 'Enfermeria',
          },
        ],
      });
      const query = new ListarPersonalQueryDto();
      query.idDepartamento = 5;
      query.idServicio = 999;

      const scoped = service.scopeQuery(actor, query);

      expect(scoped.idServicio).toBeUndefined();
      expect(scoped.id_servicio).toBeUndefined();
    });

    it('fija el unico servicio gestionable para un actor de alcance SERVICIO', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        departamentosGestionables: [],
        serviciosGestionables: [
          {
            id: 10,
            idDepartamento: 5,
            codigo: 'URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'ENF',
            nombreDepartamento: 'Enfermeria',
          },
        ],
      });
      const query = new ListarPersonalQueryDto();

      const scoped = service.scopeQuery(actor, query);

      expect(scoped.idServicio).toBe(10);
    });

    it('reemplaza un id_servicio fuera de alcance por el unico servicio gestionable', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        departamentosGestionables: [],
        serviciosGestionables: [
          {
            id: 10,
            idDepartamento: 5,
            codigo: 'URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'ENF',
            nombreDepartamento: 'Enfermeria',
          },
        ],
      });
      const query = new ListarPersonalQueryDto();
      query.idServicio = 999;

      const scoped = service.scopeQuery(actor, query);

      expect(scoped.idServicio).toBe(10);
    });
  });

  describe('assertPuedeVerDetalle', () => {
    it('permite a un actor SISTEMA ver cualquier detalle', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });
      const detalle = buildDetalle({});

      expect(() => service.assertPuedeVerDetalle(actor, detalle)).not.toThrow();
    });

    it('permite a un jefe de departamento ver personal de su departamento actual', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });
      const detalle = buildDetalle({
        departamentoActual: { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
      });

      expect(() => service.assertPuedeVerDetalle(actor, detalle)).not.toThrow();
    });

    it('permite a un jefe de departamento ver personal con una asignacion vigente en su departamento', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });
      const detalle = buildDetalle({
        departamentoActual: { id: 7, codigo: 'MED', nombre: 'Medicina' },
        asignacionesVigentes: [{ idDepartamento: 5 } as never],
      });

      expect(() => service.assertPuedeVerDetalle(actor, detalle)).not.toThrow();
    });

    it('rechaza a un jefe de departamento que consulta personal fuera de su departamento', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });
      const detalle = buildDetalle({
        departamentoActual: { id: 7, codigo: 'MED', nombre: 'Medicina' },
      });

      expect(() => service.assertPuedeVerDetalle(actor, detalle)).toThrow(
        ForbiddenException,
      );
    });

    it('rechaza a un jefe de servicio que consulta personal fuera de su servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        departamentosGestionables: [],
        serviciosGestionables: [
          {
            id: 10,
            idDepartamento: 5,
            codigo: 'URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'ENF',
            nombreDepartamento: 'Enfermeria',
          },
        ],
      });
      const detalle = buildDetalle({
        servicioActual: { id: 20, codigo: 'URG', nombre: 'Urgencias' },
      });

      expect(() => service.assertPuedeVerDetalle(actor, detalle)).toThrow(
        ForbiddenException,
      );
    });

    it('permite a un jefe de servicio ver personal con una asignacion vigente en su servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        departamentosGestionables: [],
        serviciosGestionables: [
          {
            id: 10,
            idDepartamento: 5,
            codigo: 'URG',
            nombre: 'Urgencias',
            codigoDepartamento: 'ENF',
            nombreDepartamento: 'Enfermeria',
          },
        ],
      });
      const detalle = buildDetalle({
        servicioActual: { id: 20, codigo: 'URG', nombre: 'Urgencias' },
        asignacionesVigentes: [{ idServicio: 10 } as never],
      });

      expect(() => service.assertPuedeVerDetalle(actor, detalle)).not.toThrow();
    });
  });
});
