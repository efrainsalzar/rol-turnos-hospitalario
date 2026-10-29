import { ListarIncidenciasPersonalesUseCase } from './listar-incidencias-personales.use-case';

describe('ListarIncidenciasPersonalesUseCase', () => {
  it('should map tipo dia entities into response dto', async () => {
    const incidenciaPersonalRepository = {
      listar: jest.fn().mockResolvedValue([
        {
          id: 1,
          codigo: 'DESCANSO',
          nombre: 'Descanso',
          descripcion: 'Dia no laborable',
          esLaborable: false,
          generaHorasTrabajadas: false,
          computaParaMetaHoras: false,
          requiereRespaldo: false,
          activo: true,
        },
      ]),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      desactivar: jest.fn(),
      obtenerImpactoUso: jest.fn(),
      limpiarCeldasAsociadas: jest.fn(),
    };

    const useCase = new ListarIncidenciasPersonalesUseCase(
      incidenciaPersonalRepository,
    );

    await expect(useCase.execute()).resolves.toEqual([
      {
        id: 1,
        codigo: 'DESCANSO',
        nombre: 'Descanso',
        descripcion: 'Dia no laborable',
        esLaborable: false,
        generaHorasTrabajadas: false,
        computaParaMetaHoras: false,
        requiereRespaldo: false,
        activo: true,
      },
    ]);
  });
});
