import { ConflictException } from '@nestjs/common';
import { PlanificacionHistorialRepository } from '../../domain/repositories/planificacion-historial.repository';
import { PlanificacionRepository } from '../../domain/repositories/planificacion.repository';
import { CerrarPlanificacionUseCase } from './cerrar-planificacion.use-case';

describe('CerrarPlanificacionUseCase', () => {
  it('should close an APROBADA planificacion', async () => {
    const cerrarYMaterializar = jest.fn().mockResolvedValue({
      id: 10,
      idServicio: 2,
      idDepartamento: 1,
      codigoDepartamento: 'ENF',
      nombreDepartamento: 'Enfermeria',
      codigoServicio: 'SRV-URG',
      nombreServicio: 'Urgencias',
      cantidadPersonalPlanificable: 5,
      anio: 2026,
      mes: 5,
      version: 1,
      estado: 'CERRADA',
      activo: true,
      fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
      fechaFin: new Date('2026-05-31T00:00:00.000Z'),
      fechaPublicacion: new Date('2026-05-01T10:00:00.000Z'),
      fechaCierre: new Date('2026-05-31T23:00:00.000Z'),
      createdAt: new Date('2026-04-30T00:00:00.000Z'),
      updatedAt: new Date('2026-05-31T23:00:00.000Z'),
    });

    const historialRepository: PlanificacionHistorialRepository = {
      existeHistorial: jest.fn().mockResolvedValue(false),
      listarIdsVencidasNoCerradas: jest.fn().mockResolvedValue([]),
      listarRegistrosHistorial: jest.fn().mockResolvedValue([]),
      listarObservacionesDiariasHistorial: jest.fn().mockResolvedValue([]),
      cerrarYMaterializar,
    };

    const repository: PlanificacionRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 10,
        idServicio: 2,
        idDepartamento: 1,
        codigoDepartamento: 'ENF',
        nombreDepartamento: 'Enfermeria',
        codigoServicio: 'SRV-URG',
        nombreServicio: 'Urgencias',
        cantidadPersonalPlanificable: 5,
        anio: 2026,
        mes: 5,
        version: 1,
        estado: 'APROBADA',
        activo: true,
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-05-31T00:00:00.000Z'),
        fechaPublicacion: new Date('2026-05-01T10:00:00.000Z'),
        fechaCierre: null,
        createdAt: new Date('2026-04-30T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      }),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn().mockResolvedValue(true),
      existePersonalActivoEnServicio: jest.fn(),
      existePersonalActivoEnDepartamento: jest.fn(),
      existePlanificacionActivaPeriodo: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      cambiarEstado: jest.fn(),
      eliminarLogico: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    };

    const useCase = new CerrarPlanificacionUseCase(
      repository,
      historialRepository,
    );

    await expect(
      useCase.execute(10, { idUsuarioCierre: 1 }),
    ).resolves.toMatchObject({
      id: 10,
      estado: 'CERRADA',
    });

    expect(cerrarYMaterializar).toHaveBeenCalledWith({
      idPlanificacion: 10,
      origenCierre: 'MANUAL',
      idUsuarioCierre: 1,
    });
  });

  it('should reject close for non-aprobada state', async () => {
    const repository: PlanificacionRepository = {
      listar: jest.fn(),
      obtenerPorId: jest.fn().mockResolvedValue({
        id: 10,
        idServicio: 2,
        idDepartamento: 1,
        codigoDepartamento: 'ENF',
        nombreDepartamento: 'Enfermeria',
        codigoServicio: 'SRV-URG',
        nombreServicio: 'Urgencias',
        cantidadPersonalPlanificable: 5,
        anio: 2026,
        mes: 5,
        version: 1,
        estado: 'BORRADOR',
        activo: true,
        fechaInicio: new Date('2026-05-01T00:00:00.000Z'),
        fechaFin: new Date('2026-05-31T00:00:00.000Z'),
        fechaPublicacion: null,
        fechaCierre: null,
        createdAt: new Date('2026-04-30T00:00:00.000Z'),
        updatedAt: new Date('2026-04-30T00:00:00.000Z'),
      }),
      obtenerNombreServicio: jest.fn(),
      obtenerNombreDepartamento: jest.fn(),
      existeUsuario: jest.fn().mockResolvedValue(true),
      existePersonalActivoEnServicio: jest.fn(),
      existePersonalActivoEnDepartamento: jest.fn(),
      existePlanificacionActivaPeriodo: jest.fn(),
      obtenerSiguienteVersion: jest.fn(),
      crearBorrador: jest.fn(),
      cambiarEstado: jest.fn(),
      eliminarLogico: jest.fn(),
      publicar: jest.fn(),
      cerrar: jest.fn(),
    };

    const historialRepository: PlanificacionHistorialRepository = {
      existeHistorial: jest.fn().mockResolvedValue(false),
      listarIdsVencidasNoCerradas: jest.fn().mockResolvedValue([]),
      listarRegistrosHistorial: jest.fn().mockResolvedValue([]),
      listarObservacionesDiariasHistorial: jest.fn().mockResolvedValue([]),
      cerrarYMaterializar: jest.fn(),
    };

    const useCase = new CerrarPlanificacionUseCase(
      repository,
      historialRepository,
    );

    await expect(
      useCase.execute(10, { idUsuarioCierre: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
