import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import { OperacionAccessPolicyService } from './operacion-access-policy.service';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'jefe.departamento',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'jefe.departamento',
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

describe('OperacionAccessPolicyService', () => {
  const service = new OperacionAccessPolicyService();

  describe('assertPuedeGestionarConfiguracionOperativaDepartamento', () => {
    it('permite a un jefe de departamento gestionar su propio departamento', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaDepartamento(
          actor,
          5,
        ),
      ).not.toThrow();
    });

    it('rechaza gestionar un departamento fuera de alcance', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaDepartamento(
          actor,
          7,
        ),
      ).toThrow(ForbiddenException);
    });

    it('no se deja enganar por una coincidencia numerica con un servicio gestionable (regresion del bug de metodo cruzado)', () => {
      // El actor gestiona el servicio 7, pero NO el departamento 7 (son ids de
      // dos tablas distintas que coinciden solo por casualidad numerica). Antes
      // del fix, guardar/obtener-configuracion-operativa-departamento.use-case
      // llamaban por error al assert de SERVICIO pasandole idDepartamento, lo
      // que hubiera permitido pasar esta validacion incorrectamente.
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [{ id: 7, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaDepartamento(
          actor,
          7,
        ),
      ).toThrow(ForbiddenException);
    });

    it('permite a un actor de alcance SISTEMA gestionar cualquier departamento', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaDepartamento(
          actor,
          999,
        ),
      ).not.toThrow();
    });
  });

  describe('assertPuedeGestionarIncidenciasPersonales', () => {
    it('permite a un actor de alcance SISTEMA con la capacidad activa', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
        capacidades: {
          gestionarIncidenciasPersonales: true,
        } as UsuarioSesionResponseDto['capacidades'],
      });

      expect(() =>
        service.assertPuedeGestionarIncidenciasPersonales(actor),
      ).not.toThrow();
    });

    it('rechaza a un jefe de departamento aunque tenga la capacidad activa (catalogo global, exige alcance SISTEMA)', () => {
      const actor = buildActor({
        capacidades: {
          gestionarIncidenciasPersonales: true,
        } as UsuarioSesionResponseDto['capacidades'],
      });

      expect(() =>
        service.assertPuedeGestionarIncidenciasPersonales(actor),
      ).toThrow(ForbiddenException);
    });

    it('rechaza a un actor de alcance SISTEMA sin la capacidad activa', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
        capacidades: {
          gestionarIncidenciasPersonales: false,
        } as UsuarioSesionResponseDto['capacidades'],
      });

      expect(() =>
        service.assertPuedeGestionarIncidenciasPersonales(actor),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeGestionarConfiguracionOperativaServicio', () => {
    it('permite a un jefe de servicio gestionar su propio servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaServicio(actor, 10),
      ).not.toThrow();
    });

    it('rechaza gestionar un servicio fuera de alcance', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaServicio(actor, 999),
      ).toThrow(ForbiddenException);
    });

    it('permite a un actor de alcance SISTEMA gestionar cualquier servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaServicio(actor, 999),
      ).not.toThrow();
    });

    it('rechaza aunque el servicio este en la lista, si el actor no es jefatura de servicio ni de departamento (defensivo)', () => {
      // No deberia ocurrir con los actores reales que arma TypeOrmUsuarioRepository,
      // pero la funcion no debe confiar solo en la lista de servicios gestionables:
      // tambien exige que el rolSeguridad sea una jefatura.
      const actor = buildActor({
        rolSeguridad: { id: 4, codigo: 'RRHH', nombre: 'Recursos humanos' },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarConfiguracionOperativaServicio(actor, 10),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeGestionarTiposTurno', () => {
    it('permite solo a un actor de alcance SISTEMA', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() => service.assertPuedeGestionarTiposTurno(actor)).not.toThrow();
    });

    it('rechaza a un jefe de departamento (el catalogo de tipos de turno es global)', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() => service.assertPuedeGestionarTiposTurno(actor)).toThrow(
        ForbiddenException,
      );
    });

    it('rechaza a un jefe de servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() => service.assertPuedeGestionarTiposTurno(actor)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertPuedeGestionarTurnoServicio', () => {
    it('permite a un actor de alcance SISTEMA gestionar cualquier servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() =>
        service.assertPuedeGestionarTurnoServicio(actor, 999),
      ).not.toThrow();
    });

    it('permite a un jefe de servicio gestionar el turno de su propio servicio', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarTurnoServicio(actor, 10),
      ).not.toThrow();
    });

    it('permite a un jefe de departamento gestionar el turno de un servicio de su propio departamento', () => {
      // TypeOrmUsuarioRepository expande serviciosGestionables con todos los
      // servicios del departamento para alcance DEPARTAMENTO — replicado aqui.
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarTurnoServicio(actor, 10),
      ).not.toThrow();
    });

    it('rechaza gestionar el turno de un servicio fuera de alcance', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarTurnoServicio(actor, 999),
      ).toThrow(ForbiddenException);
    });

    it('rechaza aunque el servicio este en la lista, si el actor no es jefatura de servicio ni de departamento (defensivo)', () => {
      const actor = buildActor({
        rolSeguridad: { id: 4, codigo: 'RRHH', nombre: 'Recursos humanos' },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarTurnoServicio(actor, 10),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeGestionarTurnoDepartamento', () => {
    it('permite a un actor de alcance SISTEMA gestionar cualquier departamento', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() =>
        service.assertPuedeGestionarTurnoDepartamento(actor, 999),
      ).not.toThrow();
    });

    it('permite a un jefe de departamento gestionar el turno de su propio departamento', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeGestionarTurnoDepartamento(actor, 5),
      ).not.toThrow();
    });

    it('rechaza a un jefe de servicio (nunca es jefatura de departamento, aunque el id coincida con el de su servicio)', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeGestionarTurnoDepartamento(actor, 5),
      ).toThrow(ForbiddenException);
    });

    it('rechaza gestionar un departamento fuera de alcance', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeGestionarTurnoDepartamento(actor, 7),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeVerTurno (solo lectura, mas laxo que gestionar)', () => {
    it('permite a SISTEMA ver cualquier turno', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() =>
        service.assertPuedeVerTurno(actor, {
          idServicio: 999,
          idDepartamento: null,
        }),
      ).not.toThrow();
    });

    it('permite ver un turno de servicio a un jefe de departamento aunque no sea jefatura de ESE servicio (chequeo mas laxo)', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeVerTurno(actor, {
          idServicio: 10,
          idDepartamento: 5,
        }),
      ).not.toThrow();
    });

    it('permite ver un turno de departamento (sin servicio) a un jefe de departamento dentro de su alcance', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeVerTurno(actor, {
          idServicio: null,
          idDepartamento: 5,
        }),
      ).not.toThrow();
    });

    it('rechaza ver un turno de un servicio fuera de alcance', () => {
      const actor = buildActor({
        alcancePlanificacion: 'SERVICIO',
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
      } as Partial<UsuarioSesionResponseDto>);

      expect(() =>
        service.assertPuedeVerTurno(actor, {
          idServicio: 999,
          idDepartamento: 7,
        }),
      ).toThrow(ForbiddenException);
    });

    it('rechaza un turno sin idServicio ni idDepartamento (dato inconsistente, no hay alcance que verificar)', () => {
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeVerTurno(actor, {
          idServicio: null,
          idDepartamento: null,
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
