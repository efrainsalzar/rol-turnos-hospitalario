import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { PlanificacionRepository } from '../../../domain/repositories/planificacion.repository';
import type { Planificacion } from '../../../domain/entities/planificacion';
import { ListarPlanificacionesQueryDto } from '../../dto/listar-planificaciones-query.dto';
import { PlanificacionAccessPolicyService } from './planificacion-access-policy.service';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'jefe.departamento.enfermeria',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'jefe.departamento.enfermeria',
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
    // Jefe de departamento ya no aprueba ni cierra (docs/database/decisiones-
    // tecnicas.md seccion 147, migracion 016) — sigue pudiendo enviar a
    // revision y devolver a borrador.
    capacidades: {
      crearPlanificacion: true,
      editarPlanificacion: true,
      enviarRevisionPlanificacion: true,
      volverBorradorPlanificacion: true,
      aprobarPlanificacion: false,
      cerrarPlanificacion: false,
    } as UsuarioSesionResponseDto['capacidades'],
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildPlanificacionDepartamento(
  overrides: Partial<Planificacion>,
): Planificacion {
  return {
    id: 1,
    idServicio: null,
    idDepartamento: 5,
    codigoDepartamento: 'ENF',
    nombreDepartamento: 'Enfermeria',
    codigoServicio: null,
    nombreServicio: null,
    cantidadPersonalPlanificable: 10,
    anio: 2026,
    mes: 7,
    version: 1,
    estado: 'BORRADOR',
    activo: true,
    fechaInicio: new Date('2026-07-01'),
    fechaFin: new Date('2026-07-31'),
    fechaPublicacion: null,
    fechaCierre: null,
    createdAt: new Date('2026-07-01'),
    updatedAt: new Date('2026-07-01'),
    ...overrides,
  };
}

describe('PlanificacionAccessPolicyService — alcance departamental', () => {
  // Las fixtures son de julio 2026: se fija la fecha para que no dependan del
  // dia en que se corran (vencimiento y ventana visible de jefaturas).
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T12:00:00-04:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function buildService(planificacion: Planificacion | null) {
    const repositoryMock = {
      obtenerPorId: jest.fn().mockResolvedValue(planificacion),
    } as unknown as PlanificacionRepository;
    return new PlanificacionAccessPolicyService(repositoryMock);
  }

  describe('assertPuedeGestionarServicio (planificacion departamental)', () => {
    it('permite a un jefe de departamento gestionar la planificacion de su propio departamento', () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeGestionarServicio(actor, null, 'gestionar', 5),
      ).not.toThrow();
    });

    it('REGRESION: rechaza a un jefe de departamento que intenta gestionar la planificacion de OTRO departamento', () => {
      // Antes del fix, assertPuedeGestionarServicio solo comprobaba
      // isDepartamentoHead(actor) sin verificar a que departamento
      // pertenecia la planificacion — cualquier JEFE_DEPARTAMENTO podia
      // gestionar la planificacion departamental de cualquier otro
      // departamento del hospital.
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeGestionarServicio(actor, null, 'gestionar', 7),
      ).toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de servicio gestionar una planificacion departamental (no es jefatura de departamento)', () => {
      const service = buildService(null);
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

      expect(() =>
        service.assertPuedeGestionarServicio(actor, null, 'gestionar', 5),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeCrearPlanificacion (alcance departamental)', () => {
    it('permite crear una planificacion para el propio departamento', () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, undefined, 5),
      ).not.toThrow();
    });

    it('REGRESION: rechaza crear una planificacion para un departamento fuera de alcance', () => {
      // Antes del fix, idDepartamento nunca se validaba en la creacion: el
      // chequeo solo se ejecutaba "if (idServicio !== undefined)", por lo que
      // crear con solo idDepartamento se saltaba toda validacion de alcance.
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, undefined, 7),
      ).toThrow(ForbiddenException);
    });

    it('permite a un jefe de departamento crear una planificacion de un servicio de su propio departamento', () => {
      // Diseno confirmado por el usuario 2026-07-08: un JEFE_DEPARTAMENTO
      // puede crear tanto el borrador de su departamento como el de
      // cualquiera de los servicios que le pertenecen. serviciosGestionables
      // ya se expande con todos los servicios del departamento en
      // TypeOrmUsuarioRepository (alcancePlanificacion === 'DEPARTAMENTO').
      const service = buildService(null);
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

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, 10, undefined),
      ).not.toThrow();
    });

    it('rechaza a un jefe de departamento crear una planificacion de un servicio fuera de su departamento', () => {
      const service = buildService(null);
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

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, 99, undefined),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertPuedeCrearPlanificacion (alcance de servicio)', () => {
    function buildActorServicio(
      overrides: Partial<UsuarioSesionResponseDto> = {},
    ): UsuarioSesionResponseDto {
      return buildActor({
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
        ...overrides,
      });
    }

    it('permite a un jefe de servicio crear la planificacion de su propio servicio', () => {
      const service = buildService(null);
      const actor = buildActorServicio();

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, 10, undefined),
      ).not.toThrow();
    });

    it('rechaza a un jefe de servicio crear la planificacion de otro servicio', () => {
      const service = buildService(null);
      const actor = buildActorServicio();

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, 99, undefined),
      ).toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de servicio crear una planificacion de alcance departamental, aunque sea el departamento de su propio servicio', () => {
      // Un JEFE_SERVICIO nunca es jefatura de departamento (isDepartamentoHead
      // es false), asi que assertPuedeGestionarServicio(actor, null, ...)
      // siempre lo rechaza sin importar el id_departamento enviado.
      const service = buildService(null);
      const actor = buildActorServicio();

      expect(() =>
        service.assertPuedeCrearPlanificacion(actor, undefined, 5),
      ).toThrow(ForbiddenException);
    });
  });

  describe('scopeListado (alcance departamental)', () => {
    it('sin filtro explicito, restringe la consulta SQL al propio departamento', () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      const filtro = service.scopeListado(
        actor,
        new ListarPlanificacionesQueryDto(),
      );

      expect(filtro.idDepartamento).toBe(5);
      expect(filtro.idServicio).toBeUndefined();
    });

    it('REGRESION: rechaza consultar el departamento de otra jefatura', () => {
      // Antes del fix, GET /v1/planificaciones traia todo lo que matcheaba el
      // filtro crudo y recien despues recortaba en memoria con
      // filtrarPlanificaciones — un id_departamento ajeno nunca se rechazaba
      // explicitamente, solo terminaba filtrado a una lista vacia.
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });
      const query = new ListarPlanificacionesQueryDto();
      query.id_departamento = 7;

      expect(() => service.scopeListado(actor, query)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertPuedeGestionarPlanificacion (usa el repositorio, cadena completa)', () => {
    it('REGRESION: rechaza ver/editar/publicar/cerrar la planificacion departamental de otro departamento', async () => {
      const planificacionAjena = buildPlanificacionDepartamento({
        idDepartamento: 7,
      });
      const service = buildService(planificacionAjena);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionAjena.id,
          'ver la planificacion',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite ver/editar la planificacion departamental del propio departamento', async () => {
      const planificacionPropia = buildPlanificacionDepartamento({
        idDepartamento: 5,
      });
      const service = buildService(planificacionPropia);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionPropia.id,
          'ver la planificacion',
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('assertPuedeCambiarEstadoPlanificacion (matriz de transicion por rol)', () => {
    function buildJefeServicioActor() {
      return buildActor({
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
    }

    // Usado por /publicar y /cerrar (POST) ademas de PATCH /:id/estado — este
    // es el hueco que permitia a un JEFE_SERVICIO llamar POST /:id/publicar
    // directo y saltarse la revision de su jefe de departamento, porque esos
    // dos endpoints solo validaban assertPuedeGestionarPlanificacion (alcance
    // generico) en vez de esta matriz.
    it('REGRESION: rechaza a un jefe de servicio publicar directo sin pasar por revision (BORRADOR->APROBADA)', async () => {
      const planificacionPropia: Planificacion = {
        ...buildPlanificacionDepartamento({}),
        idServicio: 10,
        idDepartamento: null,
        estado: 'BORRADOR',
      };
      const service = buildService(planificacionPropia);

      await expect(
        service.assertPuedeCambiarEstadoPlanificacion(
          buildJefeServicioActor(),
          planificacionPropia.id,
          'APROBADA',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a un jefe de servicio enviar a revision (BORRADOR->REVISION)', async () => {
      const planificacionPropia: Planificacion = {
        ...buildPlanificacionDepartamento({}),
        idServicio: 10,
        idDepartamento: null,
        estado: 'BORRADOR',
      };
      const service = buildService(planificacionPropia);

      await expect(
        service.assertPuedeCambiarEstadoPlanificacion(
          buildJefeServicioActor(),
          planificacionPropia.id,
          'REVISION',
        ),
      ).resolves.toBeUndefined();
    });

    it('REGRESION: rechaza a un jefe de servicio cerrar una planificacion aprobada (solo jefe de departamento puede)', async () => {
      const planificacionPropia: Planificacion = {
        ...buildPlanificacionDepartamento({}),
        idServicio: 10,
        idDepartamento: null,
        estado: 'APROBADA',
      };
      const service = buildService(planificacionPropia);

      await expect(
        service.assertPuedeCambiarEstadoPlanificacion(
          buildJefeServicioActor(),
          planificacionPropia.id,
          'CERRADA',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('REGRESION: rechaza a un jefe de departamento publicar tras revision — ya no aprueba, solo RRHH/Admin (REVISION->APROBADA)', async () => {
      const planificacionPropia = buildPlanificacionDepartamento({
        idDepartamento: 5,
        estado: 'REVISION',
      });
      const service = buildService(planificacionPropia);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeCambiarEstadoPlanificacion(
          actor,
          planificacionPropia.id,
          'APROBADA',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('REGRESION: rechaza a un jefe de departamento cerrar — ya no cierra, solo RRHH/Admin (APROBADA->CERRADA)', async () => {
      const planificacionPropia = buildPlanificacionDepartamento({
        idDepartamento: 5,
        estado: 'APROBADA',
      });
      const service = buildService(planificacionPropia);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeCambiarEstadoPlanificacion(
          actor,
          planificacionPropia.id,
          'CERRADA',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a RRHH/Admin aprobar y cerrar aunque un jefe de departamento ya no pueda', async () => {
      const planificacionRevision = buildPlanificacionDepartamento({
        idDepartamento: 5,
        estado: 'REVISION',
      });
      const service = buildService(planificacionRevision);
      const actorSistema = buildActor({
        rolSeguridad: {
          id: 3,
          codigo: 'ADMIN_SISTEMA',
          nombre: 'Administrador',
        },
        alcancePlanificacion: 'SISTEMA',
        puedeGestionarTodo: true,
        capacidades: {
          crearPlanificacion: true,
          editarPlanificacion: true,
          enviarRevisionPlanificacion: true,
          volverBorradorPlanificacion: true,
          aprobarPlanificacion: true,
          cerrarPlanificacion: true,
        } as UsuarioSesionResponseDto['capacidades'],
      });

      await expect(
        service.assertPuedeCambiarEstadoPlanificacion(
          actorSistema,
          planificacionRevision.id,
          'APROBADA',
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('ventana de periodo visible para jefaturas (mes anterior/actual/siguiente)', () => {
    const REFERENCE_DATE = new Date('2026-07-15T12:00:00-04:00'); // America/La_Paz, mes actual = 2026-07

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(REFERENCE_DATE);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('permite a un jefe de departamento VER una planificacion CERRADA del mes anterior (solo lectura)', async () => {
      const planificacionMesAnterior = buildPlanificacionDepartamento({
        idDepartamento: 5,
        anio: 2026,
        mes: 6,
        estado: 'CERRADA',
      });
      const service = buildService(planificacionMesAnterior);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionMesAnterior.id,
          'ver la planificacion',
        ),
      ).resolves.toBeUndefined();
    });

    it('permite a un jefe de servicio VER una planificacion CERRADA del mes anterior de su propio servicio', async () => {
      const planificacionMesAnterior: Planificacion = {
        ...buildPlanificacionDepartamento({}),
        idServicio: 10,
        idDepartamento: null,
        anio: 2026,
        mes: 6,
        estado: 'CERRADA',
      };
      const service = buildService(planificacionMesAnterior);
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

      await expect(
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionMesAnterior.id,
          'ver la planificacion',
        ),
      ).resolves.toBeUndefined();
    });

    it('rechaza a un jefe de departamento VER una planificacion de hace 2 meses (fuera de la ventana)', async () => {
      const planificacionAntigua = buildPlanificacionDepartamento({
        idDepartamento: 5,
        anio: 2026,
        mes: 5,
        estado: 'CERRADA',
      });
      const service = buildService(planificacionAntigua);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionAntigua.id,
          'ver la planificacion',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a un jefe de departamento VER (pero no editar) una planificacion APROBADA del mes siguiente', async () => {
      const planificacionMesSiguiente = buildPlanificacionDepartamento({
        idDepartamento: 5,
        anio: 2026,
        mes: 8,
        estado: 'APROBADA',
      });
      const service = buildService(planificacionMesSiguiente);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionMesSiguiente.id,
          'ver la planificacion',
        ),
      ).resolves.toBeUndefined();

      // "Ver" no implica "editar contenido": APROBADA sigue fuera del rango
      // editable (solo BORRADOR para cualquier jefatura, o REVISION para
      // jefe de departamento) segun assertPuedeEditarContenidoPlanificacion.
      await expect(
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          planificacionMesSiguiente.id,
          'editar el contenido de la planificacion',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ADMIN_SISTEMA (alcance de sistema) no tiene restriccion de ventana de periodo', async () => {
      const planificacionAntigua = buildPlanificacionDepartamento({
        idDepartamento: 5,
        anio: 2020,
        mes: 1,
        estado: 'CERRADA',
      });
      const service = buildService(planificacionAntigua);
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
        service.assertPuedeGestionarPlanificacion(
          actor,
          planificacionAntigua.id,
          'ver la planificacion',
        ),
      ).resolves.toBeUndefined();
    });

    it('scopeListado sin anio/mes agrega la ventana de periodos visibles (mes anterior/actual/siguiente) al filtro SQL', () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      const filtro = service.scopeListado(
        actor,
        new ListarPlanificacionesQueryDto(),
      );

      expect(filtro.periodosPermitidos).toEqual([
        { anio: 2026, mes: 6 },
        { anio: 2026, mes: 7 },
        { anio: 2026, mes: 8 },
      ]);
    });

    it('scopeListado rechaza un anio/mes explicito fuera de la ventana visible', () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });
      const query = new ListarPlanificacionesQueryDto();
      query.anio = 2026;
      query.mes = 5;

      expect(() => service.scopeListado(actor, query)).toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assertPuedeEditarContenidoPlanificacion', () => {
    it('permite a un jefe de servicio editar el contenido en BORRADOR', async () => {
      const planificacion: Planificacion = {
        ...buildPlanificacionDepartamento({}),
        idServicio: 10,
        idDepartamento: null,
        estado: 'BORRADOR',
      };
      const service = buildService(planificacion);
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

      await expect(
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          planificacion.id,
          'editar el contenido de la planificacion',
        ),
      ).resolves.toBeUndefined();
    });

    it('permite a un jefe de departamento editar el contenido en REVISION', async () => {
      const planificacion = buildPlanificacionDepartamento({
        idDepartamento: 5,
        estado: 'REVISION',
      });
      const service = buildService(planificacion);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          planificacion.id,
          'editar el contenido de la planificacion',
        ),
      ).resolves.toBeUndefined();
    });

    it('REGRESION: rechaza a un jefe de servicio editar el contenido en REVISION (ya la envio a revision, el turno de editar es del jefe de departamento)', async () => {
      const planificacion: Planificacion = {
        ...buildPlanificacionDepartamento({}),
        idServicio: 10,
        idDepartamento: null,
        estado: 'REVISION',
      };
      const service = buildService(planificacion);
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

      await expect(
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          planificacion.id,
          'editar el contenido de la planificacion',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza a un jefe de departamento editar el contenido de una planificacion CERRADA (ni siquiera el jefe de departamento puede)', async () => {
      const planificacion = buildPlanificacionDepartamento({
        idDepartamento: 5,
        estado: 'CERRADA',
      });
      const service = buildService(planificacion);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          planificacion.id,
          'editar el contenido de la planificacion',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a SISTEMA editar el contenido sin importar el estado', async () => {
      const planificacion = buildPlanificacionDepartamento({
        idDepartamento: 5,
        estado: 'CERRADA',
      });
      const service = buildService(planificacion);
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
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          planificacion.id,
          'editar el contenido de la planificacion',
        ),
      ).resolves.toBeUndefined();
    });

    it('lanza NotFoundException si la planificacion no existe', async () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeEditarContenidoPlanificacion(
          actor,
          999,
          'editar el contenido de la planificacion',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertPuedeDuplicarPlanificacion', () => {
    it('rechaza sin la capacidad crearPlanificacion, sin llegar a consultar el repositorio', async () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
        capacidades: {
          crearPlanificacion: false,
          editarPlanificacion: true,
        } as UsuarioSesionResponseDto['capacidades'],
      });

      await expect(
        service.assertPuedeDuplicarPlanificacion(actor, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('permite a un jefe de departamento duplicar una planificacion de su propio departamento', async () => {
      const planificacionPropia = buildPlanificacionDepartamento({
        idDepartamento: 5,
      });
      const service = buildService(planificacionPropia);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeDuplicarPlanificacion(actor, planificacionPropia.id),
      ).resolves.toBeUndefined();
    });

    it('rechaza duplicar una planificacion de otro departamento', async () => {
      const planificacionAjena = buildPlanificacionDepartamento({
        idDepartamento: 7,
      });
      const service = buildService(planificacionAjena);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeDuplicarPlanificacion(actor, planificacionAjena.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la planificacion origen no existe', async () => {
      const service = buildService(null);
      const actor = buildActor({
        departamentosGestionables: [
          { id: 5, codigo: 'ENF', nombre: 'Enfermeria' },
        ],
      });

      await expect(
        service.assertPuedeDuplicarPlanificacion(actor, 999),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
