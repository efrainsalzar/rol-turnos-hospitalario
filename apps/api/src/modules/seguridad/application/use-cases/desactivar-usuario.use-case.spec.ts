import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { DesactivarUsuarioUseCase } from './desactivar-usuario.use-case';

const adminActor = {
  id: 1,
  username: 'admin.sistema',
  tipoUsuario: 'ADMINISTRATIVO',
  proveedorAutenticacion: 'LOCAL',
  sujetoAutenticacion: 'admin.sistema',
  identidadLocalHabilitada: true,
  activo: true,
  rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
  personal: { id: null, codigoPersonal: null, nombreCompleto: null },
  alcancePlanificacion: 'SISTEMA' as const,
  puedeGestionarPlanificacion: true,
  puedeGestionarTodo: true,
  permisos: {
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
  },
  departamentosGestionables: [],
  serviciosGestionables: [],
};

function buildSesionObjetivo(
  overrides: Partial<{
    activo: boolean;
    alcancePlanificacion: string;
    puedeGestionarUsuarios: boolean;
  }>,
) {
  return {
    activo: overrides.activo ?? true,
    alcancePlanificacion: overrides.alcancePlanificacion ?? 'SISTEMA',
    permisos: {
      puedeGestionarUsuarios: overrides.puedeGestionarUsuarios ?? true,
    },
  };
}

describe('DesactivarUsuarioUseCase', () => {
  it('rechaza actores sin permiso de gestionar usuarios', async () => {
    const repository = {} as UsuarioRepository;
    const useCase = new DesactivarUsuarioUseCase(repository);

    await expect(
      useCase.execute(
        {
          ...adminActor,
          permisos: { ...adminActor.permisos, puedeGestionarUsuarios: false },
        },
        5,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('bloquea desactivar al unico administrador de sistema activo', async () => {
    const repository: Partial<UsuarioRepository> = {
      obtenerSesionPorId: jest.fn().mockResolvedValue(buildSesionObjetivo({})),
      contarAdministradoresSistemaActivos: jest.fn().mockResolvedValue(1),
      actualizarPassword: jest.fn(),
      desactivar: jest.fn(),
    };
    const useCase = new DesactivarUsuarioUseCase(
      repository as UsuarioRepository,
    );

    await expect(useCase.execute(adminActor, 5)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repository.desactivar).not.toHaveBeenCalled();
  });

  it('permite desactivar un administrador de sistema si hay otro activo', async () => {
    const repository: Partial<UsuarioRepository> = {
      obtenerSesionPorId: jest.fn().mockResolvedValue(buildSesionObjetivo({})),
      contarAdministradoresSistemaActivos: jest.fn().mockResolvedValue(2),
      actualizarPassword: jest.fn(),
      desactivar: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new DesactivarUsuarioUseCase(
      repository as UsuarioRepository,
    );

    await useCase.execute(adminActor, 5);

    expect(repository.desactivar).toHaveBeenCalledWith(5);
  });

  it('permite desactivar un usuario que no es administrador de sistema sin contar administradores', async () => {
    const repository: Partial<UsuarioRepository> = {
      obtenerSesionPorId: jest.fn().mockResolvedValue(
        buildSesionObjetivo({
          alcancePlanificacion: 'SERVICIO',
          puedeGestionarUsuarios: false,
        }),
      ),
      contarAdministradoresSistemaActivos: jest.fn(),
      actualizarPassword: jest.fn(),
      desactivar: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new DesactivarUsuarioUseCase(
      repository as UsuarioRepository,
    );

    await useCase.execute(adminActor, 7);

    expect(
      repository.contarAdministradoresSistemaActivos,
    ).not.toHaveBeenCalled();
    expect(repository.desactivar).toHaveBeenCalledWith(7);
  });
});
