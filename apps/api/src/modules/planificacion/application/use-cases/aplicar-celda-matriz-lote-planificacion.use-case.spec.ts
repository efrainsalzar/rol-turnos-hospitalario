import { NotFoundException } from '@nestjs/common';
import { AplicarCeldaMatrizLotePlanificacionUseCase } from './aplicar-celda-matriz-lote-planificacion.use-case';
import { AplicarCeldaMatrizPlanificacionUseCase } from './aplicar-celda-matriz-planificacion.use-case';
import { AplicarCeldaMatrizPlanificacionDto } from '../dto/aplicar-celda-matriz-planificacion.dto';
import { CeldaMatrizPersistida } from '../../domain/repositories/rol-turno.repository';

describe('AplicarCeldaMatrizLotePlanificacionUseCase', () => {
  const planificacionBorrador = {
    id: 10,
    idServicio: 2,
    estado: 'BORRADOR' as const,
  };

  function buildCelda(
    idCalendario: number,
  ): AplicarCeldaMatrizPlanificacionDto {
    const celda = new AplicarCeldaMatrizPlanificacionDto();
    celda.idAsignacionPersonal = 100;
    celda.idCalendario = idCalendario;
    celda.idTurno = 5;
    return celda;
  }

  function buildCeldaPersistida(idCalendario: number): CeldaMatrizPersistida {
    return {
      idRolTurno: idCalendario,
      secuenciaDia: 1,
      idTurno: 5,
      codigoTurno: null,
      nombreTurno: null,
      horaInicio: null,
      horaFin: null,
      cruzaMedianoche: null,
      idIncidenciaPersonal: null,
      codigoIncidenciaPersonal: null,
      nombreIncidenciaPersonal: null,
      horasProgramadas: 8,
    };
  }

  it('resuelve la planificacion editable una sola vez y aplica cada celda del lote en orden', async () => {
    const prepararPlanificacionEditable = jest
      .fn()
      .mockResolvedValue(planificacionBorrador);
    const aplicarCelda = jest
      .fn()
      .mockImplementation(
        (_planificacion, celda: AplicarCeldaMatrizPlanificacionDto) =>
          Promise.resolve(buildCeldaPersistida(celda.idCalendario)),
      );
    const aplicarCeldaUseCase = {
      prepararPlanificacionEditable,
      aplicarCelda,
    } as unknown as AplicarCeldaMatrizPlanificacionUseCase;
    const useCase = new AplicarCeldaMatrizLotePlanificacionUseCase(
      aplicarCeldaUseCase,
    );
    const celdas = [buildCelda(501), buildCelda(502), buildCelda(503)];

    const resultado = await useCase.execute(10, celdas, 1);

    expect(prepararPlanificacionEditable).toHaveBeenCalledTimes(1);
    expect(prepararPlanificacionEditable).toHaveBeenCalledWith(10, 1);
    expect(aplicarCelda).toHaveBeenCalledTimes(3);
    expect(resultado).toHaveLength(3);
    expect(resultado.map((celda) => celda.idRolTurno)).toEqual([501, 502, 503]);
  });

  it('propaga el error si la planificacion no existe o no es editable, sin aplicar ninguna celda', async () => {
    const prepararPlanificacionEditable = jest
      .fn()
      .mockRejectedValue(
        new NotFoundException('No se encontro la planificacion con id 999.'),
      );
    const aplicarCelda = jest.fn();
    const aplicarCeldaUseCase = {
      prepararPlanificacionEditable,
      aplicarCelda,
    } as unknown as AplicarCeldaMatrizPlanificacionUseCase;
    const useCase = new AplicarCeldaMatrizLotePlanificacionUseCase(
      aplicarCeldaUseCase,
    );

    await expect(
      useCase.execute(999, [buildCelda(501)], 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aplicarCelda).not.toHaveBeenCalled();
  });

  it('detiene el lote en la primera celda invalida sin seguir aplicando las siguientes', async () => {
    const prepararPlanificacionEditable = jest
      .fn()
      .mockResolvedValue(planificacionBorrador);
    const aplicarCelda = jest
      .fn()
      .mockResolvedValueOnce(buildCeldaPersistida(501))
      .mockRejectedValueOnce(
        new NotFoundException('No se encontro el turno con id 5.'),
      );
    const aplicarCeldaUseCase = {
      prepararPlanificacionEditable,
      aplicarCelda,
    } as unknown as AplicarCeldaMatrizPlanificacionUseCase;
    const useCase = new AplicarCeldaMatrizLotePlanificacionUseCase(
      aplicarCeldaUseCase,
    );

    await expect(
      useCase.execute(10, [buildCelda(501), buildCelda(502)], 1),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aplicarCelda).toHaveBeenCalledTimes(2);
  });
});
