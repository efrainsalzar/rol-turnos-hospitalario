import type { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import {
  canAccessDepartamento,
  canAccessServicio,
  canManageOrganizacionCatalog,
  canManagePersonalCatalogs,
  hasDepartamentoScope,
  hasServicioScope,
  hasSystemScope,
  isDepartamentoHead,
  isServicioHead,
} from './actor-access.helpers';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto> = {},
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
    capacidades: undefined,
    departamentosGestionables: [],
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

function buildAdminSistema(overrides: Partial<UsuarioSesionResponseDto> = {}) {
  return buildActor({
    rolSeguridad: { id: 3, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
    alcancePlanificacion: 'SISTEMA',
    puedeGestionarTodo: true,
    ...overrides,
  });
}

function buildJefeDepartamento(
  overrides: Partial<UsuarioSesionResponseDto> = {},
) {
  return buildActor({
    departamentosGestionables: [DEPARTAMENTO_ENF],
    // TypeOrmUsuarioRepository expande serviciosGestionables con TODOS los
    // servicios del departamento para alcance DEPARTAMENTO — replicarlo aqui
    // para que el fixture sea fiel al actor real que arma el repositorio.
    serviciosGestionables: [SERVICIO_URG],
    ...overrides,
  });
}

function buildJefeServicio(overrides: Partial<UsuarioSesionResponseDto> = {}) {
  return buildActor({
    alcancePlanificacion: 'SERVICIO',
    rolSeguridad: {
      id: 2,
      codigo: 'JEFE_SERVICIO',
      nombre: 'Jefe de servicio',
    },
    departamentosGestionables: [],
    serviciosGestionables: [SERVICIO_URG],
    ...overrides,
  });
}

function buildActorSinAlcance(
  overrides: Partial<UsuarioSesionResponseDto> = {},
) {
  return buildActor({
    alcancePlanificacion: 'LECTURA',
    rolSeguridad: { id: 4, codigo: 'RRHH', nombre: 'Recursos humanos' },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  });
}

describe('actor-access.helpers', () => {
  describe('hasSystemScope', () => {
    it('es true cuando puedeGestionarTodo es true, sin importar alcancePlanificacion', () => {
      const actor = buildActor({
        puedeGestionarTodo: true,
        alcancePlanificacion: 'DEPARTAMENTO',
      });

      expect(hasSystemScope(actor)).toBe(true);
    });

    it('es true cuando alcancePlanificacion es SISTEMA, sin importar puedeGestionarTodo', () => {
      const actor = buildActor({
        puedeGestionarTodo: false,
        alcancePlanificacion: 'SISTEMA',
      });

      expect(hasSystemScope(actor)).toBe(true);
    });

    it('es false para un jefe de departamento normal', () => {
      expect(hasSystemScope(buildJefeDepartamento())).toBe(false);
    });

    it('es false para un jefe de servicio normal', () => {
      expect(hasSystemScope(buildJefeServicio())).toBe(false);
    });

    it('es false para un actor sin alcance (LECTURA)', () => {
      expect(hasSystemScope(buildActorSinAlcance())).toBe(false);
    });
  });

  describe('isDepartamentoHead / isServicioHead', () => {
    it('isDepartamentoHead es true solo para rolSeguridad.codigo === JEFE_DEPARTAMENTO', () => {
      expect(isDepartamentoHead(buildJefeDepartamento())).toBe(true);
      expect(isDepartamentoHead(buildJefeServicio())).toBe(false);
      expect(isDepartamentoHead(buildAdminSistema())).toBe(false);
    });

    it('isServicioHead es true solo para rolSeguridad.codigo === JEFE_SERVICIO', () => {
      expect(isServicioHead(buildJefeServicio())).toBe(true);
      expect(isServicioHead(buildJefeDepartamento())).toBe(false);
      expect(isServicioHead(buildAdminSistema())).toBe(false);
    });

    it('ambas son false cuando rolSeguridad.codigo es null', () => {
      const actor = buildActor({
        rolSeguridad: { id: null, codigo: null, nombre: null },
      });

      expect(isDepartamentoHead(actor)).toBe(false);
      expect(isServicioHead(actor)).toBe(false);
    });
  });

  describe('hasDepartamentoScope / hasServicioScope', () => {
    it('hasDepartamentoScope requiere alcance DEPARTAMENTO y al menos un departamento gestionable', () => {
      expect(hasDepartamentoScope(buildJefeDepartamento())).toBe(true);
      expect(
        hasDepartamentoScope(
          buildActor({
            alcancePlanificacion: 'DEPARTAMENTO',
            departamentosGestionables: [],
          }),
        ),
      ).toBe(false);
      expect(hasDepartamentoScope(buildJefeServicio())).toBe(false);
    });

    it('hasServicioScope requiere alcance SERVICIO y al menos un servicio gestionable', () => {
      expect(hasServicioScope(buildJefeServicio())).toBe(true);
      expect(
        hasServicioScope(
          buildActor({
            alcancePlanificacion: 'SERVICIO',
            serviciosGestionables: [],
          }),
        ),
      ).toBe(false);
      expect(hasServicioScope(buildJefeDepartamento())).toBe(false);
    });
  });

  describe('canAccessDepartamento', () => {
    it('SISTEMA accede a cualquier departamento', () => {
      expect(canAccessDepartamento(buildAdminSistema(), 999)).toBe(true);
    });

    it('jefe de departamento accede a su propio departamento', () => {
      expect(canAccessDepartamento(buildJefeDepartamento(), 5)).toBe(true);
    });

    it('jefe de departamento NO accede a un departamento ajeno', () => {
      expect(canAccessDepartamento(buildJefeDepartamento(), 7)).toBe(false);
    });

    it('jefe de servicio accede al departamento padre de alguno de sus servicios', () => {
      expect(canAccessDepartamento(buildJefeServicio(), 5)).toBe(true);
    });

    it('jefe de servicio NO accede a un departamento sin servicios propios ahi', () => {
      expect(canAccessDepartamento(buildJefeServicio(), 7)).toBe(false);
    });

    it('actor sin alcance no accede a ningun departamento', () => {
      expect(canAccessDepartamento(buildActorSinAlcance(), 5)).toBe(false);
    });
  });

  describe('canAccessServicio', () => {
    it('SISTEMA accede a cualquier servicio', () => {
      expect(canAccessServicio(buildAdminSistema(), 999)).toBe(true);
    });

    it('jefe de servicio accede a su propio servicio', () => {
      expect(canAccessServicio(buildJefeServicio(), 10)).toBe(true);
    });

    it('jefe de servicio NO accede a un servicio ajeno, aunque pase idDepartamento propio', () => {
      expect(canAccessServicio(buildJefeServicio(), 99, 5)).toBe(false);
    });

    it('jefe de departamento accede a un servicio pasando el idDepartamento correcto', () => {
      expect(canAccessServicio(buildJefeDepartamento(), 10, 5)).toBe(true);
    });

    it('jefe de departamento accede a un servicio propio sin necesidad de pasar idDepartamento (fix 2026-07-08: antes esto se rechazaba en falso porque la funcion exigia idDepartamento para entrar a la rama de alcance departamental)', () => {
      expect(canAccessServicio(buildJefeDepartamento(), 10)).toBe(true);
    });

    it('jefe de departamento NO accede a un servicio que no esta en su serviciosGestionables, aunque pase su propio idDepartamento', () => {
      expect(canAccessServicio(buildJefeDepartamento(), 20, 7)).toBe(false);
    });

    it(
      'REGRESION (corregida 2026-07-08): ' +
        'ya NO permite acceder a un servicio de otro departamento pasando el idDepartamento propio. ' +
        'Antes del fix, un jefe de departamento con idDepartamento=5 propio y serviciosGestionables ' +
        'expandido con servicios de OTRO id_departamento (por un bug en el llamador, o por una futura ' +
        'fuente independiente de idServicio/idDepartamento) hubiera pasado igual porque la funcion ' +
        'delegaba ciegamente en canAccessDepartamento(idDepartamento) sin cruzar el dato contra el ' +
        'idDepartamento real del servicio.',
      () => {
        const jefeConServicioAjenoEnLaLista = buildJefeDepartamento({
          serviciosGestionables: [SERVICIO_URG, SERVICIO_QUIRO], // SERVICIO_QUIRO es de id_departamento=7
        });

        expect(
          canAccessServicio(
            jefeConServicioAjenoEnLaLista,
            SERVICIO_QUIRO.id,
            DEPARTAMENTO_ENF.id,
          ),
        ).toBe(false);
      },
    );

    it('actor sin alcance no accede a ningun servicio', () => {
      expect(canAccessServicio(buildActorSinAlcance(), 10)).toBe(false);
    });
  });

  describe('canManagePersonalCatalogs / canManageOrganizacionCatalog', () => {
    it('canManagePersonalCatalogs refleja permisos.puedeGestionarPersonal', () => {
      expect(
        canManagePersonalCatalogs(
          buildActor({
            permisos: {
              ...buildActor().permisos,
              puedeGestionarPersonal: true,
            },
          }),
        ),
      ).toBe(true);
      expect(canManagePersonalCatalogs(buildJefeDepartamento())).toBe(false);
    });

    it('canManageOrganizacionCatalog refleja capacidades.gestionarServicios', () => {
      expect(
        canManageOrganizacionCatalog(
          buildActor({
            capacidades: {
              gestionarServicios: true,
            } as UsuarioSesionResponseDto['capacidades'],
          }),
        ),
      ).toBe(true);
      expect(canManageOrganizacionCatalog(buildJefeDepartamento())).toBe(false);
    });

    it('canManageOrganizacionCatalog es false cuando capacidades es undefined', () => {
      expect(
        canManageOrganizacionCatalog(buildActor({ capacidades: undefined })),
      ).toBe(false);
    });
  });
});
