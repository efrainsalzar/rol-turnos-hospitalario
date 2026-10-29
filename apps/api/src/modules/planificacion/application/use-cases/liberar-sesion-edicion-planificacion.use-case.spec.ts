import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { LiberarSesionEdicionPlanificacionUseCase } from './liberar-sesion-edicion-planificacion.use-case';

function buildActor(id: number): UsuarioSesionResponseDto {
  return {
    id,
    username: `actor-${id}`,
    rolSeguridad: { id: 1, codigo: 'JEFE_SERVICIO', nombre: 'JEFE_SERVICIO' },
  } as UsuarioSesionResponseDto;
}

function buildRepository(
  overrides: Partial<SesionEdicionPlanificacionRepository> = {},
): SesionEdicionPlanificacionRepository {
  return {
    obtenerActiva: jest.fn(),
    intentarAdquirirOLatir: jest.fn(),
    forzarControl: jest.fn(),
    liberar: jest.fn(),
    liberarTodasDeUsuario: jest.fn(),
    ...overrides,
  };
}

describe('LiberarSesionEdicionPlanificacionUseCase', () => {
  it('libera la sesion de la planificacion indicada acotada al actor', async () => {
    const liberar = jest.fn();
    const useCase = new LiberarSesionEdicionPlanificacionUseCase(
      buildRepository({ liberar }),
    );

    await useCase.execute(buildActor(1), 10);

    expect(liberar).toHaveBeenCalledWith(10, 1);
  });

  it('libera todas las sesiones del actor sin importar la planificacion', async () => {
    const liberarTodasDeUsuario = jest.fn();
    const useCase = new LiberarSesionEdicionPlanificacionUseCase(
      buildRepository({ liberarTodasDeUsuario }),
    );

    await useCase.executeTodas(buildActor(1));

    expect(liberarTodasDeUsuario).toHaveBeenCalledWith(1);
  });
});
