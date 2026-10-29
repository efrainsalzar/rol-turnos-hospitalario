import { CalendarioRepository } from '../../domain/repositories/calendario.repository';
import { ListarCalendariosUseCase } from './listar-calendarios.use-case';

describe('ListarCalendariosUseCase', () => {
  it('should list calendarios and map dates to iso strings', async () => {
    const listar = jest.fn().mockResolvedValue([
      {
        id: 1,
        fecha: new Date('2026-05-01T00:00:00.000Z'),
        anio: 2026,
        mes: 5,
        diaMes: 1,
        diaSemanaNum: 5,
        diaSemanaNombre: 'Viernes',
        semanaMes: 1,
        esFinSemana: false,
        esFeriado: false,
        codigoFeriado: null,
        nombreFeriado: null,
      },
    ]);

    const asegurarAnio = jest.fn();
    const asegurarMes = jest.fn();
    const calendarioRepository: CalendarioRepository = {
      listar,
      obtenerPorId: jest.fn(),
      existeMes: jest.fn(),
      asegurarAnio,
      asegurarMes,
    };

    const useCase = new ListarCalendariosUseCase(calendarioRepository);

    await expect(useCase.execute({ anio: 2026, mes: 5 })).resolves.toEqual([
      {
        id: 1,
        fecha: '2026-05-01T00:00:00.000Z',
        anio: 2026,
        mes: 5,
        diaMes: 1,
        diaSemanaNum: 5,
        diaSemanaNombre: 'Viernes',
        semanaMes: 1,
        esFinSemana: false,
        esFeriado: false,
        codigoFeriado: null,
        nombreFeriado: null,
      },
    ]);

    expect(listar).toHaveBeenCalledWith({
      anio: 2026,
      mes: 5,
    });
    expect(asegurarMes).not.toHaveBeenCalled();
    expect(asegurarAnio).not.toHaveBeenCalled();
  });
});
