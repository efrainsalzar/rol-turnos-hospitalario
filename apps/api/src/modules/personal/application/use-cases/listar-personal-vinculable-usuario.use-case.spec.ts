import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ListarPersonalVinculableUsuarioUseCase } from './listar-personal-vinculable-usuario.use-case';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto> = {},
): UsuarioSesionResponseDto {
  return {
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
      nombre: 'Administrador del sistema',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SISTEMA',
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
    ...overrides,
  };
}

describe('ListarPersonalVinculableUsuarioUseCase', () => {
  it('devuelve la proyeccion minima cuando el actor puede gestionar usuarios', async () => {
    const listarVinculablesUsuario = jest.fn().mockResolvedValue([
      {
        id: 5,
        codigoPersonal: 'ENF-002',
        nombreCompleto: 'Ana Perez',
        idServicioPrincipal: 10,
        nombreServicioPrincipal: 'Urgencias',
        idDepartamentoPrincipal: 1,
        nombreDepartamentoPrincipal: 'Enfermeria',
        esJefaturaRolFuncional: true,
      },
    ]);
    const repository = {
      listarVinculablesUsuario,
    } as unknown as PersonalRepository;
    const useCase = new ListarPersonalVinculableUsuarioUseCase(repository);

    await expect(useCase.execute(buildActor())).resolves.toEqual([
      {
        id: 5,
        codigoPersonal: 'ENF-002',
        nombreCompleto: 'Ana Perez',
        idServicioPrincipal: 10,
        nombreServicioPrincipal: 'Urgencias',
        idDepartamentoPrincipal: 1,
        nombreDepartamentoPrincipal: 'Enfermeria',
        esJefaturaRolFuncional: true,
      },
    ]);
  });

  it('rechaza al actor que no puede gestionar usuarios', async () => {
    const listarVinculablesUsuario = jest.fn();
    const repository = {
      listarVinculablesUsuario,
    } as unknown as PersonalRepository;
    const useCase = new ListarPersonalVinculableUsuarioUseCase(repository);
    const actorSinPermiso = buildActor({
      permisos: {
        puedeVerOrganizacion: true,
        puedeVerPersonal: true,
        puedeGestionarPersonal: false,
        puedeVerAsignaciones: true,
        puedeGestionarAsignaciones: false,
        puedeVerSeguridad: false,
        puedeGestionarUsuarios: false,
        puedeVerOperacion: false,
        puedeVerPlanificacion: false,
        puedeEditarPlanificacion: false,
        puedeAprobarPlanificacion: false,
        puedeVerReportes: false,
      },
    });

    await expect(useCase.execute(actorSinPermiso)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(listarVinculablesUsuario).not.toHaveBeenCalled();
  });
});
