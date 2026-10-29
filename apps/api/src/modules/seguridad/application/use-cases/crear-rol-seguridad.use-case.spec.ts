import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../dto/usuario-sesion-response.dto';
import type { GuardarRolSeguridadDto } from '../dto/guardar-rol-seguridad.dto';
import { RolSeguridadRepository } from '../../domain/repositories/rol-seguridad.repository';
import { CrearRolSeguridadUseCase } from './crear-rol-seguridad.use-case';

const permisosFalse = {
  puedeVerOrganizacion: false,
  puedeVerPersonal: false,
  puedeGestionarPersonal: false,
  puedeVerAsignaciones: false,
  puedeGestionarAsignaciones: false,
  puedeVerSeguridad: false,
  puedeGestionarUsuarios: false,
  puedeVerOperacion: false,
  puedeVerPlanificacion: false,
  puedeEditarPlanificacion: false,
  puedeAprobarPlanificacion: false,
  puedeVerReportes: false,
};

const capacidadesFalse = {
  verCalendarios: false,
  gestionarCalendarios: false,
  verIncidenciasPersonales: false,
  gestionarIncidenciasPersonales: false,
  gestionarTiposFeriado: false,
  verCargasHorarias: false,
  gestionarCargasHorarias: false,
  verTurnos: false,
  crearPlanificacion: false,
  editarPlanificacion: false,
  enviarRevisionPlanificacion: false,
  volverBorradorPlanificacion: false,
  aprobarPlanificacion: false,
  cerrarPlanificacion: false,
  exportarPlanificacion: false,
  exportarPlanificacionLote: false,
  gestionarCodigosOperativos: false,
  gestionarTurnos: false,
  gestionarServicios: false,
};

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'admin.sistema',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'admin.sistema',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador' },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SISTEMA',
    puedeGestionarPlanificacion: true,
    puedeGestionarTodo: true,
    permisos: { ...permisosFalse, puedeGestionarUsuarios: true },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  };
}

function buildInput(
  overrides: Partial<GuardarRolSeguridadDto> = {},
): GuardarRolSeguridadDto {
  return {
    codigo: 'NUEVO_ROL',
    nombre: 'Nuevo rolSeguridad',
    alcancePlanificacion: 'SERVICIO',
    permisos: permisosFalse,
    capacidades: capacidadesFalse,
    ...overrides,
  };
}

describe('CrearRolSeguridadUseCase', () => {
  it('permite a ADMIN_SISTEMA crear un rolSeguridad de cualquier alcance', async () => {
    const rolSeguridadRepository = {
      crear: jest.fn().mockResolvedValue({ id: 10 }),
    } as unknown as RolSeguridadRepository;
    const useCase = new CrearRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({});

    await expect(
      useCase.execute(actor, buildInput({ alcancePlanificacion: 'SISTEMA' })),
    ).resolves.toBeDefined();
  });

  it('REGRESION: rechaza a un actor sin puedeGestionarUsuarios', async () => {
    const rolSeguridadRepository = {} as RolSeguridadRepository;
    const useCase = new CrearRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({
      rolSeguridad: { id: 3, codigo: 'JEFE_DEPARTAMENTO', nombre: 'Jefe' },
      alcancePlanificacion: 'DEPARTAMENTO',
      permisos: permisosFalse,
    });

    await expect(useCase.execute(actor, buildInput())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('REGRESION: rechaza a un actor con puedeGestionarUsuarios pero alcance insuficiente crear un rolSeguridad de alcance igual o mayor (escalamiento de privilegios)', async () => {
    const crearMock = jest.fn();
    const rolSeguridadRepository = {
      crear: crearMock,
    } as unknown as RolSeguridadRepository;
    const useCase = new CrearRolSeguridadUseCase(rolSeguridadRepository);
    const actor = buildActor({
      alcancePlanificacion: 'DEPARTAMENTO',
    });

    await expect(
      useCase.execute(
        actor,
        buildInput({ alcancePlanificacion: 'DEPARTAMENTO' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(crearMock).not.toHaveBeenCalled();
  });
});
