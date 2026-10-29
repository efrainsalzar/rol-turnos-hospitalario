import { ForbiddenException } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { CrearUsuarioUseCase } from './crear-usuario.use-case';

describe('CrearUsuarioUseCase', () => {
  const adminPermisos = {
    puedeVerOrganizacion: true,
    puedeVerPersonal: true,
    puedeGestionarPersonal: true,
    puedeVerAsignaciones: true,
    puedeGestionarAsignaciones: true,
    puedeVerSeguridad: true,
    puedeGestionarUsuarios: true,
    puedeVerOperacion: true,
    puedeVerPlanificacion: true,
    puedeEditarPlanificacion: true,
    puedeAprobarPlanificacion: true,
    puedeVerReportes: true,
  };

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

  it('should create a local user for ADMIN_SISTEMA', async () => {
    const repository: UsuarioRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerSesionPorId: jest.fn(),
      obtenerSesionPorUsername: jest.fn(),
      obtenerSesionAutenticablePorUsername: jest.fn(),
      crearSesionActiva: jest.fn(),
      obtenerSesionPorToken: jest.fn(),
      revocarSesionPorToken: jest.fn(),
      crear: jest.fn().mockResolvedValue({
        id: 1,
        idPersonal: 2,
        codigoPersonal: 'PER-001',
        nombreCompleto: 'Ana Rojas Lopez',
        idRolSeguridad: 1,
        rolCodigo: 'ADMIN_SISTEMA',
        rolNombre: 'Administrador',
        tipoUsuario: 'ADMINISTRATIVO',
        proveedorAutenticacion: 'LOCAL',
        sujetoAutenticacion: 'admin.demo',
        username: 'admin.demo',
        identidadLocalHabilitada: true,
        activo: true,
      }),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
      obtenerPorPersonal: jest.fn(),
      contarAdministradoresSistemaActivos: jest.fn(),
      actualizarPassword: jest.fn(),
    };
    const rolSeguridadRepository: RolSeguridadRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 1,
        codigo: 'ADMIN_SISTEMA',
        nombre: 'Administrador',
        activo: true,
        alcancePlanificacion: 'SISTEMA',
        permisos: adminPermisos,
        capacidades: {},
      }),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
    };

    const useCase = new CrearUsuarioUseCase(repository, rolSeguridadRepository);

    await expect(
      useCase.execute(
        {
          id: 1,
          username: 'admin.sistema',
          tipoUsuario: 'ADMINISTRATIVO',
          proveedorAutenticacion: 'LOCAL',
          sujetoAutenticacion: 'admin.sistema',
          identidadLocalHabilitada: true,
          activo: true,
          rolSeguridad: {
            id: 1,
            codigo: 'ADMIN_SISTEMA',
            nombre: 'Administrador',
          },
          personal: { id: null, codigoPersonal: null, nombreCompleto: null },
          alcancePlanificacion: 'SISTEMA',
          puedeGestionarPlanificacion: true,
          puedeGestionarTodo: true,
          permisos: adminPermisos,
          departamentosGestionables: [],
          serviciosGestionables: [],
        },
        {
          idPersonal: 2,
          idRolSeguridad: 1,
          tipoUsuario: 'ADMINISTRATIVO',
          username: 'admin.demo',
          password: '123456',
        },
      ),
    ).resolves.toMatchObject({
      username: 'admin.demo',
      rolSeguridad: {
        codigo: 'ADMIN_SISTEMA',
      },
    });
  });

  it('should reject non-admin actors', async () => {
    const repository = {} as UsuarioRepository;
    const rolSeguridadRepository = {} as RolSeguridadRepository;
    const useCase = new CrearUsuarioUseCase(repository, rolSeguridadRepository);

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
          tipoUsuario: 'ADMINISTRATIVO',
          username: 'demo.user',
          password: '123456',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
