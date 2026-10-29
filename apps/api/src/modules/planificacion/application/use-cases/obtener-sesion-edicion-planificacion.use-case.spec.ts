import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import { SesionEdicionPlanificacionRepository } from '../../domain/repositories/sesion-edicion-planificacion.repository';
import { SesionEdicionPlanificacion } from '../../domain/entities/sesion-edicion-planificacion';
import { ObtenerSesionEdicionPlanificacionUseCase } from './obtener-sesion-edicion-planificacion.use-case';

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

describe('ObtenerSesionEdicionPlanificacionUseCase', () => {
  it('devuelve ocupada=false y puedeTomarControl=true cuando no hay sesion activa', async () => {
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(null),
    });
    const useCase = new ObtenerSesionEdicionPlanificacionUseCase(repository);

    const resultado = await useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10);

    expect(resultado).toEqual({
      ocupada: false,
      codigoRolEditor: null,
      etiquetaRolEditor: null,
      adquiridoEn: null,
      ultimoLatido: null,
      esPropia: false,
      puedeTomarControl: true,
    });
  });

  it('marca esPropia=true cuando la sesion activa pertenece al actor', async () => {
    const sesion: SesionEdicionPlanificacion = {
      idPlanificacion: 10,
      idUsuarioEditor: 1,
      nombreUsuarioEditor: 'actor-1',
      codigoRolEditor: 'JEFE_SERVICIO',
      adquiridoEn: new Date('2026-07-17T10:00:00.000Z'),
      ultimoLatido: new Date('2026-07-17T10:00:00.000Z'),
    };
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(sesion),
    });
    const useCase = new ObtenerSesionEdicionPlanificacionUseCase(repository);

    const resultado = await useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10);

    expect(resultado.ocupada).toBe(true);
    expect(resultado.esPropia).toBe(true);
    expect(resultado.puedeTomarControl).toBe(false);
  });

  it('expone puedeTomarControl=true para un rango superior al del editor actual', async () => {
    const sesion: SesionEdicionPlanificacion = {
      idPlanificacion: 10,
      idUsuarioEditor: 2,
      nombreUsuarioEditor: 'actor-2',
      codigoRolEditor: 'JEFE_SERVICIO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(sesion),
    });
    const useCase = new ObtenerSesionEdicionPlanificacionUseCase(repository);

    const resultado = await useCase.execute(
      buildActor(1, 'JEFE_DEPARTAMENTO'),
      10,
    );

    expect(resultado.esPropia).toBe(false);
    expect(resultado.puedeTomarControl).toBe(true);
  });

  it('expone puedeTomarControl=false para un rango inferior al del editor actual', async () => {
    const sesion: SesionEdicionPlanificacion = {
      idPlanificacion: 10,
      idUsuarioEditor: 2,
      nombreUsuarioEditor: 'actor-2',
      codigoRolEditor: 'JEFE_DEPARTAMENTO',
      adquiridoEn: new Date(),
      ultimoLatido: new Date(),
    };
    const repository = buildRepository({
      obtenerActiva: jest.fn().mockResolvedValue(sesion),
    });
    const useCase = new ObtenerSesionEdicionPlanificacionUseCase(repository);

    const resultado = await useCase.execute(buildActor(1, 'JEFE_SERVICIO'), 10);

    expect(resultado.puedeTomarControl).toBe(false);
  });
});
