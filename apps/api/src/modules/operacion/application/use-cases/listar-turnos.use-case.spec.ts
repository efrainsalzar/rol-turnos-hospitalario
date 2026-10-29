import { ListarTurnosQueryDto } from '../dto/listar-turnos-query.dto';
import { ListarTurnosUseCase } from './listar-turnos.use-case';

describe('ListarTurnosUseCase', () => {
  it('should map turno entities into response dto', async () => {
    const turno = {
      id: 1,
      idServicio: 2,
      codigoServicio: 'SRV-URG',
      nombreServicio: 'Urgencias',
      codigo: 'TUR-URG-N',
      nombre: 'Urgencias noche',
      tipoHorario: 'CONTINUO' as const,
      horaInicio: '20:00',
      horaFin: '08:00',
      cruzaMedianoche: true,
      duracionHoras: 12,
      tramos: [],
      vigenciaDesde: new Date('2026-01-01T00:00:00.000Z'),
      vigenciaHasta: null,
      activo: true,
    };

    const turnoRepository = {
      listar: jest.fn().mockResolvedValue([turno]),
      contar: jest.fn().mockResolvedValue(1),
      obtenerPorId: jest.fn(),
      crear: jest.fn(),
      actualizar: jest.fn(),
      activar: jest.fn(),
      desactivar: jest.fn(),
      obtenerImpactoUso: jest.fn(),
      propagarHorarioACeldas: jest.fn(),
      limpiarCeldasAsociadas: jest.fn(),
    };

    const useCase = new ListarTurnosUseCase(turnoRepository);
    const query = new ListarTurnosQueryDto();

    await expect(useCase.execute(query)).resolves.toEqual({
      data: [
        {
          id: 1,
          idServicio: 2,
          codigoServicio: 'SRV-URG',
          nombreServicio: 'Urgencias',
          codigo: 'TUR-URG-N',
          nombre: 'Urgencias noche',
          tipoHorario: 'CONTINUO',
          horaInicio: '20:00',
          horaFin: '08:00',
          cruzaMedianoche: true,
          duracionHoras: 12,
          tramos: [],
          vigenciaDesde: '2026-01-01T00:00:00.000Z',
          vigenciaHasta: null,
          activo: true,
        },
      ],
      meta: {
        total: 1,
      },
    });
  });
});
