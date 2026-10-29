import { BadRequestException } from '@nestjs/common';
import { ConfiguracionOperativaServicioRepository } from '../../../domain/repositories/configuracion-operativa-servicio.repository';

interface InputCodigoOperativo {
  idCodigoOperativoServicio?: number;
  idTurno?: number | null;
  idIncidenciaPersonal?: number | null;
  horasProgramadas?: number;
}

export interface CodigoOperativoResuelto {
  idTurno: number | null;
  idIncidenciaPersonal: number | null;
  alcanceIncidenciaPersonal: 'GENERAL' | 'PERSONAL' | 'OTRO' | null;
  horasProgramadas: number;
}

export async function resolverCodigoOperativoPlanificacion(
  repository: ConfiguracionOperativaServicioRepository,
  idPlanificacion: number,
  input: InputCodigoOperativo,
): Promise<CodigoOperativoResuelto> {
  if (input.idCodigoOperativoServicio) {
    const codigo = await repository.resolverCodigoOperativoEnPlanificacion(
      idPlanificacion,
      input.idCodigoOperativoServicio,
    );

    if (!codigo) {
      throw new BadRequestException(
        'El codigo seleccionado ya no forma parte de la configuracion operativa de esta planificacion. Actualiza la pantalla e intenta de nuevo.',
      );
    }

    if (
      codigo.idIncidenciaPersonal &&
      codigo.alcanceIncidenciaPersonal === 'GENERAL'
    ) {
      throw new BadRequestException(
        `"${codigo.etiqueta}" es un dia general del calendario y no se asigna a una persona en la matriz.`,
      );
    }

    return {
      idTurno: codigo.idTurno,
      idIncidenciaPersonal: codigo.idIncidenciaPersonal,
      alcanceIncidenciaPersonal: codigo.alcanceIncidenciaPersonal,
      horasProgramadas: codigo.horasEquivalentes,
    };
  }

  if (
    (input.idTurno && input.idIncidenciaPersonal) ||
    (!input.idTurno && !input.idIncidenciaPersonal)
  ) {
    throw new BadRequestException(
      'Indica un horario o una incidencia de personal (solo uno de los dos).',
    );
  }

  if (input.horasProgramadas === undefined) {
    throw new BadRequestException(
      'Indica las horas programadas cuando no usas un codigo de la configuracion operativa.',
    );
  }

  return {
    idTurno: input.idTurno ?? null,
    idIncidenciaPersonal: input.idIncidenciaPersonal ?? null,
    alcanceIncidenciaPersonal: null,
    horasProgramadas: input.horasProgramadas,
  };
}
