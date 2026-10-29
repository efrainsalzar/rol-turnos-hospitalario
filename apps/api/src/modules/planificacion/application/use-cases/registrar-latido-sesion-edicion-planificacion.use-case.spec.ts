import { ConflictException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { RegistrarLatidoSesionEdicionPlanificacionUseCase } from './registrar-latido-sesion-edicion-planificacion.use-case';

function buildActor(id: number, codigoRol: string): UsuarioSesionResponseDto {
  return {
    id,
    username: `actor-${id}`,
    rolSeguridad: { id: 1, codigo: codigoRol, nombre: codigoRol },
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

describe('RegistrarLatidoSesionEdicionPlanificacionUseCase', () => {
  it('adquiere/renueva el control y devuelve la sesion propia cuando el repositorio confirma controlPropio', async () => {
    const sesionPropia = {
      idPlanificacion: 10,
      idUsuarioEditor: 1,
      nombreUsuarioEditor: 'actor-1',
      codigoRolEditor: 'JEFE_SERVICIO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const intentarAdquirirOLatir = jest
      .fn()
      .mockResolvedValue({ sesion: sesionPropia, controlPropio: true });
    const repository = buildRepository({
      intentarAdquirirOLatir,
      obtenerActiva: jest.fn().mockResolvedValue(sesionPropia),
    });
    const useCase = new RegistrarLatidoSesionEdicionPlanificacionUseCase(
      repository,
    );

    const resultado = await useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10);

    expect(intentarAdquirirOLatir).toHaveBeenCalledWith(10, 1);
    expect(resultado.esPropia).toBe(true);
    expect(resultado.ocupada).toBe(true);
  });

  it('lanza 409 cuando otro usuario tiene el control vigente', async () => {
    const sesionAjena = {
      idPlanificacion: 10,
      idUsuarioEditor: 2,
      nombreUsuarioEditor: 'actor-2',
      codigoRolEditor: 'JEFE_DEPARTAMENTO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const repository = buildRepository({
      intentarAdquirirOLatir: jest
        .fn()
        .mockResolvedValue({ sesion: sesionAjena, controlPropio: false }),
    });
    const useCase = new RegistrarLatidoSesionEdicionPlanificacionUseCase(
      repository,
    );

    await expect(
      useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
