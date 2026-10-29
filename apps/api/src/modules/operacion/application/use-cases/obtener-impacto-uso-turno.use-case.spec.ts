import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { UsuarioSesionResponseDto } from '../../../seguridad/application/dto/usuario-sesion-response.dto';
import type { TurnoRepository } from '../../domain/repositories/turno.repository';
import type { Turno } from '../../domain/entities/turno';
import { OperacionAccessPolicyService } from './helpers/operacion-access-policy.service';
import { ObtenerImpactoUsoTurnoUseCase } from './obtener-impacto-uso-turno.use-case';

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
    idServicio: 10,
    codigoServicio: 'SRV-10',
    nombreServicio: 'Urgencias',
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

describe('ObtenerImpactoUsoTurnoUseCase', () => {
  function buildUseCase(turnoExistente: Turno | null) {
    const obtenerImpactoUso = jest
      .fn()
      .mockResolvedValue({ totalCeldas: 3, planificacionesAfectadas: 1 });
    const repositoryMock = {
      obtenerPorId: jest.fn().mockResolvedValue(turnoExistente),
      obtenerImpactoUso,
    } as unknown as TurnoRepository;
    return {
      useCase: new ObtenerImpactoUsoTurnoUseCase(
        repositoryMock,
        new OperacionAccessPolicyService(),
      ),
      obtenerImpactoUso,
    };
  }

  it('IDOR: rechaza ver el impacto de un turno de otro servicio fuera de alcance', async () => {
    const turnoAjeno = buildTurno({ id: 99, idServicio: 55 });
    const { useCase, obtenerImpactoUso } = buildUseCase(turnoAjeno);
    const actor = buildActor({});

    await expect(useCase.execute(actor, 99)).rejects.toThrow(
      ForbiddenException,
    );
    expect(obtenerImpactoUso).not.toHaveBeenCalled();
  });

  it('permite ver el impacto de un turno del propio servicio', async () => {
    const turnoPropio = buildTurno({ id: 99, idServicio: 10 });
    const { useCase } = buildUseCase(turnoPropio);
    const actor = buildActor({});

    await expect(useCase.execute(actor, 99)).resolves.toEqual({
      totalCeldas: 3,
      planificacionesAfectadas: 1,
    });
  });

  it('lanza NotFoundException cuando el turno no existe', async () => {
    const { useCase } = buildUseCase(null);
    const actor = buildActor({});

    await expect(useCase.execute(actor, 999)).rejects.toThrow(
      NotFoundException,
    );
  });
});
