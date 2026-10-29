import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { TomarControlSesionEdicionPlanificacionUseCase } from './tomar-control-sesion-edicion-planificacion.use-case';

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

describe('TomarControlSesionEdicionPlanificacionUseCase', () => {
  it('permite tomar el control cuando no hay sesion activa', async () => {
    const sesionNueva = {
      idPlanificacion: 10,
      idUsuarioEditor: 1,
      nombreUsuarioEditor: 'actor-1',
      codigoRolEditor: 'JEFE_SERVICIO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const forzarControl = jest.fn().mockResolvedValue(sesionNueva);
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(null),
      forzarControl,
    });
    const useCase = new TomarControlSesionEdicionPlanificacionUseCase(
      repository,
    );

    const resultado = await useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10);

    expect(forzarControl).toHaveBeenCalledWith(10, 1);
    expect(resultado.esPropia).toBe(true);
  });

  it('permite tomar el control cuando el rango del actor es igual o superior al del editor actual', async () => {
    const sesionActual = {
      idPlanificacion: 10,
      idUsuarioEditor: 2,
      nombreUsuarioEditor: 'actor-2',
      codigoRolEditor: 'JEFE_SERVICIO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const sesionTrasForzar = { ...sesionActual, idUsuarioEditor: 1 };
    const forzarControl = jest.fn().mockResolvedValue(sesionTrasForzar);
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(sesionActual),
      forzarControl,
    });
    const useCase = new TomarControlSesionEdicionPlanificacionUseCase(
      repository,
    );

    const resultado = await useCase.execute(
      buildActor(1, 'JEFE_DEPARTAMENTO'),
      10,
    );

    expect(forzarControl).toHaveBeenCalledWith(10, 1);
    expect(resultado.esPropia).toBe(true);
  });

  it('rechaza con 403 cuando el rango del actor es inferior al del editor actual', async () => {
    const sesionActual = {
      idPlanificacion: 10,
      idUsuarioEditor: 2,
      nombreUsuarioEditor: 'actor-2',
      codigoRolEditor: 'JEFE_DEPARTAMENTO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const forzarControl = jest.fn();
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(sesionActual),
      forzarControl,
    });
    const useCase = new TomarControlSesionEdicionPlanificacionUseCase(
      repository,
    );

    await expect(
      useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(forzarControl).not.toHaveBeenCalled();
  });
});
