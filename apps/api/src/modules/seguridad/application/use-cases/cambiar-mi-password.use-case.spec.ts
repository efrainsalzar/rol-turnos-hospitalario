import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { UsuarioRepository } from '../../domain/repositories/usuario.repository';
import { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import { CambiarMiPasswordUseCase } from './cambiar-mi-password.use-case';

describe('CambiarMiPasswordUseCase', () => {
  const actor = {
    id: 1,
    username: 'admin.sistema',
  } as UsuarioSesionResponseDto;

  function buildRepository(
    overrides: Partial<UsuarioRepository> = {},
  ): UsuarioRepository {
    return {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      obtenerSesionPorId: jest.fn(),
      obtenerSesionPorUsername: jest.fn(),
      obtenerSesionAutenticablePorUsername: jest.fn(),
      crearSesionActiva: jest.fn(),
      obtenerSesionPorToken: jest.fn(),
      revocarSesionPorToken: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      actualizarPassword: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
      obtenerPorPersonal: jest.fn(),
      contarAdministradoresSistemaActivos: jest.fn(),
      ...overrides,
    };
  }

  it('cambia el password cuando la contrasena actual es correcta', async () => {
    const passwordHashActual = await hash('clave-vieja', 10);
    const actualizarPassword = jest.fn().mockResolvedValue(undefined);
    const repository = buildRepository({
      obtenerSesionAutenticablePorUsername: jest.fn().mockResolvedValue({
        session: {},
        passwordHash: passwordHashActual,
      }),
      actualizarPassword,
    });
    const useCase = new CambiarMiPasswordUseCase(repository);

    await useCase.execute(actor, {
      passwordActual: 'clave-vieja',
      passwordNuevo: 'clave-nueva',
    });

    expect(actualizarPassword).toHaveBeenCalledTimes(1);
    const [idUsuario, nuevoHash] = actualizarPassword.mock.calls[0] as [
      number,
      string,
    ];
    expect(idUsuario).toBe(1);
    expect(nuevoHash).not.toBe(passwordHashActual);
  });

  it('rechaza el cambio si la contrasena actual es incorrecta', async () => {
    const passwordHashActual = await hash('clave-vieja', 10);
    const actualizarPassword = jest.fn();
    const repository = buildRepository({
      obtenerSesionAutenticablePorUsername: jest.fn().mockResolvedValue({
        session: {},
        passwordHash: passwordHashActual,
      }),
      actualizarPassword,
    });
    const useCase = new CambiarMiPasswordUseCase(repository);

    await expect(
      useCase.execute(actor, {
        passwordActual: 'clave-equivocada',
        passwordNuevo: 'clave-nueva',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(actualizarPassword).not.toHaveBeenCalled();
  });

  it('rechaza el cambio si el usuario no tiene credenciales locales habilitadas', async () => {
    const actualizarPassword = jest.fn();
    const repository = buildRepository({
      obtenerSesionAutenticablePorUsername: jest.fn().mockResolvedValue({
        session: {},
        passwordHash: null,
      }),
      actualizarPassword,
    });
    const useCase = new CambiarMiPasswordUseCase(repository);

    await expect(
      useCase.execute(actor, {
        passwordActual: 'clave-vieja',
        passwordNuevo: 'clave-nueva',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(actualizarPassword).not.toHaveBeenCalled();
  });
});
