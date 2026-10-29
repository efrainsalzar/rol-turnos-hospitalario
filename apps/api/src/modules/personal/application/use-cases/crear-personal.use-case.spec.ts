import { ForbiddenException } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { CrearPersonalUseCase } from './crear-personal.use-case';

describe('CrearPersonalUseCase', () => {
  const rrhhPermisos = {
    puedeVerOrganizacion: true,
    puedeVerPersonal: true,
    puedeGestionarPersonal: true,
    puedeVerAsignaciones: true,
    puedeGestionarAsignaciones: true,
    puedeVerSeguridad: false,
    puedeGestionarUsuarios: false,
    puedeVerOperacion: true,
    puedeVerPlanificacion: false,
    puedeEditarPlanificacion: false,
    puedeAprobarPlanificacion: false,
    puedeVerReportes: false,
  };

  const jefaServicioPermisos = {
    puedeVerOrganizacion: false,
    puedeVerPersonal: false,
    puedeGestionarPersonal: false,
    puedeVerAsignaciones: false,
    puedeGestionarAsignaciones: false,
    puedeVerSeguridad: false,
    puedeGestionarUsuarios: false,
    puedeVerOperacion: false,
    puedeVerPlanificacion: true,
    puedeEditarPlanificacion: true,
    puedeAprobarPlanificacion: false,
    puedeVerReportes: false,
  };

  it('should create personal for RRHH', async () => {
    const repository: PersonalRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      listarVinculablesUsuario: jest.fn(),
      obtenerDetalle: jest.fn(),
      obtenerAsignacionPorId: jest.fn(),
      listarAsignaciones: jest.fn(),
      crearAsignacion: jest.fn(),
      actualizarAsignacion: jest.fn(),
      moverAsignacion: jest.fn(),
      cerrarAsignacion: jest.fn(),
      obtenerJefaturaActivaEnUnidad: jest.fn(),
      crearPersonal: jest.fn().mockResolvedValue({
        id: 1,
        codigoPersonal: 'PER-100',
        nombres: 'Ana',
        apellidoPaterno: 'Rojas',
        apellidoMaterno: 'Lopez',
        documentoIdentidad: '1001',
        idNivelCargo: 10,
        codigoNivelCargo: 'LIC',
        nombreNivelCargo: 'Licenciada',
        tieneAsignacionActiva: false,
        activo: true,
      }),
      actualizarPersonal: jest.fn(),
      activarPersonal: jest.fn(),
      desactivarPersonal: jest.fn(),

      listarNivelesCargo: jest.fn(),
      crearNivelCargo: jest.fn(),
      actualizarNivelCargo: jest.fn(),
      activarNivelCargo: jest.fn(),
      desactivarNivelCargo: jest.fn(),
      listarCargasHorarias: jest.fn(),
      crearCargaHoraria: jest.fn(),
      actualizarCargaHoraria: jest.fn(),
      activarCargaHoraria: jest.fn(),
      desactivarCargaHoraria: jest.fn(),
      listarTiposContrato: jest.fn(),
      listarRolesFuncionales: jest.fn(),
      obtenerRolFuncionalPorId: jest.fn(),
      existePlanificacionAbiertaParaAsignacion: jest.fn(),
      obtenerConflictoPlanificacionAbiertaParaAsignacion: jest.fn(),
      obtenerPlanificacionAprobadaPorUnidadYFecha: jest.fn(),
    };

    const useCase = new CrearPersonalUseCase(repository);

    await expect(
      useCase.execute(
        {
          id: 2,
          username: 'rrhh.sistema',
          tipoUsuario: 'ADMINISTRATIVO',
          proveedorAutenticacion: 'LOCAL',
          sujetoAutenticacion: 'rrhh.sistema',
          identidadLocalHabilitada: true,
          activo: true,
          rolSeguridad: { id: 2, codigo: 'RRHH', nombre: 'RRHH' },
          personal: { id: null, codigoPersonal: null, nombreCompleto: null },
          alcancePlanificacion: 'LECTURA',
          puedeGestionarPlanificacion: false,
          puedeGestionarTodo: false,
          permisos: rrhhPermisos,
          departamentosGestionables: [],
          serviciosGestionables: [],
        },
        {
          codigoPersonal: 'PER-100',
          nombres: 'Ana',
          apellidoPaterno: 'Rojas',
          apellidoMaterno: 'Lopez',
          documentoIdentidad: '1001',
          idNivelCargo: 10,
        },
      ),
    ).resolves.toMatchObject({
      codigoPersonal: 'PER-100',
      nombreCompleto: 'Ana Rojas Lopez',
    });
  });

  it('should reject non-admin operational roles', async () => {
    const repository = {} as PersonalRepository;
    const useCase = new CrearPersonalUseCase(repository);

    await expect(
      useCase.execute(
        {
          id: 3,
          username: 'jefa.neuro',
          tipoUsuario: 'PERSONAL',
          proveedorAutenticacion: 'LOCAL',
          sujetoAutenticacion: 'jefa.neuro',
          identidadLocalHabilitada: true,
          activo: true,
          rolSeguridad: {
            id: 3,
            codigo: 'JEFE_SERVICIO',
            nombre: 'Jefa de servicio',
          },
          personal: {
            id: 10,
            codigoPersonal: 'NEU-001',
            nombreCompleto: 'Neuro Jefa',
          },
          alcancePlanificacion: 'SERVICIO',
          puedeGestionarPlanificacion: true,
          puedeGestionarTodo: false,
          permisos: jefaServicioPermisos,
          departamentosGestionables: [],
          serviciosGestionables: [],
        },
        {
          codigoPersonal: 'PER-100',
          nombres: 'Ana',
          apellidoPaterno: 'Rojas',
          apellidoMaterno: 'Lopez',
          documentoIdentidad: '1001',
          idNivelCargo: 10,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
