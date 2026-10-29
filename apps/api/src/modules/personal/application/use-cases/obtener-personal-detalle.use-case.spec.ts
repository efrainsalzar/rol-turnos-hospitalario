import { NotFoundException } from '@nestjs/common';
import { PersonalRepository } from '../../domain/repositories/personal.repository';
import { ObtenerPersonalDetalleUseCase } from './obtener-personal-detalle.use-case';

describe('ObtenerPersonalDetalleUseCase', () => {
  it('should return detailed personal information', async () => {
    const repository: PersonalRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      listarVinculablesUsuario: jest.fn(),
      obtenerDetalle: jest.fn().mockResolvedValue({
        id: 1,
        codigoPersonal: 'NEU-002',
        nombres: 'Carla',
        apellidoPaterno: 'Flores',
        apellidoMaterno: 'Condori',
        documentoIdentidad: '5632107',
        nombreCompleto: 'Carla Flores Condori',
        activo: true,
        cargoActual: {
          id: 10,
          codigo: 'LIC-ENF',
          nombre: 'Lic. Enfermeria',
        },
        usuario: null,
        rolFuncionalActual: {
          id: 3,
          codigo: 'ASISTENCIAL',
          nombre: 'Asistencial',
          esJefatura: false,
        },
        servicioActual: {
          id: 2,
          codigo: 'NEURO',
          nombre: 'Neurocirugia',
        },
        departamentoActual: {
          id: 1,
          codigo: 'ENF',
          nombre: 'Enfermeria',
        },
        asignacionesVigentes: [],
        asignacionesHistoricas: [
          {
            id: 900,
            idAsignacionPersonal: 500,
            fechaEvento: new Date('2026-06-15T10:00:00Z'),
            tipoEvento: 'CIERRE',
            fechaInicioAsignacion: new Date('2026-01-01T00:00:00Z'),
            fechaFinAsignacion: new Date('2026-06-15T00:00:00Z'),
            servicioOrigen: { id: 2, codigo: 'NEURO', nombre: 'Neurocirugia' },
            // Un cierre no tiene destino (docs/database/decisiones-tecnicas.md
            // seccion 82) — antes quedaba duplicado con el origen.
            servicioDestino: { id: null, codigo: null, nombre: null },
            departamentoOrigen: { id: 1, codigo: 'ENF', nombre: 'Enfermeria' },
            departamentoDestino: { id: null, codigo: null, nombre: null },
            motivo: 'Cierre de prueba.',
            usuario: { id: 7, username: 'admin.sistema' },
          },
        ],
      }),
      obtenerAsignacionPorId: jest.fn(),
      listarAsignaciones: jest.fn(),
      crearPersonal: jest.fn(),
      actualizarPersonal: jest.fn(),
      activarPersonal: jest.fn(),
      desactivarPersonal: jest.fn(),

      listarNivelesCargo: jest.fn(),
      crearNivelCargo: jest.fn(),
      actualizarNivelCargo: jest.fn(),
      activarNivelCargo: jest.fn(),
      desactivarNivelCargo: jest.fn(),
      listarCargasHorarias: jest.fn(),
      crearCargaHoraria: jest.fn(),
      actualizarCargaHoraria: jest.fn(),
      activarCargaHoraria: jest.fn(),
      desactivarCargaHoraria: jest.fn(),
      listarTiposContrato: jest.fn(),
      listarRolesFuncionales: jest.fn(),
      obtenerRolFuncionalPorId: jest.fn(),
      existePlanificacionAbiertaParaAsignacion: jest.fn(),
      obtenerConflictoPlanificacionAbiertaParaAsignacion: jest.fn(),
    obtenerPlanificacionAprobadaPorUnidadYFecha: jest.fn(),
      crearAsignacion: jest.fn(),
      actualizarAsignacion: jest.fn(),
      moverAsignacion: jest.fn(),
      cerrarAsignacion: jest.fn(),
      obtenerJefaturaActivaEnUnidad: jest.fn(),
    };

    const useCase = new ObtenerPersonalDetalleUseCase(repository);

    await expect(useCase.execute(1)).resolves.toMatchObject({
      id: 1,
      codigoPersonal: 'NEU-002',
      servicioActual: {
        codigo: 'NEURO',
      },
      asignacionesHistoricas: [
        {
          tipoEvento: 'CIERRE',
          fechaInicioAsignacion: '2026-01-01T00:00:00.000Z',
          fechaFinAsignacion: '2026-06-15T00:00:00.000Z',
          servicioDestino: { id: null, codigo: null, nombre: null },
          departamentoDestino: { id: null, codigo: null, nombre: null },
        },
      ],
    });
  });

  it('should throw when personal is missing', async () => {
    const repository: PersonalRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn(),
      listarVinculablesUsuario: jest.fn(),
      obtenerDetalle: jest.fn().mockResolvedValue(null),
      obtenerAsignacionPorId: jest.fn(),
      listarAsignaciones: jest.fn(),
      crearPersonal: jest.fn(),
      actualizarPersonal: jest.fn(),
      activarPersonal: jest.fn(),
      desactivarPersonal: jest.fn(),

      listarNivelesCargo: jest.fn(),
      crearNivelCargo: jest.fn(),
      actualizarNivelCargo: jest.fn(),
      activarNivelCargo: jest.fn(),
      desactivarNivelCargo: jest.fn(),
      listarCargasHorarias: jest.fn(),
      crearCargaHoraria: jest.fn(),
      actualizarCargaHoraria: jest.fn(),
      activarCargaHoraria: jest.fn(),
      desactivarCargaHoraria: jest.fn(),
      listarTiposContrato: jest.fn(),
      listarRolesFuncionales: jest.fn(),
      obtenerRolFuncionalPorId: jest.fn(),
      existePlanificacionAbiertaParaAsignacion: jest.fn(),
      obtenerConflictoPlanificacionAbiertaParaAsignacion: jest.fn(),
    obtenerPlanificacionAprobadaPorUnidadYFecha: jest.fn(),
      crearAsignacion: jest.fn(),
      actualizarAsignacion: jest.fn(),
      moverAsignacion: jest.fn(),
      cerrarAsignacion: jest.fn(),
      obtenerJefaturaActivaEnUnidad: jest.fn(),
    };

    const useCase = new ObtenerPersonalDetalleUseCase(repository);

    await expect(useCase.execute(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
