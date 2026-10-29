import { ForbiddenException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { TurnoRepository } from '../../domain/repositories/turno.repository';
import type { Turno } from '../../domain/entities/turno';
import type { GuardarTurnoDto } from '../dto/guardar-turno.dto';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';
import { ActualizarTurnoUseCase } from './actualizar-turno.use-case';

function buildActor(
  overrides: Partial<UsuarioSesionResponseDto>,
): UsuarioSesionResponseDto {
  return {
    id: 1,
    username: 'jefe.servicio.urgencias',
    tipoUsuario: 'ADMINISTRATIVO',
    proveedorAutenticacion: 'LOCAL',
    sujetoAutenticacion: 'jefe.servicio.urgencias',
    identidadLocalHabilitada: true,
    activo: true,
    rolSeguridad: {
      id: 2,
      codigo: 'JEFE_SERVICIO',
      nombre: 'Jefe de servicio',
    },
    personal: { id: null, codigoPersonal: null, nombreCompleto: null },
    alcancePlanificacion: 'SERVICIO',
    puedeGestionarPlanificacion: false,
    puedeGestionarTodo: false,
    permisos: {
      puedeVerOrganizacion: true,
      puedeVerPersonal: true,
      puedeGestionarPersonal: false,
      puedeVerAsignaciones: true,
      puedeGestionarAsignaciones: false,
      puedeVerSeguridad: false,
      puedeGestionarUsuarios: false,
      puedeVerOperacion: true,
      puedeVerPlanificacion: true,
      puedeEditarPlanificacion: true,
      puedeAprobarPlanificacion: false,
    },
    departamentosGestionables: [],
    serviciosGestionables: [{ id: 10, idDepartamento: 5 }],
    ...overrides,
  } as UsuarioSesionResponseDto;
}

function buildTurno(overrides: Partial<Turno>): Turno {
  return {
    id: 99,
    idServicio: 55,
    codigoServicio: 'SRV-55',
    nombreServicio: 'Servicio ajeno',
    idDepartamento: null,
    codigoDepartamento: null,
    nombreDepartamento: null,
    codigo: 'M',
    nombre: 'Manana',
    codigoVisual: null,
    etiquetaVisual: null,
    tipoHorario: 'CONTINUO',
    horaInicio: '06:00',
    horaFin: '14:00',
    cruzaMedianoche: false,
    duracionHoras: 8,
    tramos: [],
    vigenciaDesde: new Date('2026-01-01'),
    vigenciaHasta: null,
    activo: true,
    ...overrides,
  };
}

const inputMock: GuardarTurnoDto = {
  idServicio: 10,
  codigo: 'M',
  nombre: 'Manana',
  tipoHorario: 'CONTINUO',
  horaInicio: '06:00',
  horaFin: '14:00',
  vigenciaDesde: '2026-01-01',
};

describe('ActualizarTurnoUseCase', () => {
  function buildUseCase(turnoExistente: Turno | null) {
    const repositoryMock = {
      obtenerPorId: jest.fn().mockResolvedValue(turnoExistente),
      actualizar: jest
        .fn()
        .mockResolvedValue(buildTurno({ id: 99, idServicio: 10 })),
      obtenerImpactoUso: jest
        .fn()
        .mockResolvedValue({ totalCeldas: 0, planificacionesAfectadas: 0 }),
    } as unknown as TurnoRepository;
    return {
      useCase: new ActualizarTurnoUseCase(
        repositoryMock,
        new OperacionAccessPolicyService(),
      ),
      repositoryMock,
    };
  }

  it('REGRESION: rechaza actualizar un turno de OTRO servicio, aunque el body declare un idServicio propio', async () => {
    // El turno id=99 pertenece al servicio 55 (fuera del alcance del actor).
    // Antes del fix, solo se validaba el idServicio del BODY (10, propio del
    // actor), por lo que este ataque pasaba la validacion y sobreescribia un
    // turno ajeno.
    const turnoAjeno = buildTurno({ id: 99, idServicio: 55 });
    const { useCase } = buildUseCase(turnoAjeno);
    const actor = buildActor({});

    await expect(useCase.execute(actor, 99, inputMock)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('permite actualizar un turno del propio servicio', async () => {
    const turnoPropio = buildTurno({ id: 99, idServicio: 10 });
    const { useCase } = buildUseCase(turnoPropio);
    const actor = buildActor({});

    await expect(useCase.execute(actor, 99, inputMock)).resolves.toBeDefined();
  });
});
