import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { AsignacionConsulta } from '../../../domain/entities/asignacion-consulta';
import type { RolFuncionalBase } from '../../../domain/entities/rol-funcional-base';
import { PersonalRepository } from '../../../domain/repositories/personal.repository';
import { CrearAsignacionDto } from '../../dto/crear-asignacion.dto';
import { AsignacionAccessPolicyService } from './asignacion-access-policy.service';

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
      puedeVerOrganizacion: false,
      puedeVerPersonal: false,
      puedeGestionarPersonal: false,
      puedeVerAsignaciones: true,
      puedeGestionarAsignaciones: true,
      puedeVerSeguridad: false,
      puedeGestionarUsuarios: false,
      puedeVerOperacion: true,
      puedeVerPlanificacion: true,
      puedeEditarPlanificacion: true,
      puedeAprobarPlanificacion: true,
      puedeVerReportes: false,
    },
    departamentosGestionables: [{ id: 5, codigo: 'ENF', nombre: 'Enfermeria' }],
    serviciosGestionables: [],
    ...overrides,
  };
}

const DEPARTAMENTO_ENF = { id: 5, codigo: 'ENF', nombre: 'Enfermeria' };
const SERVICIO_URG = {
  id: 10,
  idDepartamento: 5,
  codigo: 'URG',
  nombre: 'Urgencias',
  codigoDepartamento: 'ENF',
  nombreDepartamento: 'Enfermeria',
};
const SERVICIO_QUIRO = {
  id: 20,
  idDepartamento: 7,
  codigo: 'QUIRO',
  nombre: 'Quirofano',
  codigoDepartamento: 'CIR',
  nombreDepartamento: 'Cirugia',
};

const ROL_ASISTENCIAL: RolFuncionalBase = {
  id: 1,
  codigo: 'ASISTENCIAL',
  nombre: 'Asistencial',
  alcanceOrganizativo: 'SERVICIO',
  esJefatura: false,
  activo: true,
};

const ROL_JEFE_SERVICIO: RolFuncionalBase = {
  id: 2,
  codigo: 'JEFE_SERVICIO',
  nombre: 'Jefe de servicio',
  alcanceOrganizativo: 'SERVICIO',
  esJefatura: true,
  activo: true,
};

const ROL_JEFE_DEPARTAMENTO: RolFuncionalBase = {
  id: 3,
  codigo: 'JEFE_DEPARTAMENTO',
  nombre: 'Jefe de departamento',
  alcanceOrganizativo: 'DEPARTAMENTO',
  esJefatura: true,
  activo: true,
};

function buildJefeDepartamentoActor(
  overrides: Partial<UsuarioSesionResponseDto> = {},
): UsuarioSesionResponseDto {
  return buildActor({
    departamentosGestionables: [DEPARTAMENTO_ENF],
    serviciosGestionables: [SERVICIO_URG],
    ...overrides,
  });
}

function buildCrearInput(
  overrides: Partial<CrearAsignacionDto> = {},
): CrearAsignacionDto {
  return {
    idPersonal: 100,
    idTipoContrato: 1,
    idCargaHoraria: 1,
    idRolFuncional: ROL_ASISTENCIAL.id,
    tipoAsignacion: 'SECUNDARIA',
    fechaInicio: '2026-07-01',
    ...overrides,
  };
}

function buildAsignacionActual(
  overrides: Partial<AsignacionConsulta> = {},
): AsignacionConsulta {
  return {
    id: 900,
    idPersonal: 100,
    codigoPersonal: 'ENF-002',
    ci: '1234567',
    apellidoPaterno: 'Perez',
    apellidoMaterno: null,
    nombres: 'Ana',
    nombreCompleto: 'Ana Perez',
    idServicio: SERVICIO_URG.id,
    codigoServicio: SERVICIO_URG.codigo,
    nombreServicio: SERVICIO_URG.nombre,
    idDepartamento: DEPARTAMENTO_ENF.id,
    codigoDepartamento: DEPARTAMENTO_ENF.codigo,
    nombreDepartamento: DEPARTAMENTO_ENF.nombre,
    nombreNivelCargo: null,
    idTipoContrato: 1,
    codigoTipoContrato: null,
    nombreTipoContrato: null,
    idRolFuncional: ROL_ASISTENCIAL.id,
    codigoRolFuncional: ROL_ASISTENCIAL.codigo,
    nombreRolFuncional: ROL_ASISTENCIAL.nombre,
    esJefaturaRolFuncional: false,
    codigoFuenteItem: null,
    idCargaHoraria: null,
    codigoCargaHoraria: null,
    nombreCargaHoraria: null,
    nroItem: null,
    tipoAsignacion: 'SECUNDARIA',
    fechaInicio: new Date('2026-07-01'),
    fechaFin: null,
    activo: true,
    tieneUsuario: false,
    ...overrides,
  };
}

function buildRepository(
  overrides: {
    rolFuncional?: RolFuncionalBase | null;
    asignacion?: AsignacionConsulta | null;
  } = {},
) {
  const obtenerRolFuncionalPorId = jest
    .fn()
    .mockResolvedValue(
      overrides.rolFuncional === undefined
        ? ROL_ASISTENCIAL
        : overrides.rolFuncional,
    );
  const obtenerAsignacionPorId = jest
    .fn()
    .mockResolvedValue(
      overrides.asignacion === undefined
        ? buildAsignacionActual()
        : overrides.asignacion,
    );
  // Mocks devueltos por separado (en vez de leerlos como repository.metodo) para
  // no disparar @typescript-eslint/unbound-method al usarlos en toHaveBeenCalled.
  const repository = {
    obtenerRolFuncionalPorId,
    obtenerAsignacionPorId,
  } as unknown as PersonalRepository;

  return { repository, obtenerRolFuncionalPorId, obtenerAsignacionPorId };
}

describe('AsignacionAccessPolicyService', () => {
  // El repositorio no se usa en assertPuedeCerrar (ya no necesita resolver la
  // asignacion objetivo), pero el servicio lo requiere en el constructor.
  const service = new AsignacionAccessPolicyService({} as PersonalRepository);

  describe('assertPuedeCerrar', () => {
    it('permite a un actor con alcance SISTEMA cerrar asignaciones', () => {
      const actor = buildActor({
        rolSeguridad: {
          id: 1,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador',
        },
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      expect(() => service.assertPuedeCerrar(actor)).not.toThrow();
    });

    it('rechaza a un jefe de departamento aunque tenga permiso de gestionar asignaciones', () => {
      const actor = buildActor({
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_DEPARTAMENTO',
          nombre: 'Jefe de departamento',
        },
        alcancePlanificacion: 'DEPARTAMENTO',
      });

      expect(() => service.assertPuedeCerrar(actor)).toThrow(
        ForbiddenException,
      );
    });

    it('rechaza a un actor sin permiso de gestionar asignaciones', () => {
      const actor = buildActor({
        rolSeguridad: {
          id: 1,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador',
        },
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
        permisos: {
          puedeVerOrganizacion: false,
          puedeVerPersonal: false,
          puedeGestionarPersonal: false,
          puedeVerAsignaciones: true,
          puedeGestionarAsignaciones: false,
          puedeVerSeguridad: false,
          puedeGestionarUsuarios: false,
          puedeVerOperacion: true,
          puedeVerPlanificacion: true,
          puedeEditarPlanificacion: true,
          puedeAprobarPlanificacion: true,
          puedeVerReportes: false,
        },
      });

      expect(() => service.assertPuedeCerrar(actor)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertPuedeCrear', () => {
    it('rechaza sin importar el alcance si el actor no tiene puedeGestionarAsignaciones', async () => {
      const { repository, obtenerRolFuncionalPorId } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildActor({
        rolSeguridad: {
          id: 3,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador',
        },
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
        permisos: {
          ...buildActor({}).permisos,
          puedeGestionarAsignaciones: false,
        },
      });

      await expect(
        service2.assertPuedeCrear(actor, buildCrearInput()),
      ).rejects.toThrow(ForbiddenException);
      expect(obtenerRolFuncionalPorId).not.toHaveBeenCalled();
    });

    it('permite a SISTEMA crear sin ninguna otra validacion de alcance/rol', async () => {
      const { repository, obtenerRolFuncionalPorId } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildActor({
        rolSeguridad: {
          id: 3,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador',
        },
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      await expect(
        service2.assertPuedeCrear(
          actor,
          buildCrearInput({
            idDepartamento: 999,
            idRolFuncional: ROL_JEFE_DEPARTAMENTO.id,
          }),
        ),
      ).resolves.toBeUndefined();
      expect(obtenerRolFuncionalPorId).not.toHaveBeenCalled();
    });

    it('permite a un jefe de departamento crear una asignacion en su propio departamento (idDepartamento explicito)', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({ idDepartamento: DEPARTAMENTO_ENF.id }),
        ),
      ).resolves.toBeUndefined();
    });

    it('permite a un jefe de departamento crear una asignacion indicando idServicio (resuelve el departamento via serviciosGestionables)', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({ idServicio: SERVICIO_URG.id }),
        ),
      ).resolves.toBeUndefined();
    });

    it('permite a un jefe de departamento asignar el rol funcional JEFE_SERVICIO', async () => {
      const { repository } = buildRepository({
        rolFuncional: ROL_JEFE_SERVICIO,
      });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({
            idDepartamento: DEPARTAMENTO_ENF.id,
            idRolFuncional: ROL_JEFE_SERVICIO.id,
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('rechaza a un jefe de departamento crear en un departamento fuera de su alcance', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({ idDepartamento: 7 }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de departamento crear sin poder resolver el departamento objetivo (idServicio ajeno)', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({ idServicio: SERVICIO_QUIRO.id }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de departamento asignar el rol funcional JEFE_DEPARTAMENTO (la jefatura de departamento nunca se otorga por esta via)', async () => {
      const { repository } = buildRepository({
        rolFuncional: ROL_JEFE_DEPARTAMENTO,
      });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({
            idDepartamento: DEPARTAMENTO_ENF.id,
            idRolFuncional: ROL_JEFE_DEPARTAMENTO.id,
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el rol funcional indicado no existe en el catalogo', async () => {
      const { repository } = buildRepository({ rolFuncional: null });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeCrear(
          buildJefeDepartamentoActor(),
          buildCrearInput({ idDepartamento: DEPARTAMENTO_ENF.id }),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza a un jefe de servicio crear asignaciones (esta operacion no es suya)', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildActor({
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        alcancePlanificacion: 'SERVICIO',
        departamentosGestionables: [],
        serviciosGestionables: [SERVICIO_URG],
      });

      await expect(
        service2.assertPuedeCrear(
          actor,
          buildCrearInput({ idServicio: SERVICIO_URG.id }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un actor sin alcance (LECTURA) crear asignaciones', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildActor({
        rolSeguridad: { id: 4, codigo: 'RRHH', nombre: 'Recursos humanos' },
        alcancePlanificacion: 'LECTURA',
        departamentosGestionables: [],
        serviciosGestionables: [],
      });

      await expect(
        service2.assertPuedeCrear(actor, buildCrearInput()),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeModificar', () => {
    it('permite a SISTEMA modificar cualquier asignacion sin otra validacion', async () => {
      const { repository, obtenerAsignacionPorId } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildActor({
        rolSeguridad: {
          id: 3,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador',
        },
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
      });

      await expect(
        service2.assertPuedeModificar(actor, 900, buildCrearInput()),
      ).resolves.toBeUndefined();
      expect(obtenerAsignacionPorId).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si la asignacion a modificar no existe', async () => {
      const { repository } = buildRepository({ asignacion: null });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          999,
          buildCrearInput(),
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('permite a un jefe de departamento modificar una asignacion propia (mismo departamento)', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          900,
          buildCrearInput({ idDepartamento: DEPARTAMENTO_ENF.id }),
        ),
      ).resolves.toBeUndefined();
    });

    it('REGRESION: rechaza a un jefe de departamento modificar una asignacion que HOY pertenece a otro departamento, aunque proponga moverla a su propio departamento', async () => {
      // assertDepartamentoDentroDeAlcance se llama tanto con actual.idDepartamento
      // (el departamento actual de la asignacion) como con idDepartamentoObjetivo
      // (el propuesto) — ambos deben estar dentro del alcance del actor. Si solo se
      // validara el objetivo, un jefe de departamento podria "robar" asignaciones
      // ajenas con solo declarar que las mueve a su propio departamento.
      const { repository } = buildRepository({
        asignacion: buildAsignacionActual({ idDepartamento: 7 }),
      });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          900,
          buildCrearInput({ idDepartamento: DEPARTAMENTO_ENF.id }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de departamento mover una asignacion propia hacia un departamento ajeno', async () => {
      const { repository } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          900,
          buildCrearInput({ idDepartamento: 7 }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de departamento modificar una asignacion que actualmente es JEFE_DEPARTAMENTO', async () => {
      const { repository } = buildRepository({
        asignacion: buildAsignacionActual({
          idRolFuncional: ROL_JEFE_DEPARTAMENTO.id,
          codigoRolFuncional: ROL_JEFE_DEPARTAMENTO.codigo,
        }),
      });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          900,
          buildCrearInput({ idDepartamento: DEPARTAMENTO_ENF.id }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de departamento reasignar el rol funcional a JEFE_DEPARTAMENTO', async () => {
      const { repository } = buildRepository({
        rolFuncional: ROL_JEFE_DEPARTAMENTO,
      });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          900,
          buildCrearInput({
            idDepartamento: DEPARTAMENTO_ENF.id,
            idRolFuncional: ROL_JEFE_DEPARTAMENTO.id,
          }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a un jefe de departamento reasignar el rol funcional a JEFE_SERVICIO', async () => {
      const { repository } = buildRepository({
        rolFuncional: ROL_JEFE_SERVICIO,
      });
      const service2 = new AsignacionAccessPolicyService(repository);

      await expect(
        service2.assertPuedeModificar(
          buildJefeDepartamentoActor(),
          900,
          buildCrearInput({
            idDepartamento: DEPARTAMENTO_ENF.id,
            idRolFuncional: ROL_JEFE_SERVICIO.id,
          }),
        ),
      ).resolves.toBeUndefined();
    });

    it('rechaza a un actor sin puedeGestionarAsignaciones modificar, sin llegar a consultar el repositorio', async () => {
      const { repository, obtenerAsignacionPorId } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildJefeDepartamentoActor({
        permisos: {
          ...buildActor({}).permisos,
          puedeGestionarAsignaciones: false,
        },
      });

      await expect(
        service2.assertPuedeModificar(actor, 900, buildCrearInput()),
      ).rejects.toThrow(ForbiddenException);
      expect(obtenerAsignacionPorId).not.toHaveBeenCalled();
    });

    it('rechaza a un jefe de servicio modificar asignaciones (esta operacion no es suya)', async () => {
      const { repository, obtenerAsignacionPorId } = buildRepository();
      const service2 = new AsignacionAccessPolicyService(repository);
      const actor = buildActor({
        rolSeguridad: {
          id: 2,
          codigo: 'JEFE_SERVICIO',
          nombre: 'Jefe de servicio',
        },
        alcancePlanificacion: 'SERVICIO',
        departamentosGestionables: [],
        serviciosGestionables: [SERVICIO_URG],
      });

      await expect(
        service2.assertPuedeModificar(actor, 900, buildCrearInput()),
      ).rejects.toThrow(ForbiddenException);
      expect(obtenerAsignacionPorId).not.toHaveBeenCalled();
    });
  });
});
