import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { UsuarioCapacidadesOperativas } from '../../../seguridad/domain/entities/usuario-capacidades';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { Feriado } from '../../domain/entities/feriado';
import type { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import type { FeriadoRepository } from '../../domain/repositories/feriado.repository';
import { GuardarFeriadoDto } from '../dto/guardar-feriado.dto';
import { CalendarioAccessPolicyService } from './helpers/calendario-access-policy.service';
import { CrearFeriadoUseCase } from './crear-feriado.use-case';
import { ActualizarFeriadoUseCase } from './actualizar-feriado.use-case';
import { ListarFeriadosUseCase } from './listar-feriados.use-case';
import { DesactivarFeriadoUseCase } from './desactivar-feriado.use-case';

function buildActor(
  overrides: Partial<Omit<UsuarioSesionResponseDto, 'capacidades'>> & {
    capacidades?: Partial<UsuarioCapacidadesOperativas>;
  } = {},
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
    capacidades: {
      gestionarCalendarios: true,
      gestionarTiposFeriado: true,
    },
    departamentosGestionables: [],
    serviciosGestionables: [],
    ...overrides,
  } as UsuarioSesionResponseDto;
}

function buildInput(
  overrides: Partial<GuardarFeriadoDto> = {},
): GuardarFeriadoDto {
  const dto = new GuardarFeriadoDto();
  Object.assign(dto, {
    idTipoFeriado: 2,
    nombre: 'Año Nuevo',
    anio: 2026,
    mes: 1,
    fechaInicio: '2026-01-01',
    fechaFin: '2026-01-01',
    activo: true,
    ...overrides,
  });
  return dto;
}

function buildCalendarioRepository(
  overrides: Partial<CalendarioRepository> = {},
): CalendarioRepository {
  return {
    existeMes: jest.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as CalendarioRepository;
}

function buildFeriado(overrides: Partial<Feriado> = {}): Feriado {
  return {
    id: 10,
    idTipoFeriado: 2,
    codigoTipoFeriado: 'FN',
    nombreTipoFeriado: 'Feriado nacional',
    nombre: 'Año Nuevo',
    anio: 2026,
    mes: 1,
    fechaInicio: new Date('2026-01-01'),
    fechaFin: new Date('2026-01-01'),
    activo: true,
    ...overrides,
  };
}

describe('Feriado use-cases', () => {
  describe('CrearFeriadoUseCase', () => {
    it('rechaza a un actor sin capacidad de gestionar calendarios', async () => {
      const crear = jest.fn();
      const feriadoRepository = { crear } as unknown as FeriadoRepository;
      const useCase = new CrearFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        buildCalendarioRepository(),
        feriadoRepository,
      );

      await expect(
        useCase.execute(
          buildActor({
            capacidades: {
              gestionarCalendarios: false,
              gestionarTiposFeriado: false,
            },
          }),
          buildInput(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(crear).not.toHaveBeenCalled();
    });

    it('rechaza crear un feriado si el calendario del mes aun no fue generado', async () => {
      const crear = jest.fn();
      const feriadoRepository = { crear } as unknown as FeriadoRepository;
      const existeMes = jest.fn().mockResolvedValue(false);
      const calendarioRepository = buildCalendarioRepository({
        existeMes,
      });
      const useCase = new CrearFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        calendarioRepository,
        feriadoRepository,
      );

      await expect(
        useCase.execute(buildActor(), buildInput()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(existeMes).toHaveBeenCalledWith(2026, 1);
      expect(crear).not.toHaveBeenCalled();
    });

    it('crea el feriado delegando al repositorio para un actor autorizado', async () => {
      const crear = jest.fn().mockResolvedValue(buildFeriado());
      const feriadoRepository = { crear } as unknown as FeriadoRepository;
      const useCase = new CrearFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        buildCalendarioRepository(),
        feriadoRepository,
      );

      const result = await useCase.execute(buildActor(), buildInput());

      expect(crear).toHaveBeenCalledWith({
        idTipoFeriado: 2,
        nombre: 'Año Nuevo',
        anio: 2026,
        mes: 1,
        fechaInicio: '2026-01-01',
        fechaFin: '2026-01-01',
        activo: true,
      });
      expect(result).toMatchObject({
        id: 10,
        nombre: 'Año Nuevo',
        codigoTipoFeriado: 'FN',
      });
    });
  });

  describe('ActualizarFeriadoUseCase', () => {
    it('rechaza a un actor sin capacidad de gestionar calendarios', async () => {
      const actualizar = jest.fn();
      const feriadoRepository = { actualizar } as unknown as FeriadoRepository;
      const useCase = new ActualizarFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        buildCalendarioRepository(),
        feriadoRepository,
      );

      await expect(
        useCase.execute(
          buildActor({
            capacidades: {
              gestionarCalendarios: false,
              gestionarTiposFeriado: false,
            },
          }),
          10,
          buildInput(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('rechaza actualizar un feriado si el calendario del mes destino aun no fue generado', async () => {
      const actualizar = jest.fn();
      const feriadoRepository = { actualizar } as unknown as FeriadoRepository;
      const existeMes = jest.fn().mockResolvedValue(false);
      const calendarioRepository = buildCalendarioRepository({
        existeMes,
      });
      const useCase = new ActualizarFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        calendarioRepository,
        feriadoRepository,
      );

      await expect(
        useCase.execute(buildActor(), 10, buildInput({ anio: 2027, mes: 3 })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(existeMes).toHaveBeenCalledWith(2027, 3);
      expect(actualizar).not.toHaveBeenCalled();
    });

    it('actualiza el feriado delegando al repositorio para un actor autorizado', async () => {
      const actualizar = jest
        .fn()
        .mockResolvedValue(buildFeriado({ nombre: 'Año Nuevo (actualizado)' }));
      const feriadoRepository = { actualizar } as unknown as FeriadoRepository;
      const useCase = new ActualizarFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        buildCalendarioRepository(),
        feriadoRepository,
      );

      const result = await useCase.execute(
        buildActor(),
        10,
        buildInput({ nombre: 'Año Nuevo (actualizado)' }),
      );

      expect(actualizar).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ nombre: 'Año Nuevo (actualizado)' }),
      );
      expect(result.nombre).toBe('Año Nuevo (actualizado)');
    });
  });

  describe('ListarFeriadosUseCase', () => {
    it('lista feriados sin exigir permisos especiales (solo lectura)', async () => {
      const listar = jest
        .fn()
        .mockResolvedValue([
          buildFeriado(),
          buildFeriado({ id: 11, nombre: 'Carnaval' }),
        ]);
      const feriadoRepository = { listar } as unknown as FeriadoRepository;
      const useCase = new ListarFeriadosUseCase(feriadoRepository);

      const result = await useCase.execute({ anio: 2026, mes: 1 });

      expect(listar).toHaveBeenCalledWith({ anio: 2026, mes: 1 });
      expect(result).toHaveLength(2);
    });
  });

  describe('DesactivarFeriadoUseCase', () => {
    it('rechaza a un actor sin capacidad de gestionar calendarios', async () => {
      const desactivar = jest.fn();
      const feriadoRepository = { desactivar } as unknown as FeriadoRepository;
      const useCase = new DesactivarFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        feriadoRepository,
      );

      await expect(
        useCase.execute(
          buildActor({
            capacidades: {
              gestionarCalendarios: false,
              gestionarTiposFeriado: false,
            },
          }),
          10,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(desactivar).not.toHaveBeenCalled();
    });

    it('desactiva el feriado para un actor autorizado', async () => {
      const desactivar = jest.fn().mockResolvedValue(undefined);
      const feriadoRepository = { desactivar } as unknown as FeriadoRepository;
      const useCase = new DesactivarFeriadoUseCase(
        new CalendarioAccessPolicyService(),
        feriadoRepository,
      );

      await useCase.execute(buildActor(), 10);

      expect(desactivar).toHaveBeenCalledWith(10);
    });
  });
});
